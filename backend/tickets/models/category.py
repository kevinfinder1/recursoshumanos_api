from django.db import models
from django.core.exceptions import ValidationError
from users.models import User, Rol

class CategoriaPrincipal(models.Model):
    """
    Categorías principales de tickets con prioridad automática
    """
    # Prioridades disponibles
    PRIORIDAD_ALTA = 'Alta'
    PRIORIDAD_MEDIA = 'Media'
    PRIORIDAD_BAJA = 'Baja'
    
    PRIORIDAD_CHOICES = [
        (PRIORIDAD_ALTA, 'Alta'),
        (PRIORIDAD_MEDIA, 'Media'),
        (PRIORIDAD_BAJA, 'Baja'),
    ]
    
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    color = models.CharField(max_length=20, default='#3498db')
    
    # ✅ ORDEN AUTOMÁTICO
    orden = models.PositiveIntegerField(default=0, editable=False)
    
    # ✅ ASIGNACIÓN DE ROL
    tipo_agente = models.ForeignKey(
        Rol,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Rol que puede atender tickets de esta categoría (opcional)",
        limit_choices_to={'tipo_base__in': ['agente', 'admin']}
    )

    # ✅ PRIORIDAD AUTOMÁTICA POR CATEGORÍA
    prioridad_automatica = models.CharField(
        max_length=20,
        choices=PRIORIDAD_CHOICES,
        default=PRIORIDAD_MEDIA,
        help_text="Prioridad que se asignará automáticamente a los tickets de esta categoría."
    )

    # ✅ TIEMPO ESTIMADO POR DEFECTO PARA ESTA CATEGORÍA
    tiempo_resolucion_horas = models.PositiveIntegerField(
        default=24,
        help_text="Horas estimadas para resolver tickets de esta categoría"
    )

    class Meta:
        verbose_name = 'Categoría Principal'
        verbose_name_plural = 'Categorías Principales'
        ordering = ['orden', 'nombre']

    def save(self, *args, **kwargs):
        """Calcular orden automáticamente al crear nueva categoría"""
        if not self.pk:  # Solo para nuevas categorías
            max_orden = CategoriaPrincipal.objects.aggregate(
                models.Max('orden')
            )['orden__max'] or 0
            self.orden = max_orden + 1
        
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nombre

    @property
    def es_prioridad_alta(self):
        return self.prioridad_automatica == self.PRIORIDAD_ALTA

    @property
    def es_prioridad_media(self):
        return self.prioridad_automatica == self.PRIORIDAD_MEDIA

    @property
    def es_prioridad_baja(self):
        return self.prioridad_automatica == self.PRIORIDAD_BAJA

    def get_color_prioridad(self):
        """Retorna un color según la prioridad"""
        colores = {
            self.PRIORIDAD_ALTA: '#ff6b6b',  # Rojo
            self.PRIORIDAD_MEDIA: '#ffd93d',  # Amarillo
            self.PRIORIDAD_BAJA: '#6bcf7f',   # Verde
        }
        return colores.get(self.prioridad_automatica, '#3498db')


class Subcategoria(models.Model):
    """
    Subcategorías específicas para cada categoría principal
    """
    categoria = models.ForeignKey(
        CategoriaPrincipal,
        on_delete=models.CASCADE,
        related_name='subcategorias'
    )
    nombre = models.CharField(max_length=60)
    descripcion = models.TextField(blank=True)
    requiere_aprobacion = models.BooleanField(default=False)
    tiempo_resolucion_estimado = models.PositiveIntegerField(
        default=24,
        help_text="Horas estimadas para resolver (si es 0, usa el de la categoría)"
    )

    class Meta:
        verbose_name = 'Subcategoría'
        verbose_name_plural = 'Subcategorías'
        unique_together = ['categoria', 'nombre']
        ordering = ['categoria', 'nombre']

    def __str__(self):
        return f"{self.categoria.nombre} - {self.nombre}"

    @property
    def prioridad_automatica(self):
        """Hereda la prioridad de la categoría principal"""
        return self.categoria.prioridad_automatica

    @property
    def tiempo_resolucion_final(self):
        """Retorna el tiempo de resolución (usa el de subcategoría o el de categoría)"""
        if self.tiempo_resolucion_estimado > 0:
            return self.tiempo_resolucion_estimado
        return self.categoria.tiempo_resolucion_horas

    @property
    def tiempo_resolucion_formato(self):
        """Retorna el tiempo en formato legible"""
        horas = self.tiempo_resolucion_final
        if horas < 24:
            return f"{horas} horas"
        else:
            dias = horas // 24
            horas_resto = horas % 24
            if horas_resto > 0:
                return f"{dias} días y {horas_resto} horas"
            return f"{dias} días"


class FlujoAprobacion(models.Model):
    """
    Flujos de aprobación para subcategorías que lo requieran
    """
    subcategoria = models.OneToOneField(Subcategoria, on_delete=models.CASCADE)
    aprobadores = models.ManyToManyField(
        'users.User',
        limit_choices_to={'rol__tipo_base__in': ['admin', 'agente']},
        related_name='flujos_aprobacion'
    )
    niveles_aprobacion = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"Flujo aprobación: {self.subcategoria}"

    @property
    def tiene_aprobadores(self):
        """Verifica si hay aprobadores asignados"""
        return self.aprobadores.exists()