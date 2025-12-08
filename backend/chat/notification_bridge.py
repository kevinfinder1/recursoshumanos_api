# chat/notification_bridge.py
from notifications.models import Notification
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.conf import settings

def notify_chat_message(message):
    """
    Crea una NOTIFICATION en la base de datos
    y también la envía por WebSocket al usuario correspondiente.
    """
    channel_layer = get_channel_layer()

    # === 1. CHAT POR TICKET ===
    if message.room:
        room = message.room
        ticket = room.ticket

        # Todos los participantes menos el que envió
        recipients = room.participants.exclude(id=message.sender_id)

        for user in recipients:

            # Crear texto del mensaje
            if message.message_type == "image":
                body = f"{message.sender.username} envió una imagen en el ticket #{ticket.id}"
            elif message.message_type == "file":
                body = f"{message.sender.username} envió un archivo en el ticket #{ticket.id}"
            else:
                body = f"{message.sender.username}: {message.content[:60]}"

            # Crear registro en DB
            notif = Notification.objects.create(
                usuario=user,
                mensaje=body,
                tipo="ticket_actualizado",     # tipo de tu sistema real
                ticket=ticket
            )

            # Enviar por WebSocket
            async_to_sync(channel_layer.group_send)(
                f"user_{user.id}",
                {
                    "type": "send_notification",
                    "content": {
                        "id": notif.id,
                        "mensaje": notif.mensaje,
                        "tipo": notif.tipo,
                        "ticket": ticket.id,
                        "leida": notif.leida,
                        "fecha_creacion": notif.fecha_creacion.isoformat(),
                    }
                }
            )

    # === 2. CHAT GRUPAL ===
    elif message.group:
        group = message.group

        User = settings.AUTH_USER_MODEL

        # Notificar solo a agentes y admin, como en tu sistema
        recipients = User.objects.filter(
            rol__tipo_base__in=["agente", "admin"]
        ).exclude(id=message.sender_id)

        for user in recipients:

            if message.message_type == "image":
                body = f"{message.sender.username} envió una imagen en el grupo {group.name}"
            elif message.message_type == "file":
                body = f"{message.sender.username} envió un archivo en el grupo {group.name}"
            else:
                body = f"{message.sender.username}: {message.content[:60]}"

            notif = Notification.objects.create(
                usuario=user,
                mensaje=body,
                tipo="sistema",  # tu tipo genérico
                ticket=None       # no hay ticket en chat grupal
            )

            async_to_sync(channel_layer.group_send)(
                f"user_{user.id}",
                {
                    "type": "send_notification",
                    "content": {
                        "id": notif.id,
                        "mensaje": notif.mensaje,
                        "tipo": notif.tipo,
                        "ticket": None,
                        "leida": notif.leida,
                        "fecha_creacion": notif.fecha_creacion.isoformat(),
                    }
                }
            )
