from rest_framework import viewsets, permissions, filters, decorators, status
from rest_framework.response import Response
from tickets.models import Ticket, TicketAssignment, TicketHistory
from tickets.serializers.ticket_serializers import (
    TicketSerializer,
    TicketAssignmentSerializer,
    TicketHistorySerializer
)
from users.models import User


class TicketAdminViewSet(viewsets.ModelViewSet):
    """
    Vista para administradores: pueden ver, filtrar y asignar tickets a agentes.
    """
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Ticket.objects.all().order_by('-fecha_creacion')

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['titulo', 'descripcion', 'estado', 'categoria_principal', 'subcategoria']
    ordering_fields = ['fecha_creacion', 'prioridad', 'estado']

    @decorators.action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        """
        GET /api/admin/tickets/{id}/historial/
        Retorna el historial completo del ticket.
        """
        ticket = self.get_object()
        historial = TicketHistory.objects.filter(ticket=ticket).order_by('-fecha')
        serializer = TicketHistorySerializer(historial, many=True)
        return Response(serializer.data)

    @decorators.action(detail=True, methods=['get'])
    def asignaciones(self, request, pk=None):
        """
        GET /api/admin/tickets/{id}/asignaciones/
        Retorna las asignaciones registradas del ticket.
        """
        ticket = self.get_object()
        asignaciones = TicketAssignment.objects.filter(ticket=ticket).order_by('-fecha_envio')
        serializer = TicketAssignmentSerializer(asignaciones, many=True)
        return Response(serializer.data)

    @decorators.action(detail=True, methods=['patch'])
    def asignar_agente(self, request, pk=None):
        """
        PATCH /api/admin/tickets/{id}/asignar_agente/
        Permite al admin asignar o reasignar un ticket a un agente.
        """
        ticket = self.get_object()
        agente_id = request.data.get('agente_id')

        try:
            agente = User.objects.get(id=agente_id, role__startswith='agente')
        except User.DoesNotExist:
            return Response(
                {"error": "El agente especificado no existe o no tiene rol de agente."},
                status=status.HTTP_400_BAD_REQUEST
            )

        ticket.agente = agente
        ticket.estado = 'En Proceso'
        ticket.save(update_fields=['agente', 'estado', 'fecha_actualizacion'])

        # Registrar el cambio en el historial
        TicketHistory.objects.create(
            ticket=ticket,
            usuario=request.user,
            accion="Asignación de agente",
            descripcion=f"Ticket asignado a {agente.username} por el administrador {request.user.username}."
        )

        return Response({"mensaje": f"Ticket asignado a {agente.username} correctamente."})
