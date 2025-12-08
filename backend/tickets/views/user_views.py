from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db.models import Q
from django.utils import timezone

from tickets.models import Ticket, TicketHistory
from tickets.serializers import (   
    TicketSerializer,
    TicketCreateSerializer,
    TicketDetailSerializer
)
from tickets.permissions import IsSolicitante, IsTicketOwner
from tickets.services.notification_service import NotificationService
from tickets.services.agent_availability_service import AgentAvailabilityService
from users.models import User


class UserTicketViewSet(viewsets.ModelViewSet):
    """
    Vista para Solicitantes - Permite a los usuarios con rol de Solicitante gestionar sus propios tickets.
    """
    serializer_class = TicketSerializer
    permission_classes = [IsSolicitante, IsTicketOwner]

    # -------------------------------------------
    # Serializers dinámicos
    # -------------------------------------------
    def get_serializer_class(self):
        if self.action == 'create':
            return TicketCreateSerializer
        elif self.action == 'retrieve':
            return TicketDetailSerializer
        return TicketSerializer

    # -------------------------------------------
    # Queryset del usuario autenticado
    # -------------------------------------------
    def get_queryset(self):
        return Ticket.objects.filter(
            solicitante=self.request.user
        ).order_by('-fecha_creacion')

    # -------------------------------------------
    # Crear ticket
    # -------------------------------------------
    def perform_create(self, serializer):
        # 1) Validar horario
        hora_actual = timezone.localtime().time()
        if hora_actual.hour >= 15:
            raise ValidationError("❌ No se reciben tickets después de las 3 PM.")

        # 2) Crear ticket
        ticket = serializer.save()

        categoria = ticket.categoria_principal

        # 3) Buscar agente disponible para esa categoría
        agente_disponible = AgentAvailabilityService.obtener_agente_disponible(categoria)

        if agente_disponible:
            # Asignar automáticamente
            ticket.agente = agente_disponible
            ticket.save(update_fields=['agente'])

            # Historial
            TicketHistory.objects.create(
                ticket=ticket,
                usuario=self.request.user,
                accion="Asignación inteligente",
                descripcion=f"Asignado automáticamente al agente {agente_disponible.username}"
            )
            
            # 🎯 SOLUCIÓN: Notificar solo al agente asignado.
            NotificationService.notificar_ticket_asignado(ticket)
        else:
            # 4) Ningún agente tiene espacio (todos ≥5 tickets)
            # Ticket queda pendiente de asignación
            ticket.estado = "Pendiente"
            ticket.save(update_fields=['estado'])

            # Historial
            TicketHistory.objects.create(
                ticket=ticket,
                usuario=self.request.user,
                accion="Sin agentes disponibles",
                descripcion="Todos los agentes están ocupados. El ticket queda en espera de asignación."
            )

        # 5) Notificar creación solo a los administradores (ya no a todos los agentes)
        # La notificación al agente específico se hace arriba si se asigna uno.
        NotificationService.notificar_ticket_creado(ticket) 

    # -------------------------------------------
    # Actualizar ticket (solo dentro de tiempo permitido)
    # -------------------------------------------
    def perform_update(self, serializer):
        ticket = self.get_object()

        if not ticket.puede_editar:
            raise ValidationError("⛔ El tiempo de edición ha expirado.")

        # Si el ticket ya está en proceso, no debe cambiar categoría ni título
        if ticket.estado != "Abierto":
            incoming = serializer.validated_data
            bloqueados = ["titulo", "categoria_principal", "subcategoria"]

            for campo in bloqueados:
                if campo in incoming:
                    raise ValidationError(
                        f"⛔ No puedes modificar '{campo}' porque el ticket ya está en proceso."
                    )

        serializer.save()

        # Notificar al agente que el ticket ha sido actualizado
        NotificationService.notificar_ticket_actualizado(ticket, self.request.user)

    # -------------------------------------------
    # Eliminar ticket dentro del tiempo permitido
    # -------------------------------------------
    def perform_destroy(self, ticket):
        if not ticket.puede_eliminar:
            raise ValidationError("⛔ No puedes eliminar este ticket, el tiempo expiró.")
        
        # 🎯 Notificar al agente ANTES de eliminar el ticket
        if ticket.agente:
            # ✅ CORRECCIÓN: Usar el servicio para crear la notificación en la BD primero.
            notification = NotificationService.crear_notificacion_bd(
                usuario=ticket.agente,
                mensaje=f"El ticket #{ticket.id} fue eliminado por el solicitante.",
                tipo="ticket_eliminado",
                ticket_id=ticket.id
            )
            if notification:
                # Luego, enviar la notificación creada por WebSocket.
                NotificationService.enviar_notificacion_websocket(notification)
            
        ticket.delete()

    # -------------------------------------------
    # Calificación de ticket resuelto
    # -------------------------------------------
    @action(detail=True, methods=['post'])
    def calificar(self, request, pk=None):
        ticket = self.get_object()

        if ticket.estado != 'Resuelto':
            raise ValidationError("⛔ Solo puedes calificar tickets resueltos.")

        rating = request.data.get('rating')

        try:
            rating = int(rating)
        except:
            raise ValidationError("⛔ El rating debe ser un número entero entre 1 y 5.")

        if not (1 <= rating <= 5):
            raise ValidationError("⛔ El rating debe estar entre 1 y 5.")

        ticket.rating = rating
        ticket.save()

        # Registrar historial
        TicketHistory.objects.create(
            ticket=ticket,
            usuario=request.user,
            accion="Calificación",
            descripcion=f"Calificado con {rating}/5"
        )

        return Response({"mensaje": "Calificación registrada", "rating": rating})
