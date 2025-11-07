from rest_framework import viewsets, permissions, decorators, status
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
import logging

from tickets.models import Ticket, TicketAssignment, TicketHistory, TicketMessage
from tickets.serializers import (
    TicketSerializer,
    TicketHistorySerializer,
    TicketMessageSerializer,
    TicketAssignmentSerializer
)
from tickets.serializers.message_serializers import TicketMessageCreateSerializer

User = get_user_model()
logger = logging.getLogger(__name__)

# ============================================================
# 🔔 Función global: Enviar notificaciones por WebSocket
# ============================================================
def enviar_notificacion_global(titulo, mensaje, tipo="info", usuario_especifico=None, ticket_id=None):
    """
    Envía notificaciones a través de WebSocket a un usuario específico o a todos los agentes.
    """
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            logger.warning("❌ Channel layer no disponible")
            return

        payload = {
            "type": "send_notification",
            "content": {
                "title": titulo,
                "message": mensaje,
                "tipo": tipo,
                "timestamp": str(timezone.now()),
                "ticket_id": ticket_id,
            },
        }

        # Notificación a usuario específico
        if usuario_especifico:
            async_to_sync(channel_layer.group_send)(
                f"user_{usuario_especifico.id}",
                payload
            )

        # Notificación a grupo de agentes
        async_to_sync(channel_layer.group_send)("agentes", payload)

        # Notificación broadcast
        async_to_sync(channel_layer.group_send)("broadcast", payload)

    except Exception as e:
        logger.error(f"❌ Error enviando notificaciones: {e}")

# ============================================================
# 🎯 VISTA PRINCIPAL DEL AGENTE
# ============================================================
class TicketAgentViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        ✅ Muestra los tickets donde el usuario es agente o solicitante.
        Así el agente que crea un ticket también lo ve en su bandeja.
        """
        user = self.request.user
        return (
            Ticket.objects.filter(Q(agente=user) | Q(solicitante=user))
            .distinct()
            .order_by("-fecha_actualizacion")
        )

    def perform_create(self, serializer):
        agente_asignado = self.request.data.get("agente")

        with transaction.atomic():
            ticket = serializer.save(solicitante=self.request.user)

            if agente_asignado:
                try:
                    agente_destino = User.objects.get(id=agente_asignado)

                    TicketAssignment.objects.create(
                        ticket=ticket,
                        agente_origen=self.request.user,
                        agente_destino=agente_destino,
                    )

                    ticket.agente = agente_destino
                    ticket.estado = "En Proceso"
                    ticket.save(update_fields=["agente", "estado"])

                    TicketHistory.objects.create(
                        ticket=ticket,
                        usuario=self.request.user,
                        accion="Creación y asignación",
                        descripcion=f"Ticket asignado a {agente_destino.username}.",
                    )

                    enviar_notificacion_global(
                        titulo="🎫 Nuevo Ticket Asignado",
                        mensaje=f"Se te ha asignado el ticket #{ticket.id}: {ticket.titulo}",
                        tipo="ticket_creado",
                        usuario_especifico=agente_destino,
                        ticket_id=ticket.id,
                    )

                except User.DoesNotExist:
                    TicketHistory.objects.create(
                        ticket=ticket,
                        usuario=self.request.user,
                        accion="Creación sin asignación",
                        descripcion="No se pudo asignar el ticket a ningún agente.",
                    )
            else:
                TicketHistory.objects.create(
                    ticket=ticket,
                    usuario=self.request.user,
                    accion="Creación de ticket",
                    descripcion="Ticket creado sin asignación inicial.",
                )

    @decorators.action(detail=True, methods=["get"])
    def detalle(self, request, pk=None):
        ticket = self.get_object()
        historial = TicketHistory.objects.filter(ticket=ticket).order_by("-fecha")
        historial_serializer = TicketHistorySerializer(historial, many=True)
        ticket_serializer = TicketSerializer(ticket)
        return Response({
            "ticket": ticket_serializer.data,
            "historial": historial_serializer.data
        })

    @decorators.action(detail=True, methods=["post"])
    def reasignar_ticket(self, request, pk=None):
        ticket = self.get_object()
        nuevo_agente_id = request.data.get("nuevo_agente")

        if not nuevo_agente_id:
            return Response({"error": "Debes especificar el ID del nuevo agente."}, status=400)

        try:
            nuevo_agente = User.objects.get(id=nuevo_agente_id)
        except User.DoesNotExist:
            return Response({"error": "El agente especificado no existe."}, status=404)

        with transaction.atomic():
            TicketAssignment.objects.create(
                ticket=ticket,
                agente_origen=request.user,
                agente_destino=nuevo_agente,
            )

            ticket.agente = nuevo_agente
            ticket.save(update_fields=["agente"])

            TicketHistory.objects.create(
                ticket=ticket,
                usuario=request.user,
                accion="Reasignación de ticket",
                descripcion=f"Ticket reasignado a {nuevo_agente.username}.",
            )

            enviar_notificacion_global(
                titulo="🔁 Ticket Reasignado",
                mensaje=f"Ahora eres responsable del ticket #{ticket.id}: {ticket.titulo}.",
                tipo="ticket_asignado",
                usuario_especifico=nuevo_agente,
                ticket_id=ticket.id,
            )

        serializer = TicketAssignmentSerializer(ticket)
        return Response({
            "mensaje": f"Ticket reasignado correctamente a {nuevo_agente.username}.",
            "asignacion": serializer.data
        }, status=status.HTTP_200_OK)

    @decorators.action(detail=True, methods=["get"])
    def historial(self, request, pk=None):
        ticket = self.get_object()
        historial = TicketHistory.objects.filter(ticket=ticket).order_by("-fecha")
        serializer = TicketHistorySerializer(historial, many=True)
        return Response(serializer.data)

    # ============================================================
    # 🗑️ ELIMINAR TICKET
    # ============================================================
    @decorators.action(detail=True, methods=["delete"], url_path="eliminar_ticket")
    def eliminar_ticket(self, request, pk=None):
        """
        🔒 Permite eliminar un ticket solo si el usuario es su solicitante.
        Envía una notificación al agente asignado.
        """
        try:
            ticket = Ticket.objects.get(pk=pk)
        except Ticket.DoesNotExist:
            return Response({"error": "Ticket no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        # Solo el solicitante puede borrar su propio ticket
        if ticket.solicitante != request.user:
            return Response({"error": "No tienes permiso para eliminar este ticket."}, status=status.HTTP_403_FORBIDDEN)

        ticket_id = ticket.id
        titulo = ticket.titulo
        agente = ticket.agente
        solicitante = ticket.solicitante

        ticket.delete()

        # 🔔 Notificar vía WebSocket
        channel_layer = get_channel_layer()
        notification_data = {
            "type": "enviar_notificacion",
            "content": {
                "type": "notification",
                "message": f"🗑️ El ticket #{ticket_id} ('{titulo}') fue eliminado por {solicitante.username}.",
                "ticket_id": ticket_id,
                "accion": "ticket_eliminado",
            },
        }

        if agente:
            async_to_sync(channel_layer.group_send)(f"user_{agente.id}", notification_data)
        async_to_sync(channel_layer.group_send)(f"user_{solicitante.id}", notification_data)

        return Response(
            {"mensaje": f"Ticket #{ticket_id} eliminado correctamente."},
            status=status.HTTP_200_OK
        )

# ============================================================
# 🆕 CAMBIAR ESTADO DE TICKET
# ============================================================
class CambiarEstadoTicketView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        try:
            ticket = Ticket.objects.get(id=pk, agente=request.user)
        except Ticket.DoesNotExist:
            return Response({"error": "Ticket no encontrado o no tienes permisos."}, status=404)

        nuevo_estado = request.data.get("estado")
        if nuevo_estado not in dict(Ticket.ESTADO_CHOICES):
            return Response({"error": "Estado inválido."}, status=400)

        with transaction.atomic():
            estado_anterior = ticket.estado
            ticket.estado = nuevo_estado
            ticket.save(update_fields=["estado", "fecha_actualizacion"])

            TicketHistory.objects.create(
                ticket=ticket,
                usuario=request.user,
                accion="Cambio de Estado",
                descripcion=f"Estado cambiado de '{estado_anterior}' a '{nuevo_estado}'"
            )

            if nuevo_estado in ["En Proceso", "Resuelto"]:
                enviar_notificacion_global(
                    titulo=f"📊 Estado Actualizado - Ticket #{ticket.id}",
                    mensaje=f"El ticket '{ticket.titulo}' ahora está '{nuevo_estado}'",
                    tipo="estado_ticket",
                    usuario_especifico=ticket.solicitante,
                    ticket_id=ticket.id
                )

        return Response({
            "mensaje": f"Estado actualizado a '{nuevo_estado}'",
            "ticket_id": ticket.id,
            "estado_anterior": estado_anterior,
            "estado_nuevo": nuevo_estado
        }, status=200)

# ============================================================
# 💬 MENSAJES (CHAT)
# ============================================================
class TicketMensajesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):
        """Obtener mensajes del ticket"""
        try:
            ticket = Ticket.objects.get(id=pk)
            if not (request.user == ticket.agente or request.user == ticket.solicitante):
                return Response({"error": "No tienes permisos para ver este chat."}, status=403)
        except Ticket.DoesNotExist:
            return Response({"error": "Ticket no encontrado."}, status=404)

        mensajes = TicketMessage.objects.filter(ticket=ticket).order_by("fecha_envio")
        serializer = TicketMessageSerializer(mensajes, many=True)

        return Response({
            "ticket_id": ticket.id,
            "estado": ticket.estado,
            "chat_habilitado": ticket.estado == "En Proceso",
            "mensajes": serializer.data
        })

    def post(self, request, pk=None):
        """Enviar mensaje en el ticket"""
        logger.info(f"📨 Enviando mensaje para ticket {pk}")

        try:
            ticket = Ticket.objects.get(id=pk)
            if ticket.estado != "En Proceso":
                return Response({
                    "error": "El chat solo está disponible cuando el ticket está 'En Proceso'."
                }, status=400)
            if not (request.user == ticket.agente or request.user == ticket.solicitante):
                return Response({
                    "error": "No tienes permisos para enviar mensajes en este ticket."
                }, status=403)
        except Ticket.DoesNotExist:
            return Response({"error": "Ticket no encontrado."}, status=404)

        serializer = TicketMessageCreateSerializer(data=request.data)
        if serializer.is_valid():
            with transaction.atomic():
                mensaje = serializer.save(ticket=ticket, autor=request.user)
                destinatario = (
                    ticket.solicitante if request.user == ticket.agente else ticket.agente
                )

                enviar_notificacion_global(
                    titulo=f"💬 Nuevo mensaje - Ticket #{ticket.id}",
                    mensaje=f"{request.user.username}: {mensaje.contenido[:50]}...",
                    tipo="nuevo_mensaje",
                    usuario_especifico=destinatario,
                    ticket_id=ticket.id,
                )

                ticket.fecha_actualizacion = timezone.now()
                ticket.save(update_fields=["fecha_actualizacion"])

            response_serializer = TicketMessageSerializer(mensaje)
            return Response(response_serializer.data, status=201)
        else:
            return Response({
                "error": "Datos inválidos",
                "detalles": serializer.errors
            }, status=400)

# ============================================================
# 👥 LISTA DE AGENTES DISPONIBLES
# ============================================================
class AgentesDisponiblesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Listar agentes disponibles para reasignación"""
        agentes = User.objects.filter(
            role__in=[
                "agente", "agente_nomina", "agente_certificados",
                "agente_transporte", "agente_epps", "agente_tca", "admin"
            ]
        ).exclude(id=request.user.id)

        agentes_data = []
        for agente in agentes:
            tickets_asignados = Ticket.objects.filter(
                agente=agente, estado="En Proceso"
            ).count()

            agentes_data.append({
                "id": agente.id,
                "username": agente.username,
                "email": agente.email,
                "role": agente.get_role_display(),
                "tickets_activos": tickets_asignados,
                "carga_trabajo": "Alta" if tickets_asignados > 5 else "Media" if tickets_asignados > 2 else "Baja"
            })

        return Response({
            "count": len(agentes_data),
            "agentes": agentes_data
        })
