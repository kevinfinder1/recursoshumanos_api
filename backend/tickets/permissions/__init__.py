from .ticket_permissions import (
    IsSolicitante,
    IsAgente,
    IsAgenteOrAdmin,
    IsTicketOwner,
    CanEditTicket,
    CanAssignTicket,
    CanReassignTicket,
    CanChangeTicketState,
    IsAdminOrReadOnly
)

__all__ = [
    'IsSolicitante',
    'IsAgente', 
    'IsAgenteOrAdmin',
    'IsTicketOwner',
    'CanEditTicket',
    'CanAssignTicket',
    'CanReassignTicket',
    'CanChangeTicketState',
    'IsAdminOrReadOnly'
]