from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import timedelta
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

class Ticket(models.Model):
    ESTADO_CHOICES = [
        ('Abierto', 'Abierto'),
        ('pendiente_asignacion', 'Pendiente Asignación'),
        ('Pendiente', 'Pendiente'),
        ('En Proceso', 'En Proceso'),
        ('Resuelto', 'Resuelto'),
        ('Cerrado', 'Cerrado'),
    ]

    PRIORIDAD_ALTA = 'Alta'
    PRIORIDAD_MEDIA = 'Media'
    PRIORIDAD_BAJA = 'Baja'
    
    PRIORIDAD_CHOICES = [
        (PRIORIDAD_ALTA, 'Alta'),
        (PRIORIDAD_MEDIA, 'Media'),
        (PRIORIDAD_BAJA, 'Baja'),
    ]

    # Campos base
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField()
    estado = models.CharField(max_length=30, choices=ESTADO_CHOICES, default='Abierto')
    
    # Prioridad - se asigna automáticamente según categoría
    prioridad = models.CharField(
        max_length=20, 
        choices=PRIORIDAD_CHOICES, 
        default=PRIORIDAD_MEDIA,
        help_text="Prioridad del ticket"
    )
    
    archivo_adjunto = models.FileField(upload_to='tickets/adjuntos/', blank=True, null=True)

    # Relaciones con el usuario
    solicitante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='tickets_creados'
    )
    agente = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tickets_asignados'
    )

    # Categorías dinámicas
    categoria_principal = models.ForeignKey(
        'tickets.CategoriaPrincipal',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tickets'
    )
    subcategoria = models.ForeignKey(
        'tickets.Subcategoria',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tickets'
    )

    # Fechas
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    fecha_cierre = models.DateTimeField(null=True, blank=True)

    # Campos extra
    tiempo_estimado_resolucion = models.PositiveIntegerField(
        default=24,
        help_text="Horas estimadas para resolver"
    )
    rating = models.PositiveSmallIntegerField(
        null=True, blank=True, 
        choices=[(1, '1'), (2, '2'), (3, '3'), (4, '4'), (5, '5')],
        help_text="Rating de 1-5"
    )
    comentario_cierre = models.TextField(blank=True)

    class Meta:
        ordering = ['-fecha_creacion']
        indexes = [
            models.Index(fields=['estado', 'prioridad']),
            models.Index(fields=['solicitante', 'fecha_creacion']),
            models.Index(fields=['agente', 'estado']),
            models.Index(fields=['categoria_principal', 'estado']),
            models.Index(fields=['prioridad', 'estado']),
        ]
        verbose_name = 'Ticket'
        verbose_name_plural = 'Tickets'

    # ----------------------------------------------------------------------
    #                          PROPIEDADES DE NEGOCIO
    # ----------------------------------------------------------------------

    @property
    def tiempo_transcurrido(self):
        """Tiempo desde la creación."""
        if not self.fecha_creacion:
            return timedelta(seconds=0)
        return timezone.now() - self.fecha_creacion

    @property
    def tiempo_transcurrido_horas(self):
        """Tiempo transcurrido en horas."""
        return int(self.tiempo_transcurrido.total_seconds() / 3600)

    @property
    def tiempo_restante_edicion(self):
        """Segundos restantes para que el usuario pueda editar (5 min)."""
        if not self.fecha_creacion:
            return 0

        tiempo_limite = self.fecha_creacion + timedelta(minutes=5)
        restante = (tiempo_limite - timezone.now()).total_seconds()
        return max(0, int(restante))

    @property
    def puede_editar(self):
        """El usuario puede editar solo si el ticket está abierto y dentro de 5 minutos."""
        return self.estado == 'Abierto' and self.tiempo_restante_edicion > 0

    @property
    def puede_eliminar(self):
        """Las mismas reglas que puede_editar."""
        return self.puede_editar

    @property
    def esta_vencido(self):
        """Un ticket vence si supera el tiempo estimado de resolución."""
        if self.estado in ['Resuelto', 'Cerrado']:
            return False
        horas = self.tiempo_transcurrido.total_seconds() / 3600
        return horas > self.tiempo_estimado_resolucion

    @property
    def tiempo_restante_resolucion(self):
        """Tiempo restante para resolver en horas."""
        if self.esta_vencido:
            return 0
        horas_transcurridas = self.tiempo_transcurrido.total_seconds() / 3600
        return max(0, self.tiempo_estimado_resolucion - horas_transcurridas)

    @property
    def es_prioridad_alta(self):
        return self.prioridad == self.PRIORIDAD_ALTA

    @property
    def es_prioridad_media(self):
        return self.prioridad == self.PRIORIDAD_MEDIA

    @property
    def es_prioridad_baja(self):
        return self.prioridad == self.PRIORIDAD_BAJA

    @property
    def color_prioridad(self):
        """Retorna un color según la prioridad"""
        colores = {
            self.PRIORIDAD_ALTA: '#ff6b6b',  # Rojo
            self.PRIORIDAD_MEDIA: '#ffd93d',  # Amarillo
            self.PRIORIDAD_BAJA: '#6bcf7f',   # Verde
        }
        return colores.get(self.prioridad, '#3498db')

    @property
    def icono_prioridad(self):
        """Retorna un icono según la prioridad"""
        iconos = {
            self.PRIORIDAD_ALTA: '🔥',  # Fuego
            self.PRIORIDAD_MEDIA: '⚡',  # Rayo
            self.PRIORIDAD_BAJA: '🌱',   # Planta
        }
        return iconos.get(self.prioridad, '📋')

    # ----------------------------------------------------------------------
    #                          ASIGNACIÓN AUTOMÁTICA DE PRIORIDAD
    # ----------------------------------------------------------------------

    def asignar_prioridad_automatica(self):
        """
        Asigna automáticamente la prioridad basada en la categoría.
        Se ejecuta automáticamente al guardar el ticket.
        """
        if self.categoria_principal:
            # Asignar prioridad de la categoría principal
            self.prioridad = self.categoria_principal.prioridad_automatica
            print(f"✅ Prioridad automática asignada: {self.prioridad} para categoría: {self.categoria_principal.nombre}")
        elif self.subcategoria:
            # Si no hay categoría principal pero sí subcategoría, usar la de la subcategoría
            self.prioridad = self.subcategoria.prioridad_automatica
            print(f"✅ Prioridad automática asignada: {self.prioridad} para subcategoría: {self.subcategoria.nombre}")

    def asignar_tiempo_resolucion_automatico(self):
        """
        Asigna automáticamente el tiempo estimado de resolución.
        """
        if self.subcategoria and self.subcategoria.tiempo_resolucion_final > 0:
            # Usar tiempo de la subcategoría
            self.tiempo_estimado_resolucion = self.subcategoria.tiempo_resolucion_final
            print(f"✅ Tiempo de resolución automático: {self.tiempo_estimado_resolucion}h para subcategoría: {self.subcategoria.nombre}")
        elif self.categoria_principal:
            # Usar tiempo de la categoría principal
            self.tiempo_estimado_resolucion = self.categoria_principal.tiempo_resolucion_horas
            print(f"✅ Tiempo de resolución automático: {self.tiempo_estimado_resolucion}h para categoría: {self.categoria_principal.nombre}")

    # ----------------------------------------------------------------------
    #                          CHAT
    # ----------------------------------------------------------------------

    @property
    def sala_chat(self):
        """Retorna la sala de chat asociada si existe."""
        try:
            from chat.models import ChatRoom
            return ChatRoom.objects.get(ticket=self)
        except:
            return None

    @property
    def mensajes(self):
        """Retorna los mensajes del chat asociado."""
        sala = self.sala_chat
        if sala:
            return sala.messages.all()
        return []

    # ----------------------------------------------------------------------
    #                          MÉTODOS DE ACCIÓN
    # ----------------------------------------------------------------------

    def cerrar_ticket(self, comentario="", rating=None, usuario=None):
        """Cierra el ticket."""
        self.estado = 'Resuelto'
        self.fecha_cierre = timezone.now()
        self.comentario_cierre = comentario
        if rating:
            self.rating = rating
        self.save()

    def reabrir_ticket(self):
        """Reabre el ticket."""
        self.estado = 'Abierto'
        self.fecha_cierre = None
        self.save()

    def asignar_agente(self, agente):
        """Asigna un agente al ticket."""
        self.agente = agente
        if self.estado == 'pendiente_asignacion':
            self.estado = 'Pendiente'
        self.save()

    def cambiar_prioridad(self, nueva_prioridad):
        """Cambia manualmente la prioridad."""
        if nueva_prioridad in [choice[0] for choice in self.PRIORIDAD_CHOICES]:
            self.prioridad = nueva_prioridad
            self.save()
            return True
        return False

    # ----------------------------------------------------------------------
    #                          MÉTODOS DE UTILIDAD
    # ----------------------------------------------------------------------

    def clean(self):
        """Validación del modelo antes de guardar."""
        super().clean()
        
        # Validar que la prioridad sea válida
        prioridades_validas = [choice[0] for choice in self.PRIORIDAD_CHOICES]
        if self.prioridad not in prioridades_validas:
            raise ValidationError({
                'prioridad': f"Prioridad '{self.prioridad}' no válida. Opciones: {', '.join(prioridades_validas)}"
            })

    def save(self, *args, **kwargs):
        """Sobreescribir save para lógica automática."""
        es_nuevo = not self.pk
        
        # Si es un ticket nuevo o se cambió la categoría
        if es_nuevo or 'categoria_principal' in self.get_dirty_fields() or 'subcategoria' in self.get_dirty_fields():
            # 1. Asignar prioridad automática según categoría
            self.asignar_prioridad_automatica()
            
            # 2. Asignar tiempo de resolución automático
            self.asignar_tiempo_resolucion_automatico()
        
        # Si es prioridad alta, ajustar tiempos si es necesario
        if self.prioridad == self.PRIORIDAD_ALTA and self.tiempo_estimado_resolucion > 12:
            print(f"⚠️  Prioridad ALTA detectada, ajustando tiempo de {self.tiempo_estimado_resolucion}h a 12h máximo")
            self.tiempo_estimado_resolucion = min(self.tiempo_estimado_resolucion, 12)
        
        super().save(*args, **kwargs)

    def get_dirty_fields(self):
        """Obtiene los campos que han cambiado desde la última carga."""
        if not self.pk:
            return {}
        
        # Obtener el objeto original de la base de datos
        original = Ticket.objects.get(pk=self.pk)
        dirty_fields = {}
        
        for field in self._meta.fields:
            field_name = field.name
            if getattr(self, field_name) != getattr(original, field_name):
                dirty_fields[field_name] = True
        
        return dirty_fields

    def __str__(self):
        return f"Ticket #{self.id} - {self.titulo} ({self.prioridad})"


# ----------------------------------------------------------------------
#                          SEÑALES (SIGNALS)
# ----------------------------------------------------------------------

@receiver(pre_save, sender=Ticket)
def asignar_valores_automaticos(sender, instance, **kwargs):
    """
    Asigna valores automáticos basados en la categoría antes de guardar.
    """
    # Solo si es nuevo o cambió la categoría
    if not instance.pk or instance.categoria_principal_id or instance.subcategoria_id:
        # Asignar prioridad automática
        if instance.categoria_principal:
            instance.prioridad = instance.categoria_principal.prioridad_automatica
        
        # Asignar tiempo de resolución
        if instance.subcategoria and instance.subcategoria.tiempo_resolucion_final > 0:
            instance.tiempo_estimado_resolucion = instance.subcategoria.tiempo_resolucion_final
        elif instance.categoria_principal:
            instance.tiempo_estimado_resolucion = instance.categoria_principal.tiempo_resolucion_horas


@receiver(post_save, sender=Ticket)
def notificar_prioridad_alta(sender, instance, created, **kwargs):
    """
    Notifica si se crea un ticket con prioridad alta.
    """
    if created and instance.es_prioridad_alta:
        print(f"🚨 ¡TICKET DE PRIORIDAD ALTA CREADO! #{instance.id} - {instance.titulo}")
        
        # Aquí puedes añadir lógica de notificación:
        # - Enviar email a administradores
        # - Enviar notificación push
        # - Crear alerta en dashboard


@receiver(post_save, sender=Ticket)
def gestionar_chat_por_ticket(sender, instance, created, **kwargs):
    """
    ✅ CREA/ACTUALIZA el chat automáticamente.
    """
    try:
        from chat.models import ChatRoom
        
        if instance.estado == 'En Proceso':
            try:
                chat_room = ChatRoom.objects.get(ticket=instance)
            except ChatRoom.DoesNotExist:
                chat_room = ChatRoom.objects.create(
                    ticket=instance,
                    type='TICKET',
                    is_active=True
                )
            
            chat_room.participants.clear()
            if instance.solicitante:
                chat_room.participants.add(instance.solicitante)
            if instance.agente:
                chat_room.participants.add(instance.agente)
                
    except ImportError:
        pass  # Modelo ChatRoom no disponible