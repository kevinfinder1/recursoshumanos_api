from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import logging

from notifications.models import Notification
from tickets.models import Ticket, TicketAssignment

logger = logging.getLogger(__name__)

class NotificationService:
    """
    Servicio para manejar todas las notificaciones relacionadas con tickets
    """
    
    @staticmethod
    def crear_notificacion_bd(usuario, mensaje, tipo="general", ticket_id=None):
        """
        Crea notificación en base de datos
        """
        try:
            notification = Notification.objects.create(
                usuario=usuario,
                mensaje=mensaje,
                tipo=tipo,
                # Ahora que el campo existe en el modelo, esto funcionará.
                ticket_id=ticket_id,
            )
            return notification
        except Exception as e:
            logger.error(f"❌ Error creando notificación en BD: {e}")
            return None

    @staticmethod
    def enviar_notificacion_a_grupo(group_name, payload_content):
        """
        Función genérica para enviar un payload a un grupo de WebSocket.
        """
        try:
            channel_layer = get_channel_layer()
            if not channel_layer:
                logger.warning("❌ Channel layer no disponible")
                return

            payload = {
                "type": "send_notification",
                "content": payload_content,
            }
            
            async_to_sync(channel_layer.group_send)(group_name, payload)
            logger.info(f"✅ Notificación enviada al grupo '{group_name}'")
        except Exception as e:
            logger.error(f"❌ Error enviando notificación WebSocket: {e}")

    @staticmethod
    def enviar_notificacion_a_usuario(user, payload_content):
        """Envía una notificación a un usuario específico."""
        NotificationService.enviar_notificacion_a_grupo(
            f"user_{user.id}", payload_content
        )

    @staticmethod
    def enviar_notificacion_websocket(notification):
        """
        Atajo para serializar una Notification y enviarla por WebSocket
        al usuario dueño de esa notificación.
        """
        try:
            from notifications.serializers import NotificationSerializer

            data = NotificationSerializer(notification).data
            NotificationService.enviar_notificacion_a_usuario(notification.usuario, data)
        except Exception as e:
            logger.error(f"❌ Error enviando notificación websocket: {e}")

    # -----------------------------
    # Eventos específicos de tickets
    # -----------------------------
    @staticmethod
    def notificar_ticket_creado(ticket):
        """
        Notificar creación de nuevo ticket a administradores
        """
        mensaje = f"Nuevo ticket creado: #{ticket.id} - {ticket.titulo}"

        from users.models import User
        administradores = User.objects.filter(rol__tipo_base="admin")

        from notifications.serializers import NotificationSerializer

        for admin in administradores:
            notification = NotificationService.crear_notificacion_bd(
                admin,
                mensaje,
                "ticket_nuevo_admin",
                ticket.id,
            )
            if notification:
                NotificationService.enviar_notificacion_a_usuario(
                    admin, NotificationSerializer(notification).data
                )

    @staticmethod
    def notificar_ticket_asignado(ticket, agente_anterior=None):
        """
        Notificar asignación de ticket a agente
        """
        if ticket.agente:
            mensaje = f"Se te ha asignado el ticket #{ticket.id}: {ticket.titulo}"
            notification = NotificationService.crear_notificacion_bd(
                ticket.agente, mensaje, "ticket_asignado", ticket.id
            )
            if notification:
                from notifications.serializers import NotificationSerializer

                NotificationService.enviar_notificacion_a_usuario(
                    ticket.agente, NotificationSerializer(notification).data
                )

    @staticmethod
    def notificar_ticket_actualizado(ticket, usuario):
        """
        Notificar cuando el solicitante actualiza el ticket.
        - Se notifica al agente asignado (si existe).
        """
        if not ticket.agente:
            return

        mensaje = (
            f"El ticket #{ticket.id} ha sido actualizado por {usuario.username}."
        )
        notification = NotificationService.crear_notificacion_bd(
            ticket.agente,
            mensaje,
            "ticket_actualizado",
            ticket.id,
        )
        if notification:
            NotificationService.enviar_notificacion_websocket(notification)

    @staticmethod
    def notificar_reasignacion_pendiente(
        ticket, agente_anterior, nuevo_agente, tiempo_aceptacion=300
    ):
        """
        Notificar reasignación pendiente de aceptación
        """
        try:
            notification_nuevo_agente = NotificationService.crear_notificacion_bd(
                nuevo_agente,
                f"Tienes una reasignación pendiente para el ticket #{ticket.id}",
                "ticket_reasignado",
                ticket.id,
            )
            if notification_nuevo_agente:
                from notifications.serializers import NotificationSerializer

                NotificationService.enviar_notificacion_a_usuario(
                    nuevo_agente,
                    NotificationSerializer(notification_nuevo_agente).data,
                )

        except Exception as e:
            logger.error(f"❌ Error notificando reasignación: {e}")

    @staticmethod
    def notificar_cambio_estado(ticket, estado_anterior, estado_nuevo, usuario):
        """
        Notificar cambio de estado del ticket al solicitante.
        """
        mensaje = (
            f"Ticket #{ticket.id} cambió de '{estado_anterior}' a '{estado_nuevo}'"
        )

        notification = NotificationService.crear_notificacion_bd(
            ticket.solicitante,
            mensaje,
            "ticket_actualizado",
            ticket.id,
        )
        if notification:
            NotificationService.enviar_notificacion_websocket(notification)

    @staticmethod
    def notificar_ticket_cerrado(ticket, usuario_que_cerro):
        """
        Notificar cierre de ticket al solicitante
        """
        mensaje = f"Ticket #{ticket.id} ha sido cerrado: {ticket.titulo}"

        notification = NotificationService.crear_notificacion_bd(
            ticket.solicitante,
            mensaje,
            "ticket_cerrado",
            ticket.id,
        )
        if notification:
            NotificationService.enviar_notificacion_websocket(notification)