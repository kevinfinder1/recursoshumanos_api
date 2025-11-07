from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from users.models import Profile
from users.serializers import ProfileSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class CurrentUserView(APIView):
    """
    Devuelve la información del usuario autenticado.
    Usada por /api/user/me/
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            profile = Profile.objects.get(user=user)
        except Profile.DoesNotExist:
            profile = None

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,  # ✅ CLAVE: el frontend necesita esto
            "bio": profile.bio if profile else "",
            "avatar": profile.avatar.url if profile and profile.avatar else None,
        })


class ProfileView(APIView):
    """
    Devuelve o crea el perfil del usuario autenticado.
    Usada por /api/user/profile/
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)


class UserListView(APIView):
    """
    Devuelve la lista de todos los usuarios del sistema (usado por el agente).
    Usada por /api/users/
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        users = User.objects.all().values(
            "id", "username", "email", "role", "first_name", "last_name"
        )
        return Response(list(users))
