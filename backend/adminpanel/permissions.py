from rest_framework.permissions import BasePermission

class IsAdminRole(BasePermission):
    """
    Permite el acceso solo a usuarios con el rol 'admin'.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Comprobar el tipo base del rol del usuario
        return request.user.rol and request.user.rol.tipo_base == 'admin'