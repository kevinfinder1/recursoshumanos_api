import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hr_backend.settings')

app = Celery('hr_backend')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# ✅ NOMBRE CORRECTO DE LA TAREA
app.conf.beat_schedule = {
    'revisar-asignaciones-cada-minuto': {
        'task': 'tickets.tasks.expirar_reasignaciones',  # ← Este es el nombre correcto
        'schedule': crontab(),  # cada minuto
    },
}

app.conf.timezone = 'America/Guayaquil'