from urllib.parse import parse_qs
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async

User = get_user_model()

class JWTAuthMiddleware:
    """
    Middleware personalizado para autenticar WebSockets usando JWT (query param `?token=`).
    """
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)
        token_list = query_params.get("token")

        if token_list:
            token = token_list[0]
            try:
                access = AccessToken(token)
                user_id = access["user_id"]
                user = await database_sync_to_async(User.objects.get)(id=user_id)
                scope["user"] = user
            except Exception as e:
                print(f"❌ Error autenticando JWT en WebSocket: {e}")
                scope["user"] = AnonymousUser()
        else:
            scope["user"] = AnonymousUser()

        return await self.inner(scope, receive, send)
