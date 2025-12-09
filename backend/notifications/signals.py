from django.db.models.signals import post_save, post_delete, m2m_changed
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from tickets.models import Ticket
from .models import Notification
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def send_notification_websocket(user_id, notification_data, broadcast=False):
    """Envía notificación a través de WebSocket al usuario. Si broadcast=True, también la envía a 'broadcast'."""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{user_id}",
            {
                "type": "send_notification",
                "content": notification_data
            }
        )
        if broadcast:
            # Enviar solo si realmente queremos broadcast global
            async_to_sync(channel_layer.group_send)(
                "broadcast",
                {
                    "type": "send_notification",
                    "content": notification_data
                }
            )
    except Exception as e:
        print(f"Error enviando notificación WebSocket: {e}")


@receiver(post_save, sender=Ticket)
def ticket_notification(sender, instance, created, **kwargs):
    User = get_user_model()
    usuarios_a_notificar = []

    if created:
        # 1. Notificación al solicitante
        usuarios_a_notificar.append(instance.solicitante)
        
        # 2. Notificación a todos los administradores/agentes
        admin_users = User.objects.filter(
            rol__tipo_base__in=['admin', 'agente', 'solicitante']
        ).distinct()
        usuarios_a_notificar.extend(admin_users)
        
        tipo = "ticket_creado"
        mensaje_solicitante = f"Tu ticket '{instance.titulo}' ha sido creado exitosamente."
        mensaje_admin = f"Nuevo ticket creado por {instance.solicitante.username}: '{instance.titulo}'"
        
    else:
        # Actualización de ticket existente
        old_instance = Ticket.objects.filter(id=instance.id).first()
        if not old_instance:
            return
            
        # Detectar cambios específicos
        if instance.estado != old_instance.estado:
            if instance.estado == 'cerrado':
                tipo = "ticket_cerrado"
                mensaje = f"El ticket '{instance.titulo}' ha sido cerrado."
                usuarios_a_notificar = [instance.solicitante, instance.agente] if instance.agente else [instance.solicitante]
            elif instance.estado == 'resuelto':
                tipo = "ticket_cerrado"  # Puedes crear otro tipo si quieres
                mensaje = f"El ticket '{instance.titulo}' ha sido resuelto."
                usuarios_a_notificar = [instance.solicitante, instance.agente] if instance.agente else [instance.solicitante]
            else:
                tipo = "ticket_actualizado"
                mensaje = f"El estado del ticket '{instance.titulo}' cambió a {instance.estado}."
                usuarios_a_notificar = [instance.solicitante, instance.agente] if instance.agente else [instance.solicitante]
                
        elif instance.agente != old_instance.agente:
            if instance.agente:
                tipo = "ticket_asignado"
                mensaje = f"El ticket '{instance.titulo}' te ha sido asignado."
                usuarios_a_notificar = [instance.agente]
                
                # También notificar al solicitante si quieres
                Notification.objects.create(
                    usuario=instance.solicitante,
                    mensaje=f"Tu ticket '{instance.titulo}' ha sido asignado a {instance.agente.username}.",
                    tipo="ticket_asignado",
                    ticket=instance
                )
                send_notification_websocket(
                    instance.solicitante.id,
                    {
                        "type": "ticket_asignado",
                        "message": f"Tu ticket '{instance.titulo}' ha sido asignado a {instance.agente.username}.",
                        "ticket_id": instance.id
                    }
                )
            else:
                tipo = "ticket_reasignado"
                mensaje = f"El ticket '{instance.titulo}' ha sido desasignado."
                usuarios_a_notificar = [old_instance.agente]
        else:
            # Cambio genérico (descripción, prioridad, etc.)
            tipo = "ticket_actualizado"
            mensaje = f"El ticket '{instance.titulo}' ha sido actualizado."
            usuarios_a_notificar = [instance.solicitante, instance.agente] if instance.agente else [instance.solicitante]
    
    # Crear notificaciones para cada usuario
    for usuario in set(usuarios_a_notificar):  # set para eliminar duplicados
        if usuario:  # Verificar que el usuario no sea None
            if created and usuario == instance.solicitante:
                mensaje_usuario = mensaje_solicitante
            elif created:
                mensaje_usuario = mensaje_admin
                tipo_usuario = "ticket_nuevo_admin"
            else:
                mensaje_usuario = mensaje
                tipo_usuario = tipo

            # Evitar duplicados: si ya existe una notificación igual, saltarla.
            exists = Notification.objects.filter(
                usuario=usuario,
                ticket=instance,
                tipo=tipo_usuario
            ).exists()
            if exists:
                # Ya existe una notificación similar (probablemente creada por el servicio),
                # evitamos crearla de nuevo.
                continue

            notif = Notification.objects.create(
                usuario=usuario,
                mensaje=mensaje_usuario,
                tipo=tipo_usuario,
                ticket=instance
            )

            # Enviar por WebSocket (solo al usuario)
            send_notification_websocket(
                usuario.id,
                {
                    "type": tipo_usuario,
                    "message": mensaje_usuario,
                    "ticket_id": instance.id,
                    "notification_id": notif.id
                }
            )


@receiver(post_delete, sender=Ticket)
def ticket_deleted_notification(sender, instance, **kwargs):
    """Notificación cuando se elimina un ticket"""
    usuarios_a_notificar = [instance.solicitante]
    if instance.agente:
        usuarios_a_notificar.append(instance.agente)
    
    for usuario in usuarios_a_notificar:
        if usuario:
            notif = Notification.objects.create(
                usuario=usuario,
                mensaje=f"El ticket '{instance.titulo}' ha sido eliminado.",
                tipo="ticket_eliminado",
                ticket=None  # El ticket ya no existe
            )
            
            send_notification_websocket(
                usuario.id,
                {
                    "type": "ticket_eliminado",
                    "message": f"El ticket '{instance.titulo}' ha sido eliminado.",
                    "ticket_id": None
                }
            )


# Señal para notificar sobre nuevos comentarios (usando TicketHistory)
from tickets.models import TicketHistory

@receiver(post_save, sender=TicketHistory)
def comentario_notification(sender, instance, created, **kwargs):
    # Solo actuar si es una nueva entrada de historial y es de tipo 'comentario'
    if created and instance.ticket and instance.accion == 'comentario':
        ticket = instance.ticket
        usuarios_a_notificar = []
        
        # 1. Notificar al solicitante (si no es quien comentó)
        if ticket.solicitante and instance.usuario != ticket.solicitante:
            usuarios_a_notificar.append(ticket.solicitante)
        
        # 2. Notificar al agente (si existe y no es quien comentó)
        if ticket.agente and instance.usuario != ticket.agente:
            usuarios_a_notificar.append(ticket.agente)
        
        # Usar un set para evitar notificaciones duplicadas si un usuario cumple varios roles
        for usuario in set(usuarios_a_notificar):
            if usuario:
                mensaje = f"Nuevo comentario de {instance.usuario.username} en el ticket: '{ticket.titulo}'"
                notif = Notification.objects.create(
                    usuario=usuario,
                    mensaje=mensaje,
                    tipo="ticket_actualizado",
                    ticket=ticket
                )
                
                # Enviar notificación por WebSocket
                send_notification_websocket(
                    usuario.id,
                    {
                        "type": "comentario_agregado",
                        "message": mensaje,
                        "ticket_id": ticket.id,
                        "comment_author": instance.usuario.username,
                        "notification_id": notif.id
                    }
                )