from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.username', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'usuario', 'usuario_nombre', 'mensaje', 'tipo', 'leida', 'fecha_creacion']
        read_only_fields = ['fecha_creacion', 'usuario']
