from channels.generic.websocket import AsyncWebsocketConsumer
import json
from django.core.cache import cache
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

User = get_user_model()

class PresenceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Intentar autenticar usando el token de la URL si no hay sesión
        if "user" not in self.scope or not self.scope["user"].is_authenticated:
            await self.authenticate_via_token()

        if not self.scope.get("user") or not self.scope["user"].is_authenticated:
            print("Presence: Conexión rechazada (Usuario no autenticado)")
            await self.close()
            return

        self.user = self.scope["user"]
        
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

    async def authenticate_via_token(self):
        """
        Extrae el token JWT de la query string y autentica al usuario.
        """
        try:
            query_string = self.scope.get("query_string", b"").decode("utf-8")
            params = parse_qs(query_string)
            token = params.get("token", [None])[0]

            if token:
                user = await self.get_user_from_token(token)
                if user:
                    self.scope["user"] = user
        except Exception as e:
            print(f"Presence: Error autenticando token: {e}")

    @database_sync_to_async
    def get_user_from_token(self, token_key):
        try:
            access_token = AccessToken(token_key)
            user_id = access_token["user_id"]
            return User.objects.get(id=user_id)
        except (InvalidToken, TokenError, User.DoesNotExist):
            return None