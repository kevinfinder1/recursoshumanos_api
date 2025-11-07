from django.db import models, transaction
from django.utils import timezone
from datetime import timedelta
from django.conf import settings


def default_fecha_limite():
    """Fecha límite de aceptación 5 minutos después de la creación."""
    return timezone.now() + timedelta(minutes=5)


# ============================================================
# 🟢 MODELO PRINCIPAL: TICKET
# ============================================================
class Ticket(models.Model):
    ESTADO_CHOICES = [
        ('Abierto', 'Abierto'),
        ('En Proceso', 'En Proceso'),
        ('Resuelto', 'Resuelto'),
    ]

    PRIORIDAD_CHOICES = [
        ('Baja', 'Baja'),
        ('Media', 'Media'),
        ('Alta', 'Alta'),
    ]

    CATEGORIA_CHOICES = [
        ('Nomina', 'Nómina'),
        ('Certificados', 'Certificados'),
        ('Quejas de transporte', 'Quejas de transporte'),
        ('Cambios de EPPs', 'Cambios de EPPs'),
        ('Renovacion de TCA', 'Renovación de TCA'),
    ]

    SUBCATEGORIA_CHOICES = [
        ('Pagos', 'Pagos'),
        ('Descuentos', 'Descuentos'),
        ('Bonos', 'Bonos'),
        ('Horas extras', 'Horas extras'),
        ('Ascensos', 'Ascensos'),
        ('Justificación por permiso médico', 'Justificación por permiso médico'),
        ('Retenciones judiciales', 'Retenciones judiciales'),
        ('Cambio de cuenta bancaria', 'Cambio de cuenta bancaria'),
        ('Certificado laboral', 'Certificado laboral'),
        ('Certificado de trabajo', 'Certificado de trabajo'),
        ('Retrasos/ausencias', 'Retrasos/ausencias'),
        ('Mal comportamiento', 'Mal comportamiento'),
        ('Nueva ruta', 'Nueva ruta'),
        ('Objetos perdidos', 'Objetos perdidos'),
        ('Solicitud de cambio', 'Solicitud de cambio'),
        ('Talla incorrecta', 'Talla incorrecta'),
        ('Equipo defectuoso', 'Equipo defectuoso'),
        ('Falta de dotación', 'Falta de dotación'),
        ('Vencimiento', 'Vencimiento'),
        ('Reposición por pérdida', 'Reposición por pérdida'),
        ('Daño físico', 'Daño físico'),
    ]

    # 🔹 Campos base
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField()
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='Abierto')
    prioridad = models.CharField(max_length=20, choices=PRIORIDAD_CHOICES, default='Media')
    archivo_adjunto = models.FileField(upload_to='adjuntos/', blank=True, null=True)

    # 🔹 Relaciones
    solicitante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tickets_creados'
    )
    agente = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tickets_asignados'
    )

    # 🔹 Fechas
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    # 🔹 Clasificación
    categoria_principal = models.CharField(max_length=50, choices=CATEGORIA_CHOICES, default='Nomina')
    subcategoria = models.CharField(max_length=60, choices=SUBCATEGORIA_CHOICES, blank=True, null=True)

    # ============================================================
    # 🧠 Propiedades de negocio
    # ============================================================
    @property
    def tiempo_restante_edicion(self):
        """Devuelve los segundos restantes para poder editar."""
        tiempo_transcurrido = timezone.now() - self.fecha_creacion
        tiempo_restante = timedelta(minutes=5) - tiempo_transcurrido
        return max(0, int(tiempo_restante.total_seconds()))

    @property
    def puede_editar(self):
        """El solicitante puede editar dentro de los 5 minutos si está Abierto."""
        if self.estado != 'Abierto':
            return False
        return self.tiempo_restante_edicion > 0

    @property
    def puede_eliminar(self):
        """Solo se puede eliminar si el estado no es 'En Proceso'."""
        return self.estado != 'En Proceso'

    def __str__(self):
        return f'Ticket #{self.id} - {self.titulo}'


# ============================================================
# 🟡 MODELO: ASIGNACIÓN ENTRE AGENTES (con auditoría)
# ============================================================
class TicketAssignment(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='asignaciones')
    agente_origen = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='asignaciones_enviadas'
    )
    agente_destino = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='asignaciones_recibidas'
    )
    fecha_envio = models.DateTimeField(auto_now_add=True)
    fecha_limite_aceptacion = models.DateTimeField(default=default_fecha_limite)
    estado = models.CharField(
        max_length=20,
        choices=[
            ('pendiente', 'Pendiente'),
            ('aceptada', 'Aceptada'),
            ('rechazada', 'Rechazada'),
            ('expirada', 'Expirada'),
        ],
        default='pendiente'
    )

    # ✅ Campos automáticos de auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def ha_expirado(self):
        """Verifica si el tiempo de aceptación ha expirado."""
        return timezone.now() > self.fecha_limite_aceptacion and self.estado == 'pendiente'

    def __str__(self):
        return f"{self.ticket.titulo} → {self.agente_destino.username} ({self.estado})"

    def apply_ticket_state(self):
        """Aplica los cambios al ticket según el estado de la asignación."""
        t = self.ticket
        if self.estado == 'pendiente':
            t.estado = t.estado or 'Abierto'
        elif self.estado == 'aceptada':
            t.agente = self.agente_destino
            if t.estado == 'Abierto':
                t.estado = 'En Proceso'
        elif self.estado in ('rechazada', 'expirada'):
            t.agente = self.agente_origen
        t.save(update_fields=['agente', 'estado', 'fecha_actualizacion'])

    def save(self, *args, **kwargs):
        """Guarda la asignación y registra un historial automático."""
        with transaction.atomic():
            nuevo = self._state.adding  # True si es nueva asignación
            super().save(*args, **kwargs)
            self.apply_ticket_state()

            # 🔵 Log automático en el historial
            from tickets.models import TicketHistory
            if nuevo:
                TicketHistory.objects.create(
                    ticket=self.ticket,
                    usuario=self.agente_origen,
                    accion="Reasignación",
                    descripcion=f"El ticket fue reasignado al agente {self.agente_destino.username}."
                )
            else:
                TicketHistory.objects.create(
                    ticket=self.ticket,
                    usuario=self.agente_destino,
                    accion="Actualización de Asignación",
                    descripcion=f"La asignación cambió de estado a {self.estado}."
                )

class TicketHistory(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='historial')
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    accion = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f"Historial de {self.ticket.titulo} - {self.accion}"

# ============================================================
# 💬 MODELO: MENSAJES DE CHAT ENTRE AGENTE Y SOLICITANTE
# ============================================================
class TicketMessage(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="mensajes"
    )
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="mensajes_ticket"
    )
    contenido = models.TextField()
    fecha_envio = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["fecha_envio"]

    def clean(self):
        """No permite enviar mensajes si el ticket no está en proceso."""
        if self.ticket.estado != 'En Proceso':
            raise ValueError("El chat está deshabilitado porque el ticket no está en proceso.")

    def __str__(self):
        return f"Mensaje de {self.autor.username} en Ticket #{self.ticket.id}"
