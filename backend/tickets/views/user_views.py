from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.utils.timezone import now
from datetime import timedelta
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from tickets.models import Ticket
from tickets.serializers import TicketSerializer
from notifications.models import Notification  # ✅ Import agregado correctamente

User = get_user_model()


class TicketUserViewSet(viewsets.ModelViewSet):
    """
    Vista del usuario solicitante (frontend del usuario normal).
    Permite:
      ✅ Crear tickets
      ✅ Editar (solo en los primeros 5 minutos si sigue abierto)
      ✅ Eliminar (si no está en proceso)
    """
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    # --- CREAR ---
    def perform_create(self, serializer):
        solicitante = self.request.user
        ticket = serializer.save(solicitante=solicitante)

        # --- Asignar primer agente disponible ---
        agente = User.objects.filter(role="agente").first()
        if agente:
            ticket.agente = agente
            ticket.save()

        # --- Crear notificaciones ---
        try:
            Notification.objects.create(
                usuario=solicitante,
                mensaje=f"🎫 Has creado el ticket '{ticket.titulo}'.",
                tipo="ticket_creado",
            )

            if agente:
                Notification.objects.create(
                    usuario=agente,
                    mensaje=f"🧑‍💼 Se te asignó el ticket '{ticket.titulo}' de {solicitante.username}.",
                    tipo="ticket_asignado",
                )

            admin = User.objects.filter(is_superuser=True).first()
            if admin:
                Notification.objects.create(
                    usuario=admin,
                    mensaje=f"📢 Nuevo ticket '{ticket.titulo}' creado por {solicitante.username}.",
                    tipo="ticket_nuevo_admin",
                )
        except Exception as e:
            print(f"[ERROR] No se pudieron crear notificaciones: {e}")

        # --- Enviar WebSocket ---
        try:
            channel_layer = get_channel_layer()

            async_to_sync(channel_layer.group_send)(
                f"user_{solicitante.id}",
                {
                    "type": "send_notification",
                    "content": {
                        "mensaje": f"🎫 Has creado el ticket '{ticket.titulo}'.",
                        "tipo": "ticket_creado",
                    },
                },
            )

            if agente:
                async_to_sync(channel_layer.group_send)(
                    f"user_{agente.id}",
                    {
                        "type": "send_notification",
                        "content": {
                            "mensaje": f"🧑‍💼 Se te asignó el ticket '{ticket.titulo}' de {solicitante.username}.",
                            "tipo": "ticket_asignado",
                        },
                    },
                )

            if admin:
                async_to_sync(channel_layer.group_send)(
                    f"user_{admin.id}",
                    {
                        "type": "send_notification",
                        "content": {
                            "mensaje": f"📢 Nuevo ticket '{ticket.titulo}' creado por {solicitante.username}.",
                            "tipo": "ticket_nuevo_admin",
                        },
                    },
                )
        except Exception as e:
            print(f"[ERROR] WebSocket no enviado: {e}")

        return ticket

    # --- EDITAR ---
    def update(self, request, *args, **kwargs):
        ticket = self.get_object()

        if ticket.solicitante != request.user:
            return Response(
                {"error": "🚫 No tienes permiso para editar este ticket."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Solo editar si han pasado menos de 5 minutos y está "Abierto"
        tiempo_transcurrido = now() - ticket.fecha_creacion
        if tiempo_transcurrido > timedelta(minutes=5):
            return Response(
                {"error": "⏰ No puedes editar este ticket. El límite de 5 minutos expiró."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if ticket.estado.lower() != "abierto":
            return Response(
                {"error": "⚠️ Solo puedes editar tickets en estado 'Abierto'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response = super().update(request, *args, **kwargs)

        # --- Notificaciones ---
        agente = ticket.agente
        admin = User.objects.filter(is_superuser=True).first()
        channel_layer = get_channel_layer()

        if agente:
            async_to_sync(channel_layer.group_send)(
                f"user_{agente.id}",
                {
                    "type": "send_notification",
                    "content": {
                        "mensaje": f"✏️ El ticket '{ticket.titulo}' fue editado por {request.user.username}.",
                        "tipo": "ticket_editado",
                    },
                },
            )

        if admin:
            async_to_sync(channel_layer.group_send)(
                f"user_{admin.id}",
                {
                    "type": "send_notification",
                    "content": {
                        "mensaje": f"✏️ El ticket '{ticket.titulo}' fue editado por {request.user.username}.",
                        "tipo": "ticket_editado_admin",
                    },
                },
            )

        return response

    # --- ELIMINAR ---
    def destroy(self, request, *args, **kwargs):
        ticket = self.get_object()

        if ticket.solicitante != request.user:
            return Response(
                {"error": "🚫 No tienes permiso para eliminar este ticket."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if ticket.estado.lower() == "en proceso":
            return Response(
                {"error": "⛔ No puedes eliminar un ticket que ya está en proceso."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        titulo = ticket.titulo
        response = super().destroy(request, *args, **kwargs)

        agente = ticket.agente
        admin = User.objects.filter(is_superuser=True).first()
        channel_layer = get_channel_layer()

        if agente:
            async_to_sync(channel_layer.group_send)(
                f"user_{agente.id}",
                {
                    "type": "send_notification",
                    "content": {
                        "mensaje": f"🗑️ El ticket '{titulo}' fue eliminado por el usuario.",
                        "tipo": "ticket_eliminado",
                    },
                },
            )

        if admin:
            async_to_sync(channel_layer.group_send)(
                f"user_{admin.id}",
                {
                    "type": "send_notification",
                    "content": {
                        "mensaje": f"🗑️ El ticket '{titulo}' fue eliminado por {request.user.username}.",
                        "tipo": "ticket_eliminado_admin",
                    },
                },
            )

        return response
