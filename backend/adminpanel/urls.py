# admin_urls.py
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
    AdminTicketListView, 
    AdminTicketDetailView,
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

# 1. Crear un router para registrar las ViewSets
router = DefaultRouter()
router.register(r'agentes', AgenteAdminViewSet, basename='admin-agentes')
router.register(r'roles', RolAdminViewSet, basename='admin-roles')
router.register(r'areas', AreaAdminViewSet, basename='admin-areas')
router.register(r'categorias', CategoryAdminViewSet, basename='admin-category-list')
# --- NUEVOS ENDPOINTS DE CONFIGURACIÓN ---
router.register(r'prioridades', PriorityViewSet, basename='admin-prioridades')
router.register(r'slas', SLAViewSet, basename='admin-slas')
router.register(r'logs', SystemLogViewSet, basename='admin-logs')
router.register(r'rotaciones', RotacionProgramadaViewSet, basename='admin-rotaciones')


urlpatterns = [
    path("dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("tickets/", AdminTicketListView.as_view(), name="admin-ticket-list"),
    path("tickets/opciones_filtro/", AdminTicketFilterOptionsView.as_view(), name="admin-ticket-filter-options"),
    path("tickets/<int:id>/", AdminTicketDetailView.as_view(), name="admin-ticket-detail"),
    # Endpoint para la configuración del sistema (Singleton)
    path("configuracion/", ConfiguracionSistemaView.as_view(), name="admin-configuracion"),
    # Endpoints para la generación de reportes
    path("reportes/dashboard/", GenerarReporteDashboardView.as_view(), name="admin-reporte-dashboard"),
    path("reportes/tickets/", GenerarReporteTicketsView.as_view(), name="admin-reporte-tickets"),
    path("reportes/usuarios/", GenerarReporteUsuariosView.as_view(), name="admin-reporte-usuarios"),
    path("reportes/rendimiento/", GenerarReporteRendimientoView.as_view(), name="admin-reporte-rendimiento"),
    path("reportes/categorias/", GenerarReporteCategoriasView.as_view(), name="admin-reporte-categorias"),
    # 2. Incluir las URLs generadas por el router
    path("", include(router.urls)),
]
