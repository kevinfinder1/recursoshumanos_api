import json
import jwt
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.conf import settings
from django.contrib.auth import get_user_model
from tickets.models import Ticket, TicketMessage
from tickets.serializers import TicketMessageSerializer

logger = logging.getLogger(__name__)
User = get_user_model()

# ============================================================
# 🔔 CONSUMIDOR DE NOTIFICACIONES
# ============================================================
class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = await self.get_user_from_token()
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4003)
            return

        # Grupos
        await self.channel_layer.group_add(f"user_{self.user.id}", self.channel_name)
        await self.channel_layer.group_add("broadcast", self.channel_name)
        if await self.is_agente():
            await self.channel_layer.group_add("agentes", self.channel_name)

        await self.accept()
        await self.send_json({
            "type": "connection_established",
            "message": f"✅ Conectado al canal de notificaciones: {self.user.username}"
        })

    async def disconnect(self, code):
        if hasattr(self, "user"):
            await self.channel_layer.group_discard(f"user_{self.user.id}", self.channel_name)
            await self.channel_layer.group_discard("broadcast", self.channel_name)
            if await self.is_agente():
                await self.channel_layer.group_discard("agentes", self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get("type") == "ping":
                await self.send_json({"type": "pong", "timestamp": data.get("timestamp")})
        except Exception as e:
            logger.error(f"Error en NotificationConsumer.receive: {e}")

    async def send_notification(self, event):
        await self.send_json({"type": "notification", **event.get("content", {})})

    @database_sync_to_async
    def is_agente(self):
        return getattr(self.user, "role", "") in [
            "agente", "agente_nomina", "agente_certificados",
            "agente_transporte", "agente_epps", "agente_tca", "admin"
        ]

    async def get_user_from_token(self):
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        token = None
        for param in query_string.split("&"):
            if param.startswith("token="):
                token = param.split("=")[1]
                break
        if not token:
            return None
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            return await database_sync_to_async(User.objects.get)(id=payload["user_id"])
        except Exception as e:
            logger.error(f"Error decodificando token: {e}")
            return None

    async def send_json(self, content):
        await self.send(text_data=json.dumps(content))


# ============================================================
# 💬 CONSUMIDOR DE CHAT POR TICKET
# ============================================================
class TicketChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            # Extraer token JWT
            query_string = self.scope.get("query_string", b"").decode("utf-8")
            token = None
            for param in query_string.split("&"):
                if param.startswith("token="):
                    token = param.split("=")[1]
                    break

            if not token:
                await self.close(code=4001)
                return

            self.user = await self.get_user_from_token(token)
            if not self.user or not self.user.is_authenticated:
                await self.close(code=4003)
                return

            # Obtener ticket y verificar permisos
            self.ticket_id = self.scope["url_route"]["kwargs"]["ticket_id"]
            ticket = await self.get_ticket(self.ticket_id)

            if not ticket:
                await self.close(code=404)
                return

            if self.user.id not in [ticket.solicitante.id, ticket.agente.id]:
                logger.warning(f"❌ Usuario {self.user.username} no autorizado en ticket {self.ticket_id}")
                await self.close(code=403)
                return

            self.room_group_name = f"ticket_{self.ticket_id}"
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()

            logger.info(f"✅ Chat WebSocket conectado para ticket {self.ticket_id} ({self.user.username})")
            await self.send_json({
                "type": "connection_established",
                "message": f"Conectado al chat del ticket #{self.ticket_id}"
            })

        except Exception as e:
            logger.error(f"❌ Error en conexión del chat: {e}")
            await self.close(code=4002)

    async def disconnect(self, close_code):
        try:
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
            logger.info(f"🔌 Chat desconectado: ticket {self.ticket_id} ({self.user.username})")
        except Exception as e:
            logger.error(f"Error al desconectarse: {e}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            tipo = data.get("type")
            contenido = data.get("contenido")

            # Manejo de typing
            if tipo == "typing":
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {"type": "chat_typing", "autor": self.user.username}
                )
                return

            # Ping/pong
            if tipo == "ping":
                await self.send_json({"type": "pong"})
                return

            # Mensaje normal
            if contenido:
                mensaje = await self.save_message(contenido)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {"type": "chat_message", "message": TicketMessageSerializer(mensaje).data}
                )
        except Exception as e:
            logger.error(f"❌ Error en receive(): {e}")
            await self.send_json({"type": "error", "message": str(e)})

    async def chat_message(self, event):
        await self.send_json({"type": "chat_message", "message": event["message"]})

    async def chat_typing(self, event):
        await self.send_json({"type": "typing", "autor": event["autor"]})

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            return User.objects.get(id=payload["user_id"])
        except Exception as e:
            logger.error(f"Token inválido: {e}")
            return None

    @database_sync_to_async
    def get_ticket(self, ticket_id):
        try:
            return Ticket.objects.select_related("agente", "solicitante").get(id=ticket_id)
        except Ticket.DoesNotExist:
            return None

    @database_sync_to_async
    def save_message(self, contenido):
        ticket = Ticket.objects.get(id=self.ticket_id)
        return TicketMessage.objects.create(ticket=ticket, autor=self.user, contenido=contenido)

    async def send_json(self, content):
        await self.send(text_data=json.dumps(content))
