from pathlib import Path
import os
from datetime import timedelta

# =====================================================
# =====================================================
BASE_DIR = Path(__file__).resolve().parent.parent

# =====================================================
# =====================================================
SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-ym0w&weq1o(2z4t*pupb4**cfnr)4p2z7nlloq*5#9g(npi_g@'
)
DEBUG = os.environ.get('DEBUG', 'True') == 'True'


#  Hosts permitidos (para red local, túneles y Docker)
ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "192.168.50.68",  # 🧠 tu IP local
    "16njnx86-8000.use2.devtunnels.ms",  # 🧠 backend DevTunnel (ajusta si cambia)
]

#  Dominios autorizados para peticiones del frontend
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://192.168.50.68:5173",  # 🧠 frontend en red local
    "https://16njnx86-5173.use2.devtunnels.ms",  # 🧠 frontend DevTunnel
]

# Orígenes confiables para cookies CSRF
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://192.168.50.68:5173",
    "https://16njnx86-5173.use2.devtunnels.ms",
    "https://16njnx86-8000.use2.devtunnels.ms",
]

#  Permitir credenciales (autenticación JWT / cookies seguras)
CORS_ALLOW_CREDENTIALS = True


INSTALLED_APPS = [
    # Core Django
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Terceros
    'rest_framework',
    'corsheaders',
    'channels',
    'django_filters',

    # Apps internas
    'users',
    'tickets',
    'notifications',
    'chat',
    'adminpanel',
]

# =====================================================
# ⚙️ Middleware
# =====================================================
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # 🔥 para servir estáticos en Docker
    'corsheaders.middleware.CorsMiddleware',       # 🔥 debe ir antes de SessionMiddleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# =====================================================
# 🧩 Templates (sirviendo React build)
# =====================================================
ROOT_URLCONF = 'hr_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(BASE_DIR, "frontend", "build"),
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

ASGI_APPLICATION = 'hr_backend.asgi.application'


AUTH_USER_MODEL = 'users.User'


CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [("redis", 6379)]},
    }
}


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'hr_tickets_db'),
        'USER': os.environ.get('DB_USER', 'hr_user'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'Nintendokevin123'),
        'HOST': os.environ.get('DB_HOST', 'hr_db'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=6),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

LANGUAGE_CODE = 'es-ec'
TIME_ZONE = 'America/Guayaquil'
USE_I18N = True
USE_TZ = True


STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

STATICFILES_DIRS = [
    # os.path.join(BASE_DIR, 'frontend', 'build', 'static'), # Comentado si no se usa para servir el frontend desde Django
    os.path.join(BASE_DIR, 'static'), # 👈 AÑADIR ESTA LÍNEA
]

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')


#  Celery + Redis
CELERY_BROKER_URL = 'redis://redis:6379/0'
CELERY_RESULT_BACKEND = 'redis://redis:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'America/Guayaquil'

#  Auto Field por defecto
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


CELERY_BEAT_SCHEDULE = {
    'expirar-reasignaciones-cada-minuto': {
        'task': 'tickets.tasks.expirar_reasignaciones',
        'schedule': 60,
    },
    'asignar-tickets-pendientes-cada-minuto': {
        'task': 'tickets.tasks_auto_assign.asignar_tickets_pendientes',
        'schedule': 60,
    },
}