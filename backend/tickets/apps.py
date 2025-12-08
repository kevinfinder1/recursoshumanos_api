from django.apps import AppConfig

class TicketsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tickets'
    
    def ready(self):
        # Importar los modelos asegura que todas las señales definidas
        # con el decorador @receiver en esos archivos se registren.
        import tickets.models