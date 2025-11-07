from rest_framework import serializers
from tickets.models import Ticket, TicketHistory, TicketAssignment
from django.contrib.auth import get_user_model
from tickets.models import TicketMessage


User = get_user_model()


class TicketSerializer(serializers.ModelSerializer):
    """
    Serializador principal para los tickets.
    Incluye campos calculados para control de edición y eliminación.
    """

    # Campos adicionales para mostrar nombres legibles
    solicitante_username = serializers.CharField(source='solicitante.username', read_only=True)
    agente_username = serializers.CharField(source='agente.username', read_only=True)

    # Campos de control (propiedades del modelo)
    puede_editar = serializers.BooleanField(read_only=True)
    puede_eliminar = serializers.BooleanField(read_only=True)
    tiempo_restante_edicion = serializers.IntegerField(read_only=True)

    # El archivo se puede subir desde el frontend
    archivo_adjunto = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Ticket
        fields = [
            'id',
            'titulo',
            'descripcion',
            'estado',
            'prioridad',
            'archivo_adjunto',
            'solicitante',
            'solicitante_username',
            'agente',
            'agente_username',
            'fecha_creacion',
            'fecha_actualizacion',
            'categoria_principal',
            'subcategoria',
            'puede_editar',
            'puede_eliminar',
            'tiempo_restante_edicion',
        ]
        read_only_fields = [
            'id',
            'estado',
            'solicitante',
            'solicitante_username',
            'agente_username',
            'fecha_creacion',
            'fecha_actualizacion',
            'puede_editar',
            'puede_eliminar',
            'tiempo_restante_edicion',
        ]

    def create(self, validated_data):
        """
        Personaliza la creación del ticket:
        - Asigna automáticamente el solicitante desde la vista.
        - Guarda el historial inicial del ticket.
        """
        request = self.context.get('request')
        if request and not validated_data.get('solicitante'):
            validated_data['solicitante'] = request.user

        ticket = Ticket.objects.create(**validated_data)

        # Registrar historial inicial
        TicketHistory.objects.create(
            ticket=ticket,
            usuario=ticket.solicitante,
            accion="Creación del ticket",
            descripcion=f"Ticket '{ticket.titulo}' creado con prioridad {ticket.prioridad}."
        )

        return ticket

    def validate(self, data):
        """Permite dejar la subcategoría vacía."""
        if 'subcategoria' in data and not data['subcategoria']:
            data['subcategoria'] = None
        return data


class TicketAssignmentSerializer(serializers.ModelSerializer):
    ticket_titulo = serializers.CharField(source='ticket.titulo', read_only=True)
    agente_origen_nombre = serializers.CharField(source='agente_origen.username', read_only=True)
    agente_destino_nombre = serializers.CharField(source='agente_destino.username', read_only=True)

    class Meta:
        model = TicketAssignment
        fields = '__all__'


class TicketHistorySerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.username', read_only=True)

    class Meta:
        model = TicketHistory
        fields = '__all__'


# ============================================================
# 💬 SERIALIZER: MENSAJES DEL CHAT
# ============================================================
class TicketMessageSerializer(serializers.ModelSerializer):
    autor_username = serializers.CharField(source="autor.username", read_only=True)

    class Meta:
        model = TicketMessage
        fields = ["id", "ticket", "autor", "autor_username", "contenido", "fecha_envio"]
        read_only_fields = ["id", "autor", "fecha_envio"]

# ============================================================
# 🧠 SERIALIZER PARA EL PANEL DEL AGENTE
# ============================================================
class AgentTicketSerializer(TicketSerializer):
    """
    Extiende el TicketSerializer para incluir los mensajes (solo lectura)
    y permitir interacción del agente en su panel.
    """
    mensajes = TicketMessageSerializer(many=True, read_only=True)

    class Meta(TicketSerializer.Meta):
        fields = TicketSerializer.Meta.fields + ["mensajes"]
        read_only_fields = TicketSerializer.Meta.read_only_fields + ["mensajes"]