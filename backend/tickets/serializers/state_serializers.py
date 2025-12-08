from rest_framework import serializers
from tickets.models import Ticket

class TicketStateUpdateSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=Ticket.ESTADO_CHOICES)

    def validate_estado(self, value):
        return value