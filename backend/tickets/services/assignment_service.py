from django.utils import timezone
from django.db import transaction
from django.db.models import Count, Q
from datetime import time
from tickets.models import Ticket, TicketAssignment, TicketHistory, CategoriaPrincipal
from users.models import User
from tickets.services.notification_service import NotificationService
import logging

logger = logging.getLogger(__name__)


class AssignmentService:
    """
    Servicio de asignación automática y reasignación con reglas avanzadas.
    """

    HORA_LIMITE = time(15, 0, 0)  # 3:00 PM

    @staticmethod
    def horario_valido():
        ahora = timezone.localtime().time()
        return ahora <= AssignmentService.HORA_LIMITE

    @staticmethod
    def asignar_agente_inicial(ticket):
        """
        Intenta asignar un agente según la categoría del ticket.
        Si no hay agente disponible → ticket queda 'pendiente_asignacion'.
        """

        categoria = ticket.categoria_principal

        if not categoria or not categoria.tipo_agente:
            logger.warning(f"No hay agente por defecto configurado para la categoría {categoria}")
            ticket.estado = "pendiente_asignacion"
            ticket.save()
            return {"pendiente": True, "motivo": "sin_agente_por_defecto"}

        # Obtener rol esperado del agente
        rol_categoria = categoria.tipo_agente

        # Buscar agentes del mismo rol
        agentes = User.objects.filter(rol=rol_categoria, is_active=True)

        if not agentes.exists():
            ticket.estado = "pendiente_asignacion"
            ticket.save()
            return {"pendiente": True, "motivo": "sin_agentes_en_rol"}

        # Reglas de horario
        if not AssignmentService.horario_valido():
            ticket.estado = "pendiente_asignacion"
            ticket.save()
            return {"pendiente": True, "motivo": "fuera_de_horario"}

        # Optimización: Usar annotate para contar tickets activos por agente en una sola consulta
        agentes_con_carga = agentes.annotate(
            carga=Count('ticket', filter=Q(ticket__estado__in=["Abierto", "En Proceso"]))
        )
        
        # Filtrar por agentes con menos de 5 tickets y ordenar por carga ascendente
        agente_disponible = agentes_con_carga.filter(carga__lt=5).order_by('carga').first()
        
        if not agente_disponible:
            ticket.estado = "pendiente_asignacion"
            ticket.save()
            return {"pendiente": True, "motivo": "carga_completa"}
        
        agente_seleccionado = agente_disponible
        
        # Asignar ticket
        AssignmentService._asignar(ticket, agente_seleccionado)

        return {"pendiente": False, "asignado_a": agente_seleccionado.username}

    @staticmethod
    def _asignar(ticket, agente):
        """Asigna el ticket y registra historial/notificaciones."""

        with transaction.atomic():
            ticket.agente = agente
            # 🎯 NO cambiar a "En Proceso" inmediatamente.
            # Dejarlo como "Abierto" para permitir la ventana de edición de 5 minutos.
            # ticket.estado = "En Proceso" 
            ticket.save()

            TicketHistory.objects.create(
                ticket=ticket,
                usuario=ticket.solicitante,
                accion="Asignación Automática",
                descripcion=f"Asignado a {agente.username}"
            )

            NotificationService.notificar_ticket_asignado(ticket)

    @staticmethod
    def asignar_ticket_de_agente(ticket, agente_destino):
        """
        Lógica de asignación cuando un agente crea un ticket y elige a qué agente enviarlo.
        """
        try:
            # Calcular carga del agente
            carga = Ticket.objects.filter(
                agente=agente_destino,
                estado__in=["Abierto", "En Proceso"]
            ).count()
    
            # Si tiene menos de 5 → asignar directamente
            if carga < 5:
                AssignmentService._asignar(ticket, agente_destino)
                return {"asignado": True, "agente": agente_destino.username}
    
            # Si está lleno → dejar en espera
            ticket.estado = "pendiente_asignacion"
            ticket.save()
    
            TicketHistory.objects.create(
                ticket=ticket,
                usuario=ticket.solicitante,
                accion="Pendiente de Asignación",
                descripcion=f"El agente {agente_destino.username} está ocupado. Ticket en espera."
            )
    
            return {"asignado": False, "pendiente": True}
            
        except Exception as e:
            logger.error(f"Error en asignar_ticket_de_agente: {e}")
            # En caso de error, dejar el ticket como pendiente
            ticket.estado = "pendiente_asignacion"
            ticket.save()
            return {"asignado": False, "error": str(e)}

    # ============================
    #  PROCESAR TICKETS PENDIENTES
    # ============================
    @staticmethod
    def procesar_tickets_pendientes():
        """
        Asigna automáticamente todos los tickets en estado pendiente.
        Solo se usa en la tarea de Celery.
        """

        pendientes = Ticket.objects.filter(estado="pendiente_asignacion")

        resultados = []

        for ticket in pendientes:
            resultado = AssignmentService.asignar_agente_inicial(ticket)

            resultados.append({
                "ticket": ticket.id,
                "resultado": resultado
            })

        return resultados

    #  REASIGNACIÓN PENDIENTE (NO TOCAR)
    
    @staticmethod
    def obtener_asignaciones_pendientes(user):
        """
        Obtiene todas las solicitudes de reasignación pendientes para un usuario.
        """
        return TicketAssignment.objects.filter(
            agente_destino=user,
            estado='pendiente'
        ).select_related('ticket', 'agente_origen').order_by('-fecha_envio')


    @staticmethod
    def reasignar_ticket(ticket, agente_origen, agente_destino, tiempo_aceptacion=300):
        """
        Reasignación manual entre agentes. Ahora recibe el objeto User de agente_destino.
        """
        try:
            if agente_destino == agente_origen:
                return {"error": "No puedes reasignar el ticket a ti mismo"}

            if ticket.agente != agente_origen:
                return {"error": "No eres el agente asignado"}

            with transaction.atomic():
                asignacion = TicketAssignment.objects.create(
                    ticket=ticket,
                    agente_origen=agente_origen,
                    agente_destino=agente_destino,
                    estado='pendiente',
                    fecha_limite_aceptacion=timezone.now() + timezone.timedelta(seconds=tiempo_aceptacion)
                )

                TicketHistory.objects.create(
                    ticket=ticket,
                    usuario=agente_origen,
                    accion="Reasignación Pendiente",
                    descripcion=f"Ticket enviado a {agente_destino.username}"
                )

                NotificationService.notificar_reasignacion_pendiente(
                    ticket, agente_origen, agente_destino, tiempo_aceptacion
                )

                return {"success": True}

        except Exception as e:
            logger.error(f"Error reasignando: {e}")
            return {"error": "Error interno"}

    @staticmethod
    def aceptar_reasignacion(ticket, user):
        """
        El usuario (user) acepta una reasignación para el ticket.
        """
        try:
            # Encontrar la asignación pendiente para este ticket y este usuario
            asignacion = TicketAssignment.objects.get(
                ticket=ticket,
                agente_destino=user,
                estado='pendiente'
            )

            # Verificar si la asignación ha expirado
            if asignacion.ha_expirado():
                asignacion.estado = 'expirada'
                asignacion.save()
                return {"error": "La solicitud de reasignación ha expirado."}

            with transaction.atomic():
                # 1. Actualizar la asignación
                asignacion.estado = 'aceptada'
                asignacion.save()

                # 2. Actualizar el ticket
                agente_anterior = ticket.agente
                ticket.agente = user
                ticket.save()

                # 3. Registrar en el historial
                TicketHistory.objects.create(
                    ticket=ticket,
                    usuario=user,
                    accion="Reasignación Aceptada",
                    descripcion=f"Ticket aceptado. Agente anterior: {agente_anterior.username if agente_anterior else 'N/A'}."
                )

                # 4. Notificar (opcional, si tienes este servicio)
                # NotificationService.notificar_reasignacion_aceptada(ticket, agente_anterior, user)

            # 🎯 RECARGAR Y DEVOLVER EL TICKET ACTUALIZADO
            ticket.refresh_from_db()
            from tickets.serializers import TicketSerializer
            serializer = TicketSerializer(ticket)

            return {"success": True, 
                    "message": "Ticket aceptado y asignado a tu bandeja.",
                    "ticket": serializer.data}

        except TicketAssignment.DoesNotExist:
            return {"error": "No tienes una reasignación pendiente para este ticket."}
        except Exception as e:
            logger.error(f"Error al aceptar reasignación: {e}")
            return {"error": "Error interno al procesar la aceptación."}

    @staticmethod
    def rechazar_reasignacion(ticket, user):
        """
        El usuario (user) rechaza una reasignación para el ticket.
        """
        try:
            # Encontrar la asignación pendiente para este ticket y este usuario
            asignacion = TicketAssignment.objects.get(
                ticket=ticket,
                agente_destino=user,
                estado='pendiente'
            )

            with transaction.atomic():
                # 1. Actualizar la asignación
                asignacion.estado = 'rechazada'
                asignacion.save()

                # 2. Registrar en el historial
                TicketHistory.objects.create(
                    ticket=ticket,
                    usuario=user,
                    accion="Reasignación Rechazada",
                    descripcion=f"Se rechazó la reasignación del ticket desde {asignacion.agente_origen.username}."
                )

                # 3. Notificar al agente original que su solicitud fue rechazada
                # NotificationService.notificar_reasignacion_rechazada(ticket, asignacion.agente_origen, user)

            return {"success": True, "message": "La reasignación ha sido rechazada."}

        except TicketAssignment.DoesNotExist:
            return {"error": "No tienes una reasignación pendiente para este ticket."}
        except Exception as e:
            logger.error(f"Error al rechazar reasignación: {e}")
            return {"error": "Error interno al procesar el rechazo."}
