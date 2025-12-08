from tickets.models import Ticket
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=Ticket)
def gestionar_participantes_del_chat(sender, instance, created, **kwargs):
    """
    Asegura que la sala de chat exista y que tanto el solicitante como el agente
    (si está asignado) sean participantes.
    Se ejecuta cada vez que se guarda un ticket para cubrir todos los casos.
    """
    from chat.models import ChatRoom
    # Paso 1: Asegurarse de que la sala de chat exista.
    chat_room, room_created = ChatRoom.objects.get_or_create(ticket=instance)

    # Paso 2: Asegurarse de que el solicitante esté en el chat.
    if instance.solicitante and not chat_room.participants.filter(id=instance.solicitante.id).exists():
        chat_room.participants.add(instance.solicitante)
        print(f"✅ Solicitante {instance.solicitante.username} añadido al chat del ticket #{instance.id}.")

    # Paso 3: Asegurarse de que el agente (si está asignado) esté en el chat.
    if instance.agente and not chat_room.participants.filter(id=instance.agente.id).exists():
        chat_room.participants.add(instance.agente)
        print(f"✅ Agente {instance.agente.username} añadido al chat del ticket #{instance.id}.")