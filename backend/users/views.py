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

        # --- LÓGICA PARA CONSTRUIR EL ROL CORRECTO ---
        role_value = None
        if user.rol:
            # ✅ CORRECCIÓN: Lógica simplificada y correcta
            if user.rol.tipo_base == 'agente':
                role_value = 'agente'
            elif user.rol.tipo_base == 'solicitante':
                role_value = 'solicitante'
            else:
                # Para cualquier otro caso (como 'admin'), usar el nombre_clave.
                role_value = user.rol.nombre_clave

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": role_value,
            "rol": user.rol.id if user.rol else None,
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
        # ✅ CORRECCIÓN: Renombrar 'rol__nombre_clave' a 'role' para que el frontend lo entienda.
        from django.db.models import F
        users = User.objects.select_related('rol').all().annotate(role=F('rol__nombre_clave')).values(
            "id", "username", "email", "role", "first_name", "last_name"
        )
        return Response(list(users))
