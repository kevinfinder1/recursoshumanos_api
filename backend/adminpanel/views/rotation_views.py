from django.core.mail import send_mail
from django.conf import settings
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

    def perform_update(self, serializer):
        """
        Al actualizar, verificamos si la rotación pasa a estado 'ejecutada'.
        Si es así, enviamos las notificaciones por correo.
        """
        # Estado previo antes de guardar
        prev_ejecutada = serializer.instance.ejecutada
        
        rotacion = serializer.save()
        
        # Si cambió de False a True, enviamos correos
        if not prev_ejecutada and rotacion.ejecutada:
            self.enviar_notificacion_rotacion(rotacion)

    def enviar_notificacion_rotacion(self, rotacion):
        """
        Envía correo al admin y a los agentes involucrados.
        """
        subject = f"Notificación: Rotación de Personal Ejecutada (ID: {rotacion.id})"
        message = (
            f"Se informa que se ha ejecutado la siguiente rotación de personal:\n\n"
            f"Agente Saliente: {rotacion.agente.username if rotacion.agente else 'N/A'}\n"
            f"Agente Entrante: {rotacion.agente_reemplazo.username if rotacion.agente_reemplazo else 'N/A'}\n"
            f"Fecha de Inicio: {rotacion.fecha_inicio}\n\n"
            f"Acción realizada por: {self.request.user.username}"
        )

        recipients = set()
        if self.request.user.email:
            recipients.add(self.request.user.email)
        if rotacion.agente and rotacion.agente.email:
            recipients.add(rotacion.agente.email)
        if rotacion.agente_reemplazo and rotacion.agente_reemplazo.email:
            recipients.add(rotacion.agente_reemplazo.email)

        if recipients:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                list(recipients),
                fail_silently=True
            )
