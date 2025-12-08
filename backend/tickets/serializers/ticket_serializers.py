from rest_framework import serializers
from django.utils import timezone

from tickets.models import Ticket, TicketHistory
from users.models import User


# 🎯 1. Crear un serializador reutilizable para la información del usuario
class UserInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

# =====================================================
#                   TICKET SERIALIZER
# =====================================================

class TicketSerializer(serializers.ModelSerializer):
    solicitante_info = UserInfoSerializer(source='solicitante', read_only=True)
    agente_info = UserInfoSerializer(source='agente', read_only=True)
    categoria_nombre = serializers.CharField(source='categoria_principal.nombre', read_only=True)
    subcategoria_nombre = serializers.CharField(source='subcategoria.nombre', read_only=True)
    tiempo_restante_edicion = serializers.ReadOnlyField()
    puede_editar = serializers.ReadOnlyField()
    puede_eliminar = serializers.ReadOnlyField()
    esta_vencido = serializers.ReadOnlyField()
    sala_chat_id = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            'id', 'titulo', 'descripcion', 'estado', 'prioridad',
            'solicitante', 'solicitante_info',
            'agente', 'agente_info',
            'categoria_principal', 'categoria_nombre',
            'subcategoria', 'subcategoria_nombre',
            'archivo_adjunto',
            'fecha_creacion', 'fecha_actualizacion', 'fecha_cierre',
            'tiempo_estimado_resolucion',
            'rating', 'comentario_cierre',
            'tiempo_restante_edicion', 'puede_editar', 'puede_eliminar', 'esta_vencido',
            'sala_chat_id'
        ]
        read_only_fields = [
            'id', 'solicitante', 'fecha_creacion', 'fecha_actualizacion',
            'tiempo_restante_edicion', 'puede_editar', 'puede_eliminar', 'esta_vencido'
        ]

    def get_sala_chat_id(self, obj):
        """Devuelve el ID de sala de chat si existe."""
        if hasattr(obj, "chat_room") and obj.chat_room:
            return obj.chat_room.id
        return None


# =====================================================
#               TICKET CREATE SERIALIZER
# =====================================================

class TicketCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = [
            'titulo', 'descripcion', 'prioridad',
            'categoria_principal', 'subcategoria',
            'archivo_adjunto'
        ]

    def create(self, validated_data):
        validated_data['solicitante'] = self.context['request'].user
        return super().create(validated_data)


# =====================================================
#                  LISTA DE TICKETS
# =====================================================

class TicketListSerializer(serializers.ModelSerializer):
    solicitante_info = UserInfoSerializer(source='solicitante', read_only=True)
    agente_info = UserInfoSerializer(source='agente', read_only=True)
    categoria_nombre = serializers.CharField(source='categoria_principal.nombre', read_only=True)
    subcategoria_nombre = serializers.CharField(source='subcategoria.nombre', read_only=True)
    dias_abierto = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            'id', 'titulo', 'estado', 'prioridad', 'fecha_creacion',
            'solicitante_info', 'agente_info',
            'categoria_nombre', 'subcategoria_nombre',
            'dias_abierto'
        ]

    def get_dias_abierto(self, obj):
        """Días desde que se abrió el ticket."""
        if obj.estado == 'Resuelto' and obj.fecha_cierre:
            diferencia = obj.fecha_cierre - obj.fecha_creacion
        else:
            diferencia = timezone.now() - obj.fecha_creacion
        return diferencia.days


# =====================================================
#                DETALLE DE TICKET COMPLETO
# =====================================================

class TicketDetailSerializer(TicketSerializer):
    # 🎯 2. Heredar los campos anidados de TicketSerializer es suficiente,
    # pero los definimos de nuevo para mayor claridad.
    solicitante_info = UserInfoSerializer(source='solicitante', read_only=True)
    agente_info = UserInfoSerializer(source='agente', read_only=True)
    historial = serializers.SerializerMethodField()
    mensajes_count = serializers.SerializerMethodField()

    class Meta(TicketSerializer.Meta):
        fields = TicketSerializer.Meta.fields + [
            'historial',
            'mensajes_count'
        ]

    def get_historial(self, obj):
        """Últimos 10 cambios del ticket."""
        historial = TicketHistory.objects.filter(ticket=obj).order_by('-fecha')[:10]

        from .history_serializers import TicketHistorySerializer
        return TicketHistorySerializer(historial, many=True).data

    def get_mensajes_count(self, obj):
        """Número de mensajes del chat del ticket."""
        if hasattr(obj, 'chat_room') and obj.chat_room:
            return obj.chat_room.messages.count()
        return 0
