from rest_framework import serializers
from tickets.models import TicketHistory
from users.models import User


class _UserHistorySerializer(serializers.ModelSerializer):
    """
    Serializer interno y mínimo para mostrar la información del usuario en el historial.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']


class TicketHistorySerializer(serializers.ModelSerializer):
    """Serializer para historial de tickets"""
    # ✅ Devolvemos el objeto completo del usuario para que el frontend lo pueda usar.
    usuario_info = _UserHistorySerializer(source='usuario', read_only=True)
    fecha_formateada = serializers.SerializerMethodField()

    class Meta:
        model = TicketHistory
        fields = [
            'id', 'ticket', 'usuario', 'usuario_info', 'accion',
            'descripcion', 'fecha', 'fecha_formateada',
        ]
        read_only_fields = ['id', 'fecha']

    def get_fecha_formateada(self, obj):
        """Formatear fecha para mostrar"""
        return obj.fecha.strftime("%d/%m/%Y %H:%M")