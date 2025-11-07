from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from tickets.models import TicketAssignment, Ticket, TicketHistory
from tickets.serializers.assignment_serializers import (
    TicketAssignmentSerializer,
    TicketAssignmentUpdateSerializer,
)

User = get_user_model()


# ============================================================
# 🔵 VISTA PRINCIPAL: GESTIÓN DE ASIGNACIONES
# ============================================================

class TicketAssignmentViewSet(viewsets.ModelViewSet):
    """
    Vista principal para crear y listar reasignaciones de tickets entre agentes.
    """
    serializer_class = TicketAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # 🔹 Muestra las asignaciones donde el usuario participa (como origen o destino)
        return TicketAssignment.objects.filter(
            models.Q(agente_origen=user) | models.Q(agente_destino=user)
        ).select_related('ticket', 'agente_origen', 'agente_destino')

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Crea una reasignación entre agentes.
        """
        ticket_id = request.data.get("ticket_id")
        agente_destino_id = request.data.get("agente_destino_id")

        if not ticket_id or not agente_destino_id:
            return Response(
                {"detail": "Debe especificar el ticket_id y agente_destino_id."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            ticket = Ticket.objects.select_for_update().get(id=ticket_id)
        except Ticket.DoesNotExist:
            return Response({"detail": "Ticket no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        # 🔒 Validar que el usuario actual sea el agente asignado
        if ticket.agente != request.user:
            return Response(
                {"detail": "No puedes reasignar un ticket que no te pertenece."},
                status=status.HTTP_403_FORBIDDEN
            )

        # 🔄 Crear la asignación
        agente_destino = User.objects.get(id=agente_destino_id)
        asignacion = TicketAssignment.objects.create(
            ticket=ticket,
            agente_origen=request.user,
            agente_destino=agente_destino
        )

        # 📜 Registrar historial
        TicketHistory.objects.create(
            ticket=ticket,
            usuario=request.user,
            accion="Reasignación de ticket",
            descripcion=f"El ticket fue enviado a {agente_destino.username} para su aceptación."
        )

        serializer = TicketAssignmentSerializer(asignacion)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ============================================================
# 🟢 ACEPTAR ASIGNACIÓN
# ============================================================

class AcceptAssignmentView(APIView):
    """
    El agente destino acepta la reasignación del ticket.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            asignacion = TicketAssignment.objects.select_related("ticket", "agente_destino").get(pk=pk)
        except TicketAssignment.DoesNotExist:
            return Response({"detail": "Asignación no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        # Validar que el usuario actual sea el destinatario
        if asignacion.agente_destino != request.user:
            return Response({"detail": "No tienes permiso para aceptar esta asignación."},
                            status=status.HTTP_403_FORBIDDEN)

        if asignacion.ha_expirado():
            asignacion.estado = "expirada"
            asignacion.save()
            return Response({"detail": "La asignación ya expiró."}, status=status.HTTP_400_BAD_REQUEST)

        asignacion.estado = "aceptada"
        asignacion.save()

        # 📜 Historial
        TicketHistory.objects.create(
            ticket=asignacion.ticket,
            usuario=request.user,
            accion="Asignación aceptada",
            descripcion=f"El agente {request.user.username} aceptó el ticket reasignado."
        )

        return Response({"detail": "Ticket aceptado correctamente."}, status=status.HTTP_200_OK)


# ============================================================
# 🔴 RECHAZAR ASIGNACIÓN
# ============================================================

class RejectAssignmentView(APIView):
    """
    El agente destino rechaza la reasignación del ticket.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            asignacion = TicketAssignment.objects.select_related("ticket", "agente_origen").get(pk=pk)
        except TicketAssignment.DoesNotExist:
            return Response({"detail": "Asignación no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        if asignacion.agente_destino != request.user:
            return Response({"detail": "No puedes rechazar esta asignación."},
                            status=status.HTTP_403_FORBIDDEN)

        asignacion.estado = "rechazada"
        asignacion.save()

        TicketHistory.objects.create(
            ticket=asignacion.ticket,
            usuario=request.user,
            accion="Asignación rechazada",
            descripcion=f"El agente {request.user.username} rechazó el ticket reasignado."
        )

        return Response({"detail": "Ticket rechazado correctamente."}, status=status.HTTP_200_OK)


# ============================================================
# 🕒 VERIFICAR ASIGNACIONES EXPIRADAS
# ============================================================

class CheckExpiredAssignmentsView(APIView):
    """
    Verifica todas las asignaciones pendientes y marca como expiradas las que pasaron los 5 minutos.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        expiradas = TicketAssignment.objects.filter(
            estado="pendiente",
            fecha_limite_aceptacion__lt=timezone.now()
        )

        count = expiradas.count()
        for asignacion in expiradas:
            asignacion.estado = "expirada"
            asignacion.save()

            TicketHistory.objects.create(
                ticket=asignacion.ticket,
                usuario=asignacion.agente_origen,
                accion="Asignación expirada",
                descripcion=f"La reasignación del ticket a {asignacion.agente_destino.username} expiró sin respuesta."
            )

        return Response(
            {"detail": f"Se actualizaron {count} asignaciones expiradas."},
            status=status.HTTP_200_OK
        )
