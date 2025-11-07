from celery import shared_task
from django.utils import timezone
from django.db import transaction
from tickets.models import TicketAssignment
from notifications.models import Notification

@shared_task
def expirar_reasignaciones():
    """
    Reasignaciones no aceptadas en 5 minutos vuelven al agente origen.
    """
    try:
        now = timezone.now()
        # Buscar asignaciones pendientes que hayan expirado
        expiradas = TicketAssignment.objects.filter(
            estado="pendiente", 
            fecha_limite_aceptacion__lt=now
        )
        
        count = expiradas.count()
        if count == 0:
            print("✅ No hay reasignaciones expiradas")
            return "No hay reasignaciones expiradas"
        
        print(f"🕒 Procesando {count} reasignaciones expiradas...")
        
        with transaction.atomic():
            for reasignacion in expiradas:
                # Actualizar el estado a expirada
                reasignacion.estado = "expirada"
                reasignacion.save(update_fields=["estado"])
                
                # El método save() del modelo ya se encarga de:
                # 1. apply_ticket_state() - que devuelve el ticket al agente_origen
                # 2. Crear el historial automáticamente
                
                # Crear notificación para el agente origen
                Notification.objects.create(
                    usuario=reasignacion.agente_origen,
                    tipo="ticket_asignado",
                    mensaje=f"La reasignación del ticket #{reasignacion.ticket.id} expiró. Vuelve a tu bandeja."
                )
                
                print(f"✅ Reasignación {reasignacion.id} expirada - Ticket devuelto a {reasignacion.agente_origen.username}")
        
        resultado = f"✅ Procesadas {count} reasignaciones expiradas"
        print(resultado)
        return resultado
        
    except Exception as e:
        error_msg = f"❌ Error en expirar_reasignaciones: {str(e)}"
        print(error_msg)
        # Re-lanza la excepción para que Celery la capture
        raise