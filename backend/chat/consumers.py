# chat/consumers.py
import json
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

from .models import ChatRoom, Message, GroupChat
from .notification_utils import create_notifications_for_message
from rest_framework_simplejwt.tokens import UntypedToken


User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """
        WebSocket para chats (de ticket o directos).
        room_name = id de la sala de chat (ChatRoom).
        Solo pueden conectarse usuarios que son participantes del ChatRoom.
        """
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_room_{self.room_name}" # CORREGIDO: Coincide con la señal
        self.user = AnonymousUser()

        # 1. Extraer y validar token JWT desde la URL
        query_params = parse_qs(self.scope["query_string"].decode())
        token = query_params.get("token", [None])[0]

        if not token:
            await self.close()
            return

        try:
            validated_token = UntypedToken(token)
            user_id = validated_token["user_id"]
            # ✅ CORRECCIÓN: Usar select_related para precargar el rol y evitar errores síncronos.
            self.user = await database_sync_to_async(User.objects.select_related('rol').get)(id=user_id)
        except Exception:
            await self.close()
            return

        # Validar que el usuario pertenece a este chat (participante del room)
        can_join = await self.user_in_room()
        if not can_join:
            await self.close()
            return

        # Unirse al grupo del canal
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Salir del grupo al desconectar
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """
        Recibe mensajes desde el WebSocket.
        Estructura esperada (mínimo):
        {
            "type": "chat_message", // o "typing", "stop_typing"
            "message": "texto del mensaje",
            "message_type": "text"   // opcional, por defecto "text"
        }
        """
        try:
            data = json.loads(text_data)
            event_type = data.get("type")
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                "error": "Formato de mensaje inválido."
            }))
            return

        # ============================
        #  NUEVO: BROADCAST DE MENSAJES (si se maneja por WS)
        # ============================
        if event_type == "chat_message":
            # Esta lógica se puede mover aquí desde la señal si se prefiere
            pass
        # ============================
        #  EVENTO DE ESCRITURA (TYPING)
        # ============================
        if event_type == "typing":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "group_typing",
                    "sender": self.user.username,
                }
            )
            return

        if event_type == "stop_typing":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "group_stop_typing",
                    "sender": self.user.username,
                }
            )
            return

        message = data.get("message", "").strip()
        message_type = data.get("message_type", "text")

        if not message:
            await self.send(text_data=json.dumps({
                "error": "El contenido del mensaje no puede estar vacío."
            }))
            return

        # El envío de mensajes de chat se maneja vía API HTTP y se notifica por signals.
        # El WebSocket solo gestiona eventos de 'typing'.
        pass

    async def chat_message(self, event):
        """
        Evento que recibe cada cliente conectado al grupo.
        """
        await self.send(text_data=json.dumps({
            **event["message"]  # Enviar el objeto de mensaje serializado completo
        }))

    async def group_typing(self, event):
        """Informa a los clientes que un usuario está escribiendo."""
        await self.send(text_data=json.dumps({
            "typing": True,
            "sender": event["sender"]
        }))

    async def group_stop_typing(self, event):
        """Informa a los clientes que un usuario dejó de escribir."""
        await self.send(text_data=json.dumps({
            "typing": False,
            "sender": event["sender"]
        }))

    # --- Métodos auxiliares ---

    @database_sync_to_async
    def user_in_room(self):
        """
        Verifica que el usuario sea participante del ChatRoom.
        """
        try:
            # ✅ BUSCAR POR ID DE SALA DE CHAT, NO DE TICKET
            room = ChatRoom.objects.get(id=self.room_name)
            return room.participants.filter(id=self.user.id).exists()
        except ChatRoom.DoesNotExist:
            return False

    @database_sync_to_async
    def get_room(self):
        """Devuelve el ChatRoom."""
        try:
            # ✅ BUSCAR POR ID DE SALA DE CHAT
            return ChatRoom.objects.get(id=self.room_name)
        except ChatRoom.DoesNotExist:
            return None

    @database_sync_to_async
    def agent_has_initiated(self, room):
        """
        Devuelve True si ya existe algún mensaje en este room
        enviado por un usuario que NO sea 'solicitante' (es decir, agente/admin).
        Esto implementa la regla:
        - El usuario solo puede responder cuando el agente YA inició la conversación.
        """
        return Message.objects.filter(
            room=room
        ).exclude(
            # ✅ CORRECCIÓN: Usar la nueva lógica de roles.
            sender__rol__tipo_base="solicitante"
        ).exists()

    @database_sync_to_async
    def serialize_message(self, message):
        """Serializa un objeto de mensaje."""
        return MessageSerializer(message).data

class GroupChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket para chat grupal (ej. RRHH).
    Autenticación por JWT en query string (?token=...).
    Solo roles ['agente', 'admin'] pueden usar este chat.
    """
    async def connect(self):
        self.group_name = self.scope["url_route"]["kwargs"]["group_name"]
        self.room_group_name = f"group_chat_{self.group_name}"
        self.user = AnonymousUser()

        # 1. Extraer y validar token JWT desde la URL
        query_params = parse_qs(self.scope["query_string"].decode())
        token = query_params.get("token", [None])[0]

        if not token:
            await self.close()
            return

        try:
            validated_token = UntypedToken(token)
            user_id = validated_token["user_id"]
            # ✅ CORRECCIÓN: Usar select_related para precargar el rol.
            self.user = await database_sync_to_async(User.objects.select_related('rol').get)(id=user_id)
        except Exception:
            await self.close()
            return

        # 2. Verificar si el usuario tiene el rol permitido
        is_authorized = (
            self.user.rol and self.user.rol.tipo_base in ['agente', 'admin']
        )

        if not self.user.is_authenticated or not is_authorized:
            await self.close()
            return

        # 3. Unirse al grupo y aceptar la conexión
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        """
        Recibe mensajes para el chat grupal.
        Estructura esperada:
        {
            "type": "chat_message", // o "typing", "stop_typing"
            "message": "Hola equipo",
            "message_type": "text"    // opcional
        }
        """
        try:
            data = json.loads(text_data)
            event_type = data.get("type")
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({"error": "Formato de mensaje inválido."}))
            return

        # ============================
        #  EVENTO DE ESCRITURA (TYPING)
        # ============================
        if event_type == "typing":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "group_typing",
                    "sender": self.user.username,
                }
            )
            return

        if event_type == "stop_typing":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "group_stop_typing",
                    "sender": self.user.username,
                }
            )
            return

        message = data.get("message", "").strip()
        message_type = data.get("message_type", "text")
        sender = self.user

        if not message or not sender.is_authenticated:
            return

        # El envío de mensajes de chat se maneja vía API HTTP y se notifica por signals.
        pass

    async def group_message(self, event):
        # Enviar mensaje al cliente WebSocket
        await self.send(text_data=json.dumps({
            **event["message"]  # Enviar el objeto de mensaje serializado completo
        }))

    async def group_typing(self, event):
        """Informa a los clientes que un usuario está escribiendo."""
        await self.send(text_data=json.dumps({
            "typing": True,
            "sender": event["sender"]
        }))

    async def group_stop_typing(self, event):
        """Informa a los clientes que un usuario dejó de escribir."""
        await self.send(text_data=json.dumps({
            "typing": False,
            "sender": event["sender"]
        }))

    @database_sync_to_async
    def serialize_message(self, message):
        """Serializa un objeto de mensaje."""
        return MessageSerializer(message).data


class AgentPresenceConsumer(AsyncWebsocketConsumer):
    """
    WebSocket para tracking de presencia de agentes
    """
    async def connect(self):
        # ✅ CORRECCIÓN: El middleware JWTAuthMiddleware no precarga el rol.
        # Debemos obtener el usuario de nuevo aquí para asegurar que el rol esté disponible.
        user_from_scope = self.scope["user"]
        if not user_from_scope.is_authenticated:
            await self.close()
            return
        self.user = await database_sync_to_async(User.objects.select_related('rol').get)(id=user_from_scope.id)
        self.agent_group_name = "agent_presence"

        is_authorized = (
            self.user.rol and self.user.rol.tipo_base == 'agente'
        )

        if not self.user.is_authenticated or not is_authorized:
            await self.close()
            return

        # Unirse al grupo de presencia
        await self.channel_layer.group_add(
            self.agent_group_name,
            self.channel_name
        )

        # Notificar que el agente está en línea
        await self.channel_layer.group_send(
            self.agent_group_name,
            {
                "type": "agent_online",
                "agent_id": self.user.id,
                "username": self.user.username
            }
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Notificar que el agente se desconectó
        if hasattr(self, 'user') and self.user.is_authenticated:
            await self.channel_layer.group_send(
                self.agent_group_name,
                {
                    "type": "agent_offline",
                    "agent_id": self.user.id,
                    "username": self.user.username
                }
            )

        await self.channel_layer.group_discard(
            self.agent_group_name,
            self.channel_name
        )

    async def agent_online(self, event):
        """Recibir notificación de agente en línea"""
        await self.send(text_data=json.dumps({
            "type": "agent_online",
            "agent_id": event["agent_id"],
            "username": event["username"]
        }))

    async def agent_offline(self, event):
        """Recibir notificación de agente desconectado"""
        await self.send(text_data=json.dumps({
            "type": "agent_offline",
            "agent_id": event["agent_id"],
            "username": event["username"]
        }))
