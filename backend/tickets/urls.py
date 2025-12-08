from django.urls import path, include
from rest_framework.routers import DefaultRouter

from tickets.views import (
    UserTicketViewSet,
    AgentTicketViewSet,
    AdminTicketViewSet,
    AgentesConectadosView,
    AgentesDisponiblesView,
    CategoriaPrincipalViewSet,
    SubcategoriaViewSet,
    TicketAssignmentViewSet
)

router = DefaultRouter()

# Tickets por tipo de usuario
router.register(r'user/tickets', UserTicketViewSet, basename='user-tickets')
router.register(r'agent/tickets', AgentTicketViewSet, basename='agent-tickets') 
router.register(r'admin/tickets', AdminTicketViewSet, basename='admin-tickets')

# Categorías (acceso público para selección)
router.register(r'categorias', CategoriaPrincipalViewSet, basename='categorias')
router.register(r'subcategorias', SubcategoriaViewSet, basename='subcategorias')

# Asignaciones (principalmente para administradores)
router.register(r'asignaciones', TicketAssignmentViewSet, basename='asignaciones')

urlpatterns = [
    path('', include(router.urls)),
    
    # Endpoints adicionales
    path('agent/agentes-disponibles/', AgentesDisponiblesView.as_view(), name='agentes-disponibles'),
    path('agent/agentes-conectados/', AgentesConectadosView.as_view(), name='agentes-conectados'),
    
    # Endpoints específicos para acciones de tickets
    path('agent/tickets/<int:pk>/reasignar/', 
         AgentTicketViewSet.as_view({'post': 'reasignar'}), 
         name='ticket-reasignar'),
    path('agent/tickets/<int:pk>/aceptar-reasignacion/', 
         AgentTicketViewSet.as_view({'post': 'aceptar_reasignacion'}), 
         name='ticket-aceptar-reasignacion'),
    path('agent/tickets/<int:pk>/rechazar-reasignacion/', 
         AgentTicketViewSet.as_view({'post': 'rechazar_reasignacion'}), 
         name='ticket-rechazar-reasignacion'),
    path('agent/tickets/<int:pk>/cambiar-estado/', 
         AgentTicketViewSet.as_view({'post': 'cambiar_estado'}), 
         name='ticket-cambiar-estado'),
    path('agent/tickets/<int:pk>/cerrar/', 
         AgentTicketViewSet.as_view({'post': 'cerrar'}), 
         name='ticket-cerrar'),
    path('agent/tickets/pendientes-aceptacion/', 
         AgentTicketViewSet.as_view({'get': 'pendientes_aceptacion'}), 
         name='tickets-pendientes-aceptacion'),
    
    
    # Endpoints de usuario
    path('user/tickets/<int:pk>/calificar/', 
         UserTicketViewSet.as_view({'post': 'calificar'}), 
         name='ticket-calificar'),
    path('user/tickets/<int:pk>/historial/', 
         UserTicketViewSet.as_view({'get': 'historial'}), 
         name='ticket-historial'),
    path('user/tickets/<int:pk>/chat-info/', 
         UserTicketViewSet.as_view({'get': 'chat_info'}), 
         name='ticket-chat-info'),
    
    # Endpoints de administrador
    path('admin/tickets/estadisticas/', 
         AdminTicketViewSet.as_view({'get': 'estadisticas'}), 
         name='admin-estadisticas'),
    path('admin/tickets/reporte-agentes/', 
         AdminTicketViewSet.as_view({'get': 'reporte_agentes'}), 
         name='admin-reporte-agentes'),
]