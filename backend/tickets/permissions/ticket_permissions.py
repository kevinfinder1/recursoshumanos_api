from rest_framework import permissions
from tickets.models import Ticket


class IsSolicitante(permissions.BasePermission):
    """
    Permiso para verificar si el usuario es un solicitante
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.rol and request.user.rol.tipo_base == 'solicitante'

    def has_object_permission(self, request, view, obj):
        # Para objetos Ticket, verificar si es el solicitante
        if isinstance(obj, Ticket):
            return obj.solicitante == request.user
        return True


class IsAgente(permissions.BasePermission):
    """
    Permiso para verificar si el usuario es cualquier tipo de agente (roles que empiezan con 'agente')
    o admin.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.rol and request.user.rol.tipo_base in ['agente', 'admin']

    def has_object_permission(self, request, view, obj):
        # Este permiso se enfoca en el rol a nivel de vista.
        # La lógica de objeto se delega a permisos más específicos como IsTicketOwner.
        # Devolver True aquí significa que si el permiso de vista pasó,
        # la decisión a nivel de objeto se deja a otros permisos en la cadena.
        return self.has_permission(request, view)


class IsAgenteOrAdmin(permissions.BasePermission):
    """
    Permiso para cualquier agente (rol que comienza con 'agente') o administrador.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.rol and request.user.rol.tipo_base in ['agente', 'admin']


class IsTicketOwner(permissions.BasePermission):
    """
    Permiso para verificar si el usuario es el dueño del ticket (solicitante o agente asignado)
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
            
        # Administradores tienen acceso completo
        if request.user.rol and request.user.rol.tipo_base == 'admin':
            return True
            
        # El solicitante del ticket
        if hasattr(obj, 'solicitante') and obj.solicitante == request.user:
            return True
            
        # El agente asignado al ticket
        if hasattr(obj, 'agente') and obj.agente == request.user:
            return True
            
        # Para asignaciones, verificar si es agente origen o destino
        if hasattr(obj, 'agente_origen') and obj.agente_origen == request.user:
            return True
        if hasattr(obj, 'agente_destino') and obj.agente_destino == request.user:
            return True
            
        return False


class CanEditTicket(permissions.BasePermission):
    """
    Permiso para verificar si el usuario puede editar el ticket
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
            
        # Administradores siempre pueden editar
        if request.user.rol and request.user.rol.tipo_base == 'admin':
            return True
            
        # El solicitante solo puede editar en los primeros 5 minutos si está Abierto
        if obj.solicitante == request.user:
            return obj.puede_editar
            
        # El agente asignado puede editar si el ticket está asignado a él
        if obj.agente == request.user:
            return True
            
        return False


class CanAssignTicket(permissions.BasePermission):
    """
    Permiso para permitir asignar tickets. Es un alias de IsAgenteOrAdmin para mayor claridad semántica.
    """
    def has_permission(self, request, view):
        return IsAgenteOrAdmin().has_permission(request, view)


class CanReassignTicket(permissions.BasePermission):
    """
    Permiso para verificar si el usuario puede reasignar tickets
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
            
        # Administradores siempre pueden reasignar
        if request.user.rol and request.user.rol.tipo_base == 'admin':
            return True
            
        # Solo el agente actual asignado puede reasignar el ticket
        if hasattr(obj, 'agente'):
            return obj.agente == request.user
            
        return False


class CanRespondToReassignment(permissions.BasePermission):
    """
    Permiso para verificar si el usuario es el agente_destino de una
    reasignación pendiente para un ticket específico.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # El admin siempre puede
        if request.user.rol and request.user.rol.tipo_base == 'admin':
            return True
            
        # Verificar si existe una asignación pendiente para este usuario y este ticket
        return obj.asignaciones.filter(agente_destino=request.user, estado='pendiente').exists()



class CanChangeTicketState(permissions.BasePermission):
    """
    Permiso para verificar si el usuario puede cambiar el estado del ticket
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
            
        # Administradores siempre pueden cambiar estados
        if request.user.rol and request.user.rol.tipo_base == 'admin':
            return True
            
        # El agente asignado puede cambiar el estado
        if hasattr(obj, 'agente'):
            return obj.agente == request.user
            
        return False


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permiso que permite acceso completo a administradores, solo lectura a otros usuarios autenticados
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
            
        # Todos los usuarios autenticados pueden ver (GET, HEAD, OPTIONS)
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Solo administradores pueden modificar
        return request.user.rol and request.user.rol.tipo_base == 'admin'


class IsAgenteSpecificCategory(permissions.BasePermission):
    """
    Permiso para verificar si el agente tiene permisos para una categoría específica
    """
    def has_object_permission(self, request, view, obj):
        """
        Verifica si el agente tiene permiso sobre un objeto Ticket específico
        basado en la categoría del ticket.
        """
        if not request.user.is_authenticated or not request.user.rol:
            return False

        # Los administradores tienen acceso a todo.
        if request.user.rol.tipo_base == 'admin':
            return True

        # Si el usuario no es un agente, no tiene permiso.
        if request.user.rol.tipo_base != 'agente':
            return False

        # Si el objeto no es un ticket, no podemos determinar el permiso.
        if not isinstance(obj, Ticket):
            return True # Dejar que otros permisos decidan.

        # Si el ticket no tiene categoría, cualquier agente puede verlo (o según otras reglas).
        if not obj.categoria_principal:
            return True

        # Si la categoría no requiere un tipo de agente específico, cualquier agente puede verla.
        if not obj.categoria_principal.tipo_agente:
            return True

        # La regla final: el rol del usuario debe ser el rol requerido por la categoría.
        return obj.categoria_principal.tipo_agente == request.user.rol