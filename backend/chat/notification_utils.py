from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from notifications.models import Notification  # <- tu app
from .models import Message

User = settings.AUTH_USER_MODEL


def create_notifications_for_message(message: Message):
    """
    Crea notificaciones para todos los destinatarios correspondientes
    cuando se envía un mensaje de chat (room o group).
    """
    channel_layer = get_channel_layer()

    # 1. Notificaciones de chat por ticket (room)
    if message.room and message.room.type == 'TICKET':
        room = message.room
        ticket = room.ticket
        if not ticket: return # Seguridad por si los datos son inconsistentes

        # Destinatarios = todos los participantes menos el remitente
        recipients = room.participants.exclude(id=message.sender_id)

        # Texto según tipo de mensaje
        if message.message_type == "image":
            body = f"{message.sender.username} envió una imagen en el ticket #{ticket.id}"
        elif message.message_type == "file":
            body = f"{message.sender.username} envió un archivo en el ticket #{ticket.id}"
        else:
            preview = (message.content or "")[:60]
            body = f"{message.sender.username}: {preview}"

        # url = f"/tickets/{ticket.id}/chat"

        for user in recipients:
            notif = Notification.objects.create(
                usuario=user,
                mensaje=f"Nuevo mensaje en Ticket #{ticket.id}: {body}",
                tipo="chat_ticket", # Asegúrate que este tipo exista en tu modelo Notification
                ticket=ticket
            )

            # ENVIAR WS
            async_to_sync(channel_layer.group_send)(
                f"user_{user.id}",
                {
                    "type": "send_notification",
                    "content": {
                        "channel": "chat_message",
                        "message_id": message.id,
                        "notification_id": notif.id,
                        "sender_name": message.sender.username,
                        "message": body,
                        "room_id": room.id, # IMPORTANTE para redirigir
                        "ticket_id": ticket.id,
                        "created_at": str(message.timestamp),
                        "tipo": "chat_message" # Para coincidir con useNotificationSocket
                    }
                }
            )

    # 2. Notificaciones de chat directo
    elif message.room and message.room.type == 'DIRECTO':
        room = message.room
        recipients = room.participants.exclude(id=message.sender_id)

        if message.message_type == "image":
            body = f"Te envió una imagen."
        elif message.message_type == "file":
            body = f"Te envió un archivo."
        else:
            preview = (message.content or "")[:60]
            body = f"{preview}"

        # url = f"/chat" # URL genérica para la página de chats

        for user in recipients:
            notif = Notification.objects.create(
                usuario=user,
                mensaje=f"Nuevo mensaje de {message.sender.username}: {body}",
                tipo="chat_directo", # Asegúrate que este tipo exista
            )

            # ENVIAR WS
            async_to_sync(channel_layer.group_send)(
                f"user_{user.id}",
                {
                    "type": "send_notification",
                    "content": {
                        "channel": "chat_message",
                        "message_id": message.id,
                        "notification_id": notif.id,
                        "sender_name": message.sender.username,
                        "message": body,
                        "room_id": room.id, # IMPORTANTE para redirigir
                        "created_at": str(message.timestamp),
                        "tipo": "chat_message"
                    }
                }
            )

    # 3. Notificaciones de chat grupal (group)
    elif message.group:
        group = message.group
        # Aquí depende de cómo manejes los miembros del grupo;
        # si no tienes relación, podrías notificar solo a ciertos roles.

        # Si por ahora solo quieres notificar a todos los agentes/admins:
        User = get_user_model()
        recipients = User.objects.filter(rol__tipo_base__in=["agente", "admin"]).exclude(
            id=message.sender_id
        )

        if message.message_type == "image":
            body = f"{message.sender.username} envió una imagen en el grupo {group.name}"
        elif message.message_type == "file":
            body = f"{message.sender.username} envió un archivo en el grupo {group.name}"
        else:
            preview = (message.content or "")[:60]
            body = f"{message.sender.username}: {preview}"

        # url = f"/chat-grupal/{group.name}"  # ajusta a la ruta de tu front

        for user in recipients:
            notif = Notification.objects.create(
                usuario=user,
                mensaje=f"Nuevo mensaje en {group.name}: {body}",
                tipo="chat_group",
            )

            # ENVIAR WS
            async_to_sync(channel_layer.group_send)(
                f"user_{user.id}",
                {
                    "type": "send_notification",
                    "content": {
                        "channel": "chat_message",
                        "message_id": message.id,
                        "notification_id": notif.id,
                        "sender_name": message.sender.username,
                        "message": body,
                        "room_id": group.name, # O lo que uses para identificar el grupo
                        "is_group": True,
                        "created_at": str(message.timestamp),
                        "tipo": "chat_message"
                    }
                }
            )
