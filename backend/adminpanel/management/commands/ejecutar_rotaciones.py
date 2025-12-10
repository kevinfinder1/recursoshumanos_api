# backend/adminpanel/management/commands/ejecutar_rotaciones.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from adminpanel.models import RotacionProgramada, SystemLog
from tickets.models import Ticket, TicketHistory

class Command(BaseCommand):
    help = 'Ejecuta las rotaciones de personal programadas para el día de hoy y transfiere tickets.'

    def handle(self, *args, **kwargs):
        hoy = timezone.now().date()
        self.stdout.write(f"🔄 Iniciando proceso de rotación para la fecha: {hoy}")

        # Buscar rotaciones programadas para HOY (o antes) que no se hayan ejecutado
        rotaciones = RotacionProgramada.objects.filter(
            fecha_inicio__lte=hoy,
            ejecutada=False
        )

        if not rotaciones.exists():
            self.stdout.write("✅ No hay rotaciones programadas para hoy.")
            return

        for rotacion in rotaciones:
            try:
                with transaction.atomic():
                    agente = rotacion.agente
                    nuevo_rol = rotacion.rol_destino
                    reemplazo = rotacion.agente_reemplazo
                    rol_anterior = agente.rol

                    self.stdout.write(f"   👤 Procesando agente: {agente.username} ({rol_anterior} -> {nuevo_rol})")

                    # 1. CAMBIO DE ROL
                    agente.rol = nuevo_rol
                    agente.save()

                    # 2. TRANSFERENCIA DE TICKETS (Solo abiertos/en proceso)
                    # Excluimos 'Resuelto' y 'Cerrado' (o como se llamen en tu sistema)
                    tickets_activos = Ticket.objects.filter(
                        agente=agente
                    ).exclude(
                        estado__in=['Resuelto', 'Cerrado', 'Cancelado']
                    )
                    
                    total_tickets = tickets_activos.count()

                    if total_tickets > 0 and reemplazo:
                        # Actualizar el agente de los tickets
                        tickets_activos.update(agente=reemplazo)

                        # Dejar constancia en el historial de cada ticket
                        for ticket in tickets_activos:
                            TicketHistory.objects.create(
                                ticket=ticket,
                                usuario=None, # Sistema
                                accion="Reasignación Automática",
                                descripcion=f"Por rotación de personal: {agente.username} -> {reemplazo.username}"
                            )
                        
                        msg_transferencia = f"Se transfirieron {total_tickets} tickets activos a {reemplazo.username}."
                    else:
                        msg_transferencia = "No había tickets activos para transferir."

                    # 3. REGISTRAR LOG DEL SISTEMA
                    SystemLog.objects.create(
                        usuario=None, # Sistema
                        accion="ROLE_CHANGE",
                        descripcion=(
                            f"ROTACIÓN AUTOMÁTICA: {agente.username} cambió de {rol_anterior} a {nuevo_rol}. "
                            f"{msg_transferencia}"
                        )
                    )

                    # 4. MARCAR COMO EJECUTADA
                    rotacion.ejecutada = True
                    rotacion.save()

                    self.stdout.write(self.style.SUCCESS(f"      ✅ Éxito: {agente.username} ahora es {nuevo_rol}. {msg_transferencia}"))

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"      ❌ Error procesando a {rotacion.agente.username}: {str(e)}"))

        self.stdout.write(self.style.SUCCESS("🏁 Proceso de rotación finalizado."))
