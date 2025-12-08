from celery import shared_task
from tickets.services.assignment_service import AssignmentService
import logging

logger = logging.getLogger(__name__)

@shared_task
def asignar_tickets_pendientes():
    """
    Asigna automáticamente tickets que están en estado 'Pendiente de Asignación'
    cada minuto.
    """
    try:
        asignados = AssignmentService.procesar_tickets_pendientes()

        if not asignados:
            logger.info("⏳ No hay tickets pendientes para asignar")
            return "Sin tickets pendientes"

        logger.info(f"🔄 Tickets asignados automáticamente: {asignados}")
        return asignados

    except Exception as e:
        logger.error(f"❌ Error asignando tickets pendientes: {str(e)}")
        return {"error": str(e)}
