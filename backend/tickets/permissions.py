from rest_framework import permissions
from rest_framework.permissions import BasePermission

class TicketPermission(permissions.BasePermission):
    """
    Controla qué acciones puede realizar cada tipo de usuario en el sistema de tickets.
    """

    def _is_agent(self, role: str | None) -> bool:
        # Cubre 'agente' y cualquier 'agente_*'
        return bool(role) and role.startswith('agente')

    def has_permission(self, request, view):
        user = request.user
        role = getattr(getattr(user, 'profile', None), 'role', None)

        # 🔓 Usuarios autenticados pueden listar/ver/crear
        if view.action in ['list', 'retrieve', 'create']:
            return user.is_authenticated

        # 🔧 Admins y staff: todo
        if user.is_staff or role == 'admin':
            return True

        # 🧑‍💼 Agentes (cualquier tipo de agente)
        if self._is_agent(role):
            if view.action in ['update', 'partial_update', 'retrieve', 'create']:
                return True

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        role = getattr(getattr(user, 'profile', None), 'role', None)

        # 🔧 Admins y staff: todo
        if user.is_staff or role == 'admin':
            return True

        # 🧑‍💼 Agentes pueden ver/editar pero no eliminar
        if self._is_agent(role):
            return view.action in ['retrieve', 'update', 'partial_update']

        # 👤 Solicitante: CRUD solo sobre sus tickets
        if obj.solicitante == user:
            return view.action in ['retrieve', 'update', 'partial_update', 'destroy']

        return False
    
class IsAgent(BasePermission):
    """Permite acceso solo a usuarios con rol de agente o subrol de agente."""
    def has_permission(self, request, view):
        return getattr(request.user, "is_authenticated", False) and request.user.role.startswith("agente")

class IsAssignedAgent(BasePermission):
    """Permite acceso solo al agente asignado al ticket."""
    def has_object_permission(self, request, view, obj):
        return getattr(request.user, "is_authenticated", False) and obj.agente_id == request.user.id

