from rest_framework import serializers
from tickets.models import TicketAssignment

class TicketAssignmentSerializer(serializers.ModelSerializer):
    ticket_titulo = serializers.CharField(source='ticket.titulo', read_only=True)
    agente_origen_nombre = serializers.CharField(source='agente_origen.username', read_only=True)
    agente_destino_nombre = serializers.CharField(source='agente_destino.username', read_only=True)

    class Meta:
        model = TicketAssignment
        fields = '__all__'

# ✅ AGREGAR ESTE NUEVO SERIALIZER
class TicketAssignmentUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer para actualizar el estado de las asignaciones
    """
    class Meta:
        model = TicketAssignment
        fields = ['estado', 'fecha_actualizacion']
        read_only_fields = ['fecha_actualizacion']