from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

# =====================================================
# CATEGORÍAS DEL SISTEMA
# =====================================================
class Category(models.Model):
    nombre = models.CharField(max_length=100, unique=True, db_index=True)
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"

    def __str__(self):
        return self.nombre


# =====================================================
# PRIORIDADES DEL SISTEMA
# =====================================================
class Priority(models.Model):
    nombre = models.CharField(max_length=50, unique=True, db_index=True)
    nivel = models.IntegerField(
        help_text="1 = Alta, 2 = Media, 3 = Baja"
    )
    color = models.CharField(
        max_length=20,
        default="#FF0000",
        help_text="Color hexadecimal para la interfaz"
    )

    class Meta:
        ordering = ["nivel"]
        verbose_name = "Prioridad"
        verbose_name_plural = "Prioridades"

    def __str__(self):
        return f"{self.nombre} (Nivel {self.nivel})"


# =====================================================
# SLA (Service Level Agreements)
# =====================================================
class SLA(models.Model):
    nombre = models.CharField(max_length=100, unique=True, db_index=True)
    tiempo_respuesta_horas = models.IntegerField()
    tiempo_resolucion_horas = models.IntegerField()
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "SLA"
        verbose_name_plural = "SLAs"

    def __str__(self):
        return self.nombre


# =====================================================
# RENDIMIENTO DEL AGENTE PARA MÉTRICAS DEL ADMIN
# =====================================================
class AgentPerformance(models.Model):
    agente = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="rendimiento"
    )

    tickets_asignados = models.IntegerField(default=0)
    tickets_resueltos = models.IntegerField(default=0)

    tiempo_promedio_resolucion = models.FloatField(default=0)  # horas
    efectividad = models.FloatField(default=0)  # %

    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Rendimiento del agente"
        verbose_name_plural = "Rendimientos de agentes"

    def __str__(self):
        return f"Rendimiento de {self.agente.username}"


# =====================================================
# LOGS DEL SISTEMA (PARA AUDITORÍA DEL ADMIN)
# =====================================================
class SystemLog(models.Model):
    class Accion(models.TextChoices):
        CREATE = "CREATE", "Creación"
        UPDATE = "UPDATE", "Actualización"
        DELETE = "DELETE", "Eliminación"
        LOGIN = "LOGIN", "Inicio de sesión"
        LOGOUT = "LOGOUT", "Cierre de sesión"
        ROLE_CHANGE = "ROLE_CHANGE", "Cambio de rol"
        TICKET_REASSIGN = "TICKET_REASSIGN", "Reasignación de ticket"
        TICKET_CLOSE = "TICKET_CLOSE", "Cierre de ticket"
        WARNING = "WARNING", "Advertencia"

    usuario = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True, # Permitir logs del sistema sin usuario asociado
        db_index=True
    )
    accion = models.CharField(max_length=50, choices=Accion.choices)
    descripcion = models.TextField()

    fecha = models.DateTimeField(auto_now_add=True, db_index=True)
    ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-fecha"]
        verbose_name = "Registro del sistema"
        verbose_name_plural = "Registros del sistema"

    def __str__(self):
        return f"{self.accion} - {self.usuario} - {self.fecha}"


# =====================================================
# CONFIGURACIÓN GLOBAL DEL SISTEMA
# =====================================================
class ConfiguracionSistema(models.Model):
    nombre_empresa = models.CharField(
        max_length=120,
        default="Mi Empresa",
        unique=True
    )

    logo = models.ImageField(upload_to="logos/", null=True, blank=True)

    limite_adjuntos_mb = models.IntegerField(default=10)

    mensaje_auto_respuesta = models.TextField(
        default="Hemos recibido tu ticket. Un agente te responderá pronto."
    )

    color_primario = models.CharField(max_length=20, default="#1a73e8")

    horario_laboral = models.CharField(
        max_length=120,
        default="Lunes a Viernes - 08:00 a 17:00"
    )

    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuración del sistema"
        verbose_name_plural = "Configuración del sistema"

    def __str__(self):
        return self.nombre_empresa


# =====================================================
# ROTACIÓN DE PERSONAL (AUTOMATIZACIÓN)
# =====================================================
class RotacionProgramada(models.Model):
    agente = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='rotaciones_programadas',
        help_text="El agente que va a cambiar de rol."
    )
    rol_destino = models.ForeignKey(
        'users.Rol', 
        on_delete=models.PROTECT, 
        verbose_name="Nuevo Rol Asignado"
    )
    fecha_inicio = models.DateField(
        help_text="Fecha en la que se ejecutará el cambio (a las 00:00)."
    )
    # El relevo es obligatorio para no dejar tickets huérfanos
    agente_reemplazo = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=False, # Obligatorio en el admin
        related_name='reemplazos_asignados',
        verbose_name="Agente de Relevo (Hereda Tickets)",
        help_text="IMPORTANTE: Usuario que recibirá automáticamente los tickets ABIERTOS del agente saliente."
    )
    ejecutada = models.BooleanField(default=False, help_text="Indica si el sistema ya procesó este cambio.")
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Rotación de Personal"
        verbose_name_plural = "Rotaciones Programadas"
        ordering = ['fecha_inicio']
