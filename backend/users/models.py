from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver

class Rol(models.Model):
    """
    Modelo para gestionar los roles del sistema de forma dinámica.
    """
    nombre_clave = models.CharField(max_length=50, unique=True, help_text="Identificador interno, ej: 'agente_inventario'")
    nombre_visible = models.CharField(max_length=100, help_text="Nombre para mostrar en la UI, ej: 'Agente de Inventario'")
    descripcion = models.TextField(blank=True)
    
    TIPO_ROL_CHOICES = [
        ('admin', 'Administrador'),
        ('agente', 'Agente'),
        ('solicitante', 'Solicitante'),
    ]
    tipo_base = models.CharField(max_length=20, choices=TIPO_ROL_CHOICES, default='solicitante', help_text="El tipo base del rol define sus permisos fundamentales.")
    es_sistema = models.BooleanField(default=False, editable=False, help_text="Si es True, no se puede eliminar ni editar por el admin.")

    def __str__(self):
        return self.nombre_visible

class Area(models.Model):
    """
    Modelo para gestionar las áreas o departamentos de la empresa.
    """
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)

    def __str__(self):
        return self.nombre

class User(AbstractUser):
    """
    Usuario personalizado con rol.
    """
    rol = models.ForeignKey(
        Rol,
        on_delete=models.SET_NULL, # Si se borra un rol, los usuarios no se borran.
        null=True, blank=True, related_name='usuarios')

    # --- NUEVOS CAMPOS DE RRHH ---
    TIPO_DOCUMENTO_CHOICES = [
        ('cedula', 'Cédula'),
        ('pasaporte', 'Pasaporte'),
    ]
    tipo_documento = models.CharField(max_length=10, choices=TIPO_DOCUMENTO_CHOICES, blank=True, null=True)
    numero_documento = models.CharField(max_length=20, unique=True, blank=True, null=True)
    codigo_empleado = models.CharField(max_length=20, unique=True, blank=True, null=True)
    fecha_nacimiento = models.DateField(blank=True, null=True)
    area = models.ForeignKey(
        Area,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='miembros'
    )
    tiene_discapacidad = models.BooleanField(default=False)
    certificado_discapacidad = models.FileField(
        upload_to='certificados_discapacidad/', blank=True, null=True
    )

    def __str__(self):
        rol_nombre = self.rol.nombre_visible if self.rol else "Sin rol"
        return f"{self.username} ({rol_nombre})"

    # El antiguo campo 'role' debe ser eliminado después de la migración de datos.


class Profile(models.Model):
    """
    Perfil adicional (opcional si deseas más datos del usuario)
    """
    user = models.OneToOneField('users.User', on_delete=models.CASCADE)
    bio = models.TextField(blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    def __str__(self):
        return f"Perfil de {self.user.username}"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
