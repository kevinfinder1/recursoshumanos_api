from django.db import models
from django.conf import settings

class Notification(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notificaciones"
    )
    mensaje = models.TextField()
    tipo = models.CharField(
        max_length=50,
        default="general",
        choices=[
            ("general", "General"),
            ("ticket_creado", "Ticket Creado"),
            ("ticket_asignado", "Ticket Asignado"),
            ("ticket_nuevo_admin", "Nuevo Ticket (Admin)"),
            ("sistema", "Sistema"),
        ]
    )
    leida = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notificación para {self.usuario.username}: {self.mensaje[:40]}..."

    class Meta:
        ordering = ["-fecha_creacion"]
