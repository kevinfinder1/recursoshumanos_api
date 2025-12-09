import json
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):

        token = None
        self.user = None

        # obtener token desde querystring
        query_string = self.scope.get("query_string", b"").decode()
        if query_string:
            qs = parse_qs(query_string)
            token = qs.get("token", [None])[0]

        # si no viene en querystring, intentar header Authorization
        if not token:
            headers = dict((k.decode().lower(), v.decode()) for k, v in self.scope.get("headers", []))
            auth = headers.get("authorization")
            if auth and auth.lower().startswith("bearer "):
                token = auth.split(" ", 1)[1].strip()

        if not token:
            await self.close()
            return

        try:
            # importaciones que usan apps: hacerlo de forma perezosa dentro de connect()
            from rest_framework_simplejwt.tokens import AccessToken
            from django.contrib.auth import get_user_model

            access_token = AccessToken(token)
            user_id = access_token.get("user_id") or access_token.get("id") or access_token.get("sub")
            if not user_id:
                raise ValueError("Token no contiene user_id")

            User = get_user_model()
            # obtener usuario de la DB de forma asíncrona
            self.user = await database_sync_to_async(User.objects.get)(id=user_id)

            # Registrar en grupos: individual y broadcast
            self.group_name = f"user_{user_id}"
            await self.channel_layer.group_add("broadcast", self.channel_name)
            await self.channel_layer.group_add(self.group_name, self.channel_name)

            # dejar user en scope por compatibilidad (consumers later)
            self.scope["user"] = self.user

            await self.accept()
            # opcional: logging
            print(f"✅ WebSocket conectado: {getattr(self.user, 'username', user_id)}")

        except Exception as e:
            # log claro y cerrar conexión
            print("❌ Error autenticando token o usuario:", repr(e))
            await self.close()

    async def disconnect(self, close_code):
        # quitar de grupos si se añadió
        try:
            if hasattr(self, "group_name"):
                await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.channel_layer.group_discard("broadcast", self.channel_name)
        except Exception:
            pass

    async def receive(self, text_data):
        """Maneja mensajes recibidos desde el cliente"""
        try:
            data = json.loads(text_data)
            action = data.get('action')
            
            if action == 'mark_as_read':
                notification_id = data.get('notification_id')
                if notification_id:
                    # Marcar como leída en la base de datos
                    from .models import Notification
                    try:
                        notification = await database_sync_to_async(Notification.objects.get)(
                            id=notification_id,
                            usuario=self.user
                        )
                        if not notification.leida:
                            notification.leida = True
                            await database_sync_to_async(notification.save)(update_fields=['leida'])
                        
                        # Confirmar al cliente
                        await self.send(text_data=json.dumps({
                            "type": "notification_marked_read",
                            "notification_id": notification_id
                        }))
                    except Notification.DoesNotExist:
                        pass
        except json.JSONDecodeError:
            pass

    async def send_notification(self, event):
        """
        Maneja los eventos enviados vía channel_layer.group_send y los reenvía al cliente.
        Espera payload en event['content'] o en todo el event.
        """
        data = event.get("content") or event
        # garantizar serializable
        try:
            await self.send(text_data=json.dumps(data))
        except TypeError:
            # fallback: enviar representación mínima
            await self.send(text_data=json.dumps({"message": str(data)}))
