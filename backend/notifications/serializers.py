from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.username', read_only=True)
    
    # Manejar campos de ticket que pueden ser null
    ticket = serializers.SerializerMethodField()
    ticket_titulo = serializers.SerializerMethodField()
    ticket_estado = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'usuario',
            'usuario_nombre',
            'mensaje',
            'tipo',
            'ticket',
            'ticket_titulo',
            'ticket_estado',
            'leida',
            'fecha_creacion'
        ]
        read_only_fields = ['fecha_creacion', 'usuario']
    
    def get_ticket(self, obj):
        """Devuelve el ID del ticket si existe, None en otro caso."""
        return obj.ticket.id if obj.ticket else None
    
    def get_ticket_titulo(self, obj):
        """Devuelve el título del ticket si existe, None en otro caso."""
        return obj.ticket.titulo if obj.ticket else None
    
    def get_ticket_estado(self, obj):
        """Devuelve el estado del ticket si existe, None en otro caso."""
        return obj.ticket.estado if obj.ticket else None
