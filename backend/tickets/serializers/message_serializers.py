from rest_framework import serializers
from tickets.models import TicketMessage

class TicketMessageSerializer(serializers.ModelSerializer):
    autor_username = serializers.CharField(source="autor.username", read_only=True)

    class Meta:
        model = TicketMessage
        fields = ["id", "ticket", "autor", "autor_username", "contenido", "fecha_envio"]
        read_only_fields = ["id", "ticket", "autor", "fecha_envio"]

class TicketMessageCreateSerializer(serializers.ModelSerializer):
    """
    Serializer específico para crear mensajes
    No requiere el campo 'ticket' ya que se asigna automáticamente
    """
    class Meta:
        model = TicketMessage
        fields = ["contenido"]

    def validate_contenido(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El mensaje no puede estar vacío.")
        return value.strip()