from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

User = settings.AUTH_USER_MODEL


# 1. CHAT GRUPAL (AGENTES / RRHH)

class GroupChat(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


# 2. CHAT POR TICKET

class ChatRoom(models.Model):
    CHAT_TYPE_CHOICES = [
        ('TICKET', 'Chat de Ticket'),
        ('DIRECTO', 'Chat Directo'),
    ]

    ticket = models.OneToOneField(
        "tickets.Ticket",
        on_delete=models.SET_NULL,  # Cambiado de CASCADE para no borrar el chat si se borra el ticket
        related_name="chat_room",
        null=True,  # Permite que el campo sea nulo en la BD
        blank=True  # Permite que el campo esté vacío en formularios
    )
    type = models.CharField(
        max_length=10,
        choices=CHAT_TYPE_CHOICES,
        default='TICKET'
    )
    participants = models.ManyToManyField(
        User,
        related_name="chat_rooms"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def close_chat(self):
        """Cerrar chat cuando se cierre el ticket"""
        self.is_active = False
        self.save()

    def __str__(self):
        if self.ticket:
            return f"ChatRoom for Ticket #{self.ticket.id}"
        return f"Direct ChatRoom #{self.id}"


# 3. MENSAJES (TEXTO / IMAGEN / ARCHIVO)

class Message(models.Model):
    MESSAGE_TYPES = (
        ('text', 'Texto'),
        ('image', 'Imagen'),
        ('file', 'Archivo'),
    )

    # Chat entre usuario-agente (por ticket)
    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name="messages",
        null=True,
        blank=True
    )

    # Chat grupal (solo agentes)
    group = models.ForeignKey(
        GroupChat,
        on_delete=models.CASCADE,
        related_name="messages",
        null=True,
        blank=True
    )

    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    content = models.TextField(blank=True, null=True)

    # ARCHIVO adjunto
    file = models.FileField(
        upload_to="chat_files/",
        blank=True,
        null=True
    )

    # Tipo del mensaje
    message_type = models.CharField(
        max_length=10,
        choices=MESSAGE_TYPES,
        default='text'
    )

    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Nuevos campos para editar/borrar
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        who = self.sender.username
        if self.room:
            return f"[Room #{self.room.id}] {who}: {self.preview()}"
        elif self.group:
            return f"[Group {self.group.name}] {who}: {self.preview()}"
        return f"{who}"

    def preview(self):
        """Texto corto para admin/debug"""
        if self.message_type == 'text':
            return self.content[:30] if self.content else ""
        elif self.message_type == 'image':
            return "📷 Imagen"
        elif self.message_type == 'file':
            return f"📎 Archivo ({self.file.name if self.file else ''})"
        return "Mensaje"


#  SEÑAL PARA BROADCAST DE MENSAJES POR WEBSOCKET

@receiver(post_save, sender=Message)
def broadcast_message(sender, instance, created, **kwargs):
    """
    Se dispara después de que se guarda un mensaje (creado o actualizado).
    Envía el estado del mensaje por WebSocket.
    """
    channel_layer = get_channel_layer()
    # Importar serializer aquí para evitar importación circular
    from .serializers import MessageSerializer

    serialized_message = MessageSerializer(instance).data

    if instance.room:
        group_name = f"chat_room_{instance.room.id}"
    elif instance.group:
        group_name = f"group_chat_{instance.group.name}"
    else:
        return # No hay a dónde enviar

    # Determinar el tipo de evento a enviar
    if created:
        event_type = "chat_message_new"
    else:
        event_type = "chat_message_update"

    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "chat_event", # DEBE COINCIDIR con el nombre del método en el consumer
            "event_type": event_type,
            "message": serialized_message
        }
    )
