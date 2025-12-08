from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from tickets.models import TicketAssignment
from tickets.serializers import TicketAssignmentSerializer
from tickets.permissions import IsAgenteOrAdmin

class TicketAssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Vista para consultar asignaciones (solo lectura para seguimiento)
    """
    queryset = TicketAssignment.objects.all().order_by('-fecha_envio')
    serializer_class = TicketAssignmentSerializer
    permission_classes = [IsAgenteOrAdmin]

    def get_queryset(self):
        """Filtrar asignaciones según el usuario"""
        user = self.request.user
        
        if user.rol and user.rol.tipo_base == 'admin':
            return self.queryset
            
        # Agentes solo ven asignaciones donde son origen o destino
        return self.queryset.filter(
            agente_origen=user
        ) | self.queryset.filter(
            agente_destino=user
        )

    @action(detail=False, methods=['get'])
    def mis_pendientes(self, request):
        """Obtener asignaciones pendientes del usuario actual"""
        from tickets.services.assignment_service import AssignmentService
        asignaciones_pendientes = AssignmentService.obtener_asignaciones_pendientes(request.user)
        serializer = self.get_serializer(asignaciones_pendientes, many=True)
        return Response(serializer.data)