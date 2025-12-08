from channels.generic.websocket import AsyncWebsocketConsumer
import json
from django.core.cache import cache

class PresenceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]

        if not self.user.is_authenticated:
            await self.close()
            return

        # Aceptar la conexión
        await self.accept()

        # Marcar al usuario como online en el cache (Redis)
        # El timeout es una salvaguarda por si la desconexión falla.
        cache.set(f'user_{self.user.id}_online', True, timeout=60 * 15) # 15 minutos

        # Añadir al usuario a un grupo de 'presencia' para recibir actualizaciones
        await self.channel_layer.group_add("presence", self.channel_name)

        # Notificar a todos en el grupo que este usuario está ahora online
        await self.channel_layer.group_send(
            "presence",
            {
                "type": "presence.update",
                "payload": {
                    "user_id": self.user.id,
                    "status": "online"
                }
            }
        )

    async def disconnect(self, close_code):
        if not self.user.is_authenticated:
            return

        # Marcar al usuario como offline
        cache.delete(f'user_{self.user.id}_online')

        # Notificar a todos que este usuario se ha desconectado
        await self.channel_layer.group_send(
            "presence",
            {
                "type": "presence.update",
                "payload": {
                    "user_id": self.user.id,
                    "status": "offline"
                }
            }
        )

        # Salir del grupo
        await self.channel_layer.group_discard("presence", self.channel_name)

    async def presence_update(self, event):
        # Enviar el mensaje de actualización de presencia al cliente WebSocket
        await self.send(text_data=json.dumps(event["payload"]))