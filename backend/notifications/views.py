from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """
    Endpoints para manejar notificaciones del usuario autenticado.
    
    - GET /api/notifications/               → lista de notificaciones del usuario
    - POST /api/notifications/mark_all_read/ → marcar todas como leídas
    - POST /api/notifications/clear_all/     → eliminar todas las notificaciones
    - POST /api/notifications/{id}/mark_read/ → marcar una notificación como leída
    - DELETE /api/notifications/{id}/        → eliminar una notificación específica
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "id"

    def get_queryset(self):
        """
        Devuelve las notificaciones del usuario autenticado.
        Si el usuario no está autenticado, retorna un queryset vacío.
        """
        user = self.request.user
        if user.is_anonymous:
            return Notification.objects.none()
        return Notification.objects.filter(usuario=user).order_by('-fecha_creacion')

    @action(detail=False, methods=['post'], url_path='mark_all_read')
    def mark_all_read(self, request):
        """
        Marca todas las notificaciones del usuario como leídas.
        """
        qs = self.get_queryset()
        updated = qs.update(leida=True)
        return Response(
            {"status": "ok", "message": f"{updated} notificaciones marcadas como leídas"},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['post'], url_path='clear_all')
    def clear_all(self, request):
        """
        Elimina todas las notificaciones del usuario autenticado.
        """
        qs = self.get_queryset()
        deleted_count, _ = qs.delete()
        return Response(
            {"status": "ok", "deleted": deleted_count},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='mark_read')
    def mark_read(self, request, id=None):
        """
        Marca una notificación específica como leída.
        """
        try:
            notif = self.get_object()
            notif.leida = True
            notif.save(update_fields=['leida'])
            return Response(
                {"status": "ok", "message": "Notificación marcada como leída"},
                status=status.HTTP_200_OK
            )
        except Notification.DoesNotExist:
            return Response(
                {"error": "Notificación no encontrada"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": f"Error al marcar como leída: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
