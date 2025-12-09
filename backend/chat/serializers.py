# chat/serializers.py
from rest_framework import serializers
from .models import ChatRoom, Message
from django.conf import settings


# ============================================================
# 1. SERIALIZER DE MENSAJE (TEXTO, IMAGEN, ARCHIVO)
# ============================================================
class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.username", read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "sender",
            "sender_name",
            "content",
            "file",
            "file_url",
            "message_type",
            "timestamp",
            "is_edited",
            "is_deleted",
        ]

    def get_file_url(self, obj):
        """
        Devuelve la URL del archivo.
        - En desarrollo: URL relativa (/media/...)
        - En producción: URL absoluta si es necesario
        """
        if obj.file:
            request = self.context.get("request")
            
            # Si estamos en desarrollo, usar URL relativa
            if settings.DEBUG:
                return obj.file.url  # Devuelve '/media/chat_files/archivo.pdf'
            else:
                # En producción, usar URL absoluta
                return request.build_absolute_uri(obj.file.url) if request else obj.file.url
        return None

    def to_representation(self, instance):
        """
        Si el mensaje está borrado, oculta el contenido y el archivo.
        """
        ret = super().to_representation(instance)
        if instance.is_deleted:
            ret['content'] = "Este mensaje fue eliminado."
            ret['file'] = None
            ret['file_url'] = None
            ret['message_type'] = 'text' # Se convierte en un mensaje de texto simple
        return ret



# 2. SERIALIZER DEL CHAT ROOM
# ============================================================
class ChatRoomSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    ticket_id = serializers.IntegerField(source="ticket.id", read_only=True)
    ticket_estado = serializers.CharField(source="ticket.estado", read_only=True)
    participants = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = [
            "id",
            "ticket_id",
            "ticket_estado",
            "type",
            "is_active",
            "participants",
            "messages",
            "created_at",
        ]

    def get_participants(self, obj):
        """
        Regresa una lista con información básica de cada participante:
        id, username, role
        """
        participants_data = []
        for user in obj.participants.all():
            role_value = None
            if user.rol:
                if user.rol.tipo_base == 'agente':
                    role_value = 'agente'
                elif user.rol.tipo_base == 'solicitante':
                    role_value = 'solicitante'
                else:
                    role_value = user.rol.nombre_clave
            participants_data.append({
                "id": user.id,
                "username": user.username,
                "role": role_value,
            })
        return participants_data
