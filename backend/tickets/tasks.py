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
        # ❌ ELIMINAR ESTA LÍNEA TEMPORAL:
        # print("✅ Tarea expirar_reasignaciones ejecutándose (modo prueba)")
        # return "Tarea en modo prueba - migraciones en progreso"
        
        # ✅ DEJAR SOLO EL CÓDIGO ORIGINAL:
        now = timezone.now()
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
                reasignacion.estado = "expirada"
                reasignacion.save(update_fields=["estado"])
                
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
        raise