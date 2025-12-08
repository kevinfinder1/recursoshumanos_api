from django.db import models
from django.conf import settings

class TicketHistory(models.Model):
    ticket = models.ForeignKey('Ticket', on_delete=models.CASCADE, related_name='historial')
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    accion = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    fecha = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Historial #{self.id} - {self.ticket.titulo} - {self.accion}"

    class Meta:
        ordering = ['-fecha']
        verbose_name_plural = 'Historial de tickets'