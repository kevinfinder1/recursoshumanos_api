from django.urls import path, include
from rest_framework.routers import DefaultRouter

from tickets.views.user_views import TicketUserViewSet
from tickets.views.agent_views import TicketAgentViewSet, CambiarEstadoTicketView, TicketMensajesView, AgentesDisponiblesView
from tickets.views.admin_views import TicketAdminViewSet
from tickets.views.assignment_views import (
    TicketAssignmentViewSet,
    AcceptAssignmentView,
    RejectAssignmentView,
    CheckExpiredAssignmentsView,
)

# ===============================================================
# 🔹 Routers principales
# ===============================================================
router = DefaultRouter()
router.register(r'user/tickets', TicketUserViewSet, basename='user-tickets')
router.register(r'agent/tickets', TicketAgentViewSet, basename='agent-tickets')
router.register(r'admin/tickets', TicketAdminViewSet, basename='admin-tickets')
router.register(r'assignments', TicketAssignmentViewSet, basename='assignments')

# ===============================================================
# 🔹 URL Patterns
# ===============================================================
urlpatterns = [
    path('', include(router.urls)),

    # Endpoints específicos del flujo de asignaciones
    path(
        'assignments/<int:pk>/accept/',
        AcceptAssignmentView.as_view(),
        name='accept-assignment'
    ),
    path(
        'assignments/<int:pk>/reject/',
        RejectAssignmentView.as_view(),
        name='reject-assignment'
    ),
    path(
        'assignments/check-expired/',
        CheckExpiredAssignmentsView.as_view(),
        name='check-expired-assignments'
    ),
    
    # 🔥 NUEVOS ENDPOINTS PARA AGENTES
    path(
        'agent/tickets/<int:pk>/cambiar_estado/',
        CambiarEstadoTicketView.as_view(),
        name='cambiar-estado-ticket'
    ),
    path(
        'agent/tickets/<int:pk>/mensajes/',
        TicketMensajesView.as_view(),
        name='ticket-mensajes'
    ),
    path(
        'agent/agentes_disponibles/',
        AgentesDisponiblesView.as_view(),
        name='agentes-disponibles'
    ),
]