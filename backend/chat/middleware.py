from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth.models import AnonymousUser
from jwt import decode as jwt_decode
from django.conf import settings

User = get_user_model()

@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()

class JWTAuthMiddleware:
    """
    Middleware para autenticar conexiones WebSocket con JWT (?token=...)
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_string = parse_qs(scope["query_string"].decode())
        token = query_string.get("token", [None])[0]

        if token is None:
            scope["user"] = AnonymousUser()
            return await self.inner(scope, receive, send)

        try:
            decoded = jwt_decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user = await get_user(decoded["user_id"])
            scope["user"] = user
        except Exception:
            scope["user"] = AnonymousUser()

        return await self.inner(scope, receive, send)
