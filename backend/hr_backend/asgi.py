import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hr_backend.settings")

# 👇 Inicializa Django primero
django.setup()

# 👇 SOLO importar notificaciones y chat (tickets no tiene WebSocket)
from notifications.routing import websocket_urlpatterns as notifications_ws
from chat.routing import websocket_urlpatterns as chat_ws
from users.routing import websocket_urlpatterns as users_ws # ✅ 1. Importar rutas de presencia

# Configuración ASGI (HTTP + WebSocket)
django_asgi_app = get_asgi_application()

# ✅ 2. Combinar TODAS las rutas de WebSocket
combined_websocket_urlpatterns = notifications_ws + chat_ws + users_ws

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(combined_websocket_urlpatterns)
    ),
})