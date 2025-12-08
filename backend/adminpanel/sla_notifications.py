# adminpanel/sla_notifications.py

from django.utils import timezone
from django.db import transaction
from django.db.models import Prefetch

from tickets.models import Ticket, TicketHistory
from users.models import User
from notifications.utils import send_notification
from .views_sla import SLA_CONFIG  # Diccionario de SLA por categoría


def verificar_sla_y_enviar_notificaciones():
    """
    Recorre todos los tickets, evalúa SLA (FRT + MTTR)
    y envía notificaciones a admins, agentes y usuarios.
    
    Recomendado ejecutar cada 5–10 minutos:
    - Cron
    - Celery Beat
    - Management command
    """

    ahora = timezone.now()

    # Prefetch optimizado para evitar 2000 queries
    tickets = Ticket.objects.select_related(
        "categoria_principal",
        "agente",
        "solicitante"
    ).prefetch_related(
        Prefetch("historial", queryset=TicketHistory.objects.order_by("fecha"))
    )

    admins = list(User.objects.filter(rol__tipo_base="admin"))

    contador_riesgo = 0
    contador_incumplidos = 0

    for t in tickets:
        categoria = t.categoria_principal

        # Verificar si esta categoría tiene configuración SLA
        sla = SLA_CONFIG.get(categoria.nombre)

        if not sla:
            continue  # No existe SLA para esta categoría
        
        # =====================================================
        # 1️⃣ TIEMPO DE PRIMERA RESPUESTA (FRT)
        # =====================================================
        primer_historial = None

        for h in t.historial.all():
            if "Proceso" in h.accion:
                primer_historial = h
                break

        if primer_historial:
            frt_min = (primer_historial.fecha - t.fecha_creacion).total_seconds() / 60
        else:
            frt_min = None  # Aún sin respuesta

        # =====================================================
        # 2️⃣ TIEMPO DE RESOLUCIÓN (MTTR)
        # =====================================================
        if t.estado == "Resuelto" and t.fecha_actualizacion:
            mttr_horas = (t.fecha_actualizacion - t.fecha_creacion).total_seconds() / 3600
        else:
            mttr_horas = None

        # =====================================================
        # 3️⃣ DETECTAR INCUMPLIMIENTO (BREACH)
        # =====================================================
        frt_breach = frt_min is not None and frt_min > sla["respuesta_min"]
        mttr_breach = mttr_horas is not None and mttr_horas > sla["resolucion_horas"]

        hay_brecha = frt_breach or mttr_breach

        # =====================================================
        # 4️⃣ DETECTAR RIESGO (75% del tiempo SLA)
        # =====================================================
        en_riesgo = False

        if not hay_brecha and t.estado != "Resuelto":
            horas_transcurridas = (ahora - t.fecha_creacion).total_seconds() / 3600
            limite_75 = sla["resolucion_horas"] * 0.75

            if horas_transcurridas >= limite_75:
                en_riesgo = True

        # =====================================================
        # 5️⃣ PROCESAR NOTIFICACIONES
        # =====================================================

        # -------------------------
        # INCUMPLIMIENTO DEL SLA
        # -------------------------
        if hay_brecha:

            # Evitar SPAM duplicado
            if TicketHistory.objects.filter(
                ticket=t,
                accion__iexact="SLA Incumplido"
            ).exists():
                continue

            detalle = "El ticket ha incumplido el SLA definido."

            if frt_breach:
                detalle += f" FRT={frt_min:.2f} min (límite {sla['respuesta_min']} min)."

            if mttr_breach:
                detalle += f" MTTR={mttr_horas:.2f} h (límite {sla['resolucion_horas']} h)."

            with transaction.atomic():
                TicketHistory.objects.create(
                    ticket=t,
                    usuario=None,
                    accion="SLA Incumplido",
                    descripcion=detalle
                )

                # Notificar a agente
                if t.agente:
                    send_notification(
                        user_id=t.agente.id,
                        message=f"⚠ El ticket #{t.id} ha INCUMPLIDO el SLA.",
                        tipo="sla_incumplido"
                    )

                # Notificar al solicitante
                if t.solicitante:
                    send_notification(
                        user_id=t.solicitante.id,
                        message=f"Tu ticket #{t.id} ha superado el tiempo máximo de atención (SLA).",
                        tipo="sla_incumplido"
                    )

                # Notificar a todos los admins
                for admin in admins:
                    send_notification(
                        user_id=admin.id,
                        message=f"🚨 Ticket #{t.id} ha INCUMPLIDO el SLA. Categoría: {categoria.nombre}.",
                        tipo="sla_incumplido"
                    )

                contador_incumplidos += 1

            continue  # no marcamos como riesgo si ya incumplió

        # -------------------------
        # SLA EN RIESGO
        # -------------------------
        if en_riesgo:

            if TicketHistory.objects.filter(
                ticket=t,
                accion__iexact="SLA en Riesgo"
            ).exists():
                continue

            with transaction.atomic():
                TicketHistory.objects.create(
                    ticket=t,
                    usuario=None,
                    accion="SLA en Riesgo",
                    descripcion=f"El ticket está en riesgo de incumplir el SLA. Categoría: {categoria.nombre}."
                )

                # Notificar al agente
                if t.agente:
                    send_notification(
                        user_id=t.agente.id,
                        message=f"⏰ El ticket #{t.id} está en RIESGO de incumplir el SLA.",
                        tipo="sla_riesgo"
                    )

                # Notificar a admins
                for admin in admins:
                    send_notification(
                        user_id=admin.id,
                        message=f"⏰ Ticket #{t.id} está en riesgo de incumplir el SLA.",
                        tipo="sla_riesgo"
                    )

                contador_riesgo += 1

    return {
        "riesgo_notificados": contador_riesgo,
        "incumplidos_notificados": contador_incumplidos,
    }
