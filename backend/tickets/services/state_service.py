from django.utils import timezone
from django.db import transaction
import logging

from tickets.models import Ticket, TicketHistory
from tickets.services.notification_service import NotificationService
from tickets.services.agent_availability_service import AgentAvailabilityService

logger = logging.getLogger(__name__)

class StateService:
    """
    Servicio para manejar cambios de estado de tickets
    """
    
    @staticmethod
    def cambiar_estado(ticket, nuevo_estado, usuario):
        """
        Cambiar estado de un ticket con validaciones
        """
        try:
            # Validar estado
            if nuevo_estado not in dict(Ticket.ESTADO_CHOICES):
                return {"error": "Estado inválido"}

            # Validar permisos (solo el agente asignado puede cambiar estado)
            if ticket.agente != usuario and (not usuario.rol or usuario.rol.tipo_base != 'admin'):
                return {"error": "No tienes permisos para cambiar el estado de este ticket"}

            with transaction.atomic():
                estado_anterior = ticket.estado
                ticket.estado = nuevo_estado
                
                # Si se cierra el ticket, registrar fecha de cierre
                if nuevo_estado == 'Resuelto':
                    ticket.fecha_cierre = timezone.now()
                
                ticket.save()

                # Registrar historial
                TicketHistory.objects.create(
                    ticket=ticket,
                    usuario=usuario,
                    accion="Cambio de Estado",
                    descripcion=f"Estado cambiado de '{estado_anterior}' a '{nuevo_estado}'"
                )

                # Notificar cambio de estado
                NotificationService.notificar_cambio_estado(
                    ticket, estado_anterior, nuevo_estado, usuario
                )

                # Notificar cierre si aplica
                if nuevo_estado == 'Resuelto':
                    NotificationService.notificar_ticket_cerrado(ticket, usuario)

                return {
                    "success": True,
                    "mensaje": f"Estado actualizado a '{nuevo_estado}'",
                    "estado_anterior": estado_anterior,
                    "estado_nuevo": nuevo_estado
                }
                
        except Exception as e:
            logger.error(f"❌ Error cambiando estado: {e}")
            return {"error": "Error interno al cambiar el estado"}

    @staticmethod
    def cerrar_ticket(ticket, usuario, comentario="", rating=None):
        """
        Cerrar un ticket con comentario y rating
        """
        try:
            with transaction.atomic():
                estado_anterior = ticket.estado
                ticket.cerrar_ticket(comentario, rating)

                # Registrar historial
                descripcion = f"Ticket cerrado. Comentario: {comentario}" if comentario else "Ticket cerrado"
                if rating:
                    descripcion += f" - Rating: {rating}/5"
                    
                TicketHistory.objects.create(
                    ticket=ticket,
                    usuario=usuario,
                    accion="Cierre de Ticket",
                    descripcion=descripcion
                )

                # Notificar cierre
                NotificationService.notificar_ticket_cerrado(ticket, usuario)

                # después de cerrar un ticket…
                tickets_pendientes = Ticket.objects.filter(
                    estado="Pendiente",
                    categoria_principal=ticket.categoria_principal
                ).order_by("fecha_creacion")

                if tickets_pendientes.exists():
                    ticket_pendiente = tickets_pendientes.first()

                    agente_disponible = AgentAvailabilityService.obtener_agente_disponible(
                        ticket_pendiente.categoria_principal
                    )

                    if agente_disponible:
                        ticket_pendiente.agente = agente_disponible
                        ticket_pendiente.estado = "Abierto"
                        ticket_pendiente.save(update_fields=['agente', 'estado'])

                        TicketHistory.objects.create(
                            ticket=ticket_pendiente,
                            usuario=usuario, # Se registra que el sistema lo hizo a causa de este usuario
                            accion="Asignación automática retrasada",
                            descripcion=f"Asignado automáticamente a {agente_disponible.username} cuando quedó disponible"
                        )

                return {
                    "success": True,
                    "mensaje": "Ticket cerrado correctamente",
                    "rating": rating,
                    "comentario": comentario
                }
                
        except Exception as e:
            logger.error(f"❌ Error cerrando ticket: {e}")
            return {"error": "Error interno al cerrar el ticket"}

    @staticmethod
    def reabrir_ticket(ticket, usuario):
        """
        Reabrir un ticket cerrado
        """
        try:
            with transaction.atomic():
                if ticket.estado != 'Resuelto':
                    return {"error": "Solo se pueden reabrir tickets resueltos"}

                ticket.reabrir_ticket()

                # Registrar historial
                TicketHistory.objects.create(
                    ticket=ticket,
                    usuario=usuario,
                    accion="Reapertura de Ticket",
                    descripcion="Ticket reabierto por el usuario"
                )

                # Notificar reapertura
                NotificationService.enviar_notificacion_websocket(
                    titulo="🔄 Ticket Reabierto",
                    mensaje=f"El ticket #{ticket.id} ha sido reabierto",
                    tipo="ticket_reabierto",
                    usuario_especifico=ticket.agente,
                    ticket_id=ticket.id
                )

                return {
                    "success": True,
                    "mensaje": "Ticket reabierto correctamente"
                }
                
        except Exception as e:
            logger.error(f"❌ Error reabriendo ticket: {e}")
            return {"error": "Error interno al reabrir el ticket"}