from django.db.models.signals import post_save
from django.dispatch import receiver
from tickets.models import Ticket
from .models import Notification

@receiver(post_save, sender=Ticket)
def ticket_notification(sender, instance, created, **kwargs):
    if created:
        # Usa el campo correcto del modelo Ticket
        usuario = instance.solicitante
        message = f"El ticket '{instance.titulo}' ha sido creado por {usuario.username}."

        # Crea una notificación para el usuario (o para el admin, si lo deseas)
        Notification.objects.create(
            usuario=usuario,
            mensaje=message,
            tipo="ticket_creado"
        )
