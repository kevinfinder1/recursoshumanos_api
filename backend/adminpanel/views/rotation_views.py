from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from adminpanel.models import RotacionProgramada
from adminpanel.admin_serializers import RotacionProgramadaSerializer
from adminpanel.permissions import IsAdminRole

class RotacionProgramadaViewSet(viewsets.ModelViewSet):
    """
    Endpoint para gestionar la programación de rotaciones de personal.
    """
    queryset = RotacionProgramada.objects.all().order_by('fecha_inicio')
    serializer_class = RotacionProgramadaSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['agente__username', 'agente__email', 'agente_reemplazo__username']
    ordering_fields = ['fecha_inicio', 'ejecutada']