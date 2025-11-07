from django.contrib import admin
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """
    Configuración del modelo Notification en el panel de administración de Django.
    """
    list_display = ('id', 'usuario', 'mensaje_resumido', 'tipo', 'leida', 'fecha_creacion')
    list_filter = ('tipo', 'leida', 'fecha_creacion')
    search_fields = ('usuario__username', 'mensaje', 'tipo')
    ordering = ('-fecha_creacion',)
    readonly_fields = ('fecha_creacion',)

    def mensaje_resumido(self, obj):
        return (obj.mensaje[:50] + '...') if len(obj.mensaje) > 50 else obj.mensaje
    mensaje_resumido.short_description = 'Mensaje'
