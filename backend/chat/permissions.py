# chat/permissions.py
from rest_framework.permissions import BasePermission


class IsAgentOrAdmin(BasePermission):
    """
    Permiso personalizado para permitir el acceso solo a administradores
    o a cualquier tipo de agente (cuyo rol comience con 'agente').
    """
    message = "No tienes permiso para realizar esta acción. Se requiere rol de Agente o Administrador."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not request.user.rol:
            return False
            
        return request.user.rol.tipo_base in ['agente', 'admin']