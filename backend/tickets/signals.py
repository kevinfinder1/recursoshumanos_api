from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import TicketAssignment
from .models import TicketHistory


@receiver(post_save, sender=TicketAssignment)
def notify_assignment(sender, instance, created, **kwargs):
    channel_layer = get_channel_layer()
    data = {
        "id": instance.id,
        "ticket": instance.ticket.titulo,
        "estado": instance.estado,
        "mensaje": "Nueva asignación" if created else "Actualización de asignación"
    }

    # Notificar al agente destino
    async_to_sync(channel_layer.group_send)(
        f"user_{instance.agente_destino.id}",
        {"type": "send_notification", "content": data}
    )

@receiver(post_save, sender=TicketAssignment)
def log_assignment(sender, instance, created, **kwargs):
    accion = "Asignación creada" if created else f"Asignación {instance.estado}"
    TicketHistory.objects.create(
        ticket=instance.ticket,
        usuario=instance.agente_origen,
        accion=accion,
        descripcion=f"Ticket reasignado a {instance.agente_destino}"
    )