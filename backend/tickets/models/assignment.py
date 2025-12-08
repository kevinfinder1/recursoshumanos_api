from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

def default_fecha_limite():
    return timezone.now() + timedelta(minutes=5)

class TicketAssignment(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aceptada', 'Aceptada'), 
        ('rechazada', 'Rechazada'),
        ('expirada', 'Expirada'),
    ]

    ticket = models.ForeignKey('Ticket', on_delete=models.CASCADE, related_name='asignaciones')
    agente_origen = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='asignaciones_enviadas'
    )
    agente_destino = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='asignaciones_recibidas'
    )
    
    fecha_envio = models.DateTimeField(auto_now_add=True)
    fecha_limite_aceptacion = models.DateTimeField(default=default_fecha_limite)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def ha_expirado(self):
        return timezone.now() > self.fecha_limite_aceptacion and self.estado == 'pendiente'

    def __str__(self):
        return f"Asignación #{self.id} - {self.ticket.titulo} → {self.agente_destino.username}"

    class Meta:
        ordering = ['-fecha_envio']