# adminpanel/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.admin_views import (
    AdminDashboardView, 
    AgenteAdminViewSet, 
    RolAdminViewSet,
    AreaAdminViewSet,
    CategoryAdminViewSet,
)
from .views.config_views import (
    PriorityViewSet,
    SLAViewSet,
    SystemLogViewSet,
    ConfiguracionSistemaView,
)
from .views.ticket_list_views import (
    AdminTicketViewSet,
    AdminTicketFilterOptionsView
)
from .views.report_views import (
    GenerarReporteDashboardView,
    GenerarReporteTicketsView,
    GenerarReporteUsuariosView,
    GenerarReporteRendimientoView,
    GenerarReporteCategoriasView
)
from .views.rotation_views import (
    RotacionProgramadaViewSet
)


router = DefaultRouter()
router.register(r'agentes', AgenteAdminViewSet, basename='admin-agentes')
router.register(r'roles', RolAdminViewSet, basename='admin-roles')
router.register(r'areas', AreaAdminViewSet, basename='admin-areas')
router.register(r'categorias', CategoryAdminViewSet, basename='admin-category-list')
router.register(r'prioridades', PriorityViewSet, basename='admin-prioridades')
router.register(r'slas', SLAViewSet, basename='admin-slas')
router.register(r'logs', SystemLogViewSet, basename='admin-logs')
router.register(r'rotaciones', RotacionProgramadaViewSet, basename='admin-rotaciones')
# Asegúrate de que esta línea apunte al AdminTicketViewSet de ticket_list_views.py
router.register(r'tickets', AdminTicketViewSet, basename='admin-tickets')

urlpatterns = [
    path("dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("filtros/tickets/", AdminTicketFilterOptionsView.as_view(), name="admin-ticket-filter-options"),
    
    path("configuracion/", ConfiguracionSistemaView.as_view(), name="admin-configuracion"),
    path("reportes/dashboard/", GenerarReporteDashboardView.as_view(), name="admin-reporte-dashboard"),
    path("reportes/tickets/", GenerarReporteTicketsView.as_view(), name="admin-reporte-tickets"),
    path("reportes/usuarios/", GenerarReporteUsuariosView.as_view(), name="admin-reporte-usuarios"),
    path("reportes/rendimiento/", GenerarReporteRendimientoView.as_view(), name="admin-reporte-rendimiento"),
    path("reportes/categorias/", GenerarReporteCategoriasView.as_view(), name="admin-reporte-categorias"),
    path("", include(router.urls)),
]