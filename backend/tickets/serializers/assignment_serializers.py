from rest_framework import serializers
from tickets.models import TicketAssignment

class TicketAssignmentSerializer(serializers.ModelSerializer):
    ticket_titulo = serializers.CharField(source='ticket.titulo', read_only=True)
    agente_origen_username = serializers.CharField(source='agente_origen.username', read_only=True)
    agente_destino_username = serializers.CharField(source='agente_destino.username', read_only=True)
    tiempo_restante = serializers.SerializerMethodField()
    ha_expirado = serializers.ReadOnlyField()

    class Meta:
        model = TicketAssignment
        fields = [
            'id', 'ticket', 'ticket_titulo', 'agente_origen', 'agente_origen_username',
            'agente_destino', 'agente_destino_username', 'fecha_envio',
            'fecha_limite_aceptacion', 'estado', 'tiempo_restante', 'ha_expirado',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'fecha_envio', 'created_at', 'updated_at', 'ha_expirado'
        ]

    def get_tiempo_restante(self, obj):
        from django.utils import timezone
        if obj.estado == 'pendiente':
            tiempo_restante = obj.fecha_limite_aceptacion - timezone.now()
            return max(0, int(tiempo_restante.total_seconds()))
        return 0

class TicketAssignmentCreateSerializer(serializers.ModelSerializer):
    # 🎯 Definir 'tiempo_aceptacion' como un campo explícito que no está en el modelo.
    # Es de solo escritura (write_only) porque solo lo usamos como entrada.
    tiempo_aceptacion = serializers.IntegerField(write_only=True, required=False, default=300)

    class Meta:
        model = TicketAssignment
        # 🎯 En 'fields', solo incluimos los campos que SÍ están en el modelo.
        fields = ['agente_destino', 'tiempo_aceptacion'] # 'tiempo_aceptacion' se incluye aquí para que sea procesado.

    def validate_agente_destino(self, value):
        user = self.context['request'].user
        if value == user:
            raise serializers.ValidationError("No puedes reasignar el ticket a ti mismo")
        
        # ✅ CORRECCIÓN: Usar la nueva lógica de roles para validar.
        if not value.rol or value.rol.tipo_base not in ['agente', 'admin']:
            raise serializers.ValidationError("El usuario destino debe ser un agente o administrador.")
            
        return value