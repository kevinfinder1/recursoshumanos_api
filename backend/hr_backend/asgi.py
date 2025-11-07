import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hr_backend.settings")

# 👇 Inicializa Django primero
django.setup()

# 👇 Ahora sí, importa las rutas WebSocket (ya con las apps cargadas)
from notifications.routing import websocket_urlpatterns as notifications_ws
from tickets.routing import websocket_urlpatterns as tickets_ws

# Configuración ASGI (HTTP + WebSocket)
django_asgi_app = get_asgi_application()

# Fusionar las rutas WebSocket de ambas apps
combined_websocket_urlpatterns = notifications_ws + tickets_ws

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(combined_websocket_urlpatterns)
    ),
})

