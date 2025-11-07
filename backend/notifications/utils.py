# notifications/utils.py
from notifications.models import Notification
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import json

def send_notification(user_id, message, tipo="general"):
    channel_layer = get_channel_layer()

    # Guardar en la DB
    Notification.objects.create(usuario_id=user_id, mensaje=message, tipo=tipo)

    # Enviar en tiempo real
    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}",
        {
            "type": "send_notification",
            "content": {
                "tipo": tipo,
                "mensaje": message,
            },
        },
    )
