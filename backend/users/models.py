from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver

class User(AbstractUser):
    """
    Usuario personalizado con rol.
    """
    ROLE_CHOICES = (
        ('solicitante', 'Solicitante'),
        ('admin', 'Administrador'),
        ('agente', 'Agente General'),
        ('agente_nomina', 'Agente de Nómina'),
        ('agente_certificados', 'Agente de Certificados'),
        ('agente_transporte', 'Agente de Transporte'),
        ('agente_epps', 'Agente de EPPs'),
        ('agente_tca', 'Agente de TCA'),
    )

    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='solicitante')

    def __str__(self):
        return f"{self.username} ({self.role})"


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
