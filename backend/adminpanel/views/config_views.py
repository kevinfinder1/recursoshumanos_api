# adminpanel/views/config_views.py
from rest_framework import viewsets, permissions, generics
from ..models import Priority, SLA, SystemLog, ConfiguracionSistema
from ..admin_serializers import (
    PrioritySerializer,
    SLASerializer,
    SystemLogSerializer,
    ConfiguracionSistemaSerializer,
)
from ..permissions import IsAdminRole


class PriorityViewSet(viewsets.ModelViewSet):
    """
    API endpoint para gestionar Prioridades.
    Solo los administradores pueden realizar operaciones CRUD.
    """
    queryset = Priority.objects.all()
    serializer_class = PrioritySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]


class SLAViewSet(viewsets.ModelViewSet):
    """
    API endpoint para gestionar SLAs (Acuerdos de Nivel de Servicio).
    Solo los administradores pueden realizar operaciones CRUD.
    """
    queryset = SLA.objects.all()
    serializer_class = SLASerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]


class SystemLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint para ver los registros (logs) del sistema.
    Es de solo lectura para administradores.
    """
    queryset = SystemLog.objects.select_related('usuario').all()
    serializer_class = SystemLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    filterset_fields = ['accion', 'usuario__username', 'fecha']
    search_fields = ['descripcion', 'ip']


class ConfiguracionSistemaView(generics.RetrieveUpdateAPIView):
    """
    API endpoint para ver y actualizar la configuración del sistema.
    Utiliza el patrón Singleton para asegurar una única instancia.
    """
    queryset = ConfiguracionSistema.objects.all()
    serializer_class = ConfiguracionSistemaSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get_object(self):
        # Siempre devuelve el primer objeto, creándolo si no existe.
        obj, created = ConfiguracionSistema.objects.get_or_create(pk=1)
        return obj