import os
from django.http import FileResponse, Http404
from django.conf import settings
from django.db.models import Count, Avg, Q, F
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..report_generator import generar_excel_dashboard, generar_pdf_dashboard, generar_excel_tickets, generar_pdf_tickets, generar_excel_usuarios, generar_pdf_usuarios, generar_excel_rendimiento, generar_pdf_rendimiento, generar_excel_categorias, generar_pdf_categorias
from .admin_views import AdminDashboardView
from ..permissions import IsAdminRole
from ..utils_filters import filtrar_tickets
from tickets import models as ticket_models 
from users.models import User
from ..models import AgentPerformance, Category 

class GenerarReporteDashboardView(APIView):
    """
    Genera y sirve reportes del dashboard en formato Excel o PDF.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, *args, **kwargs):
        # 1. Obtener parámetros de la URL
        formato = request.query_params.get('formato', 'xlsx').lower()
        rango = request.query_params.get('rango', '30dias') # Para dashboard

        if formato not in ['xlsx', 'pdf']:
            return Response({'error': 'Formato no válido. Use "xlsx" o "pdf".'}, status=400)

        # 2. Obtener los datos del dashboard
        # Reutilizamos la lógica de la vista del dashboard para obtener las métricas
        dashboard_view = AdminDashboardView()
        # Simulamos una request para la vista de métricas
        dashboard_request = self.request._request
        dashboard_request.query_params = {'rango': rango}
        
        try:
            metricas_response = dashboard_view.get(dashboard_request)
            data = metricas_response.data
        except Exception as e:
            return Response({'error': f'No se pudieron obtener las métricas del dashboard: {str(e)}'}, status=500)

        # 3. Generar el reporte
        try:
            if formato == 'xlsx':
                ruta_archivo = generar_excel_dashboard(data, rango)
            else: # pdf
                ruta_archivo = generar_pdf_dashboard(data, rango)
        except Exception as e:
            return Response({'error': f'Error al generar el archivo de reporte: {str(e)}'}, status=500)

        # 4. Servir el archivo generado
        if os.path.exists(ruta_archivo):
            response = FileResponse(open(ruta_archivo, 'rb'), as_attachment=True)
            return response
        else:
            raise Http404("El archivo de reporte no fue encontrado.")

class GenerarReporteTicketsView(APIView):
    """
    Genera y sirve reportes de listado de tickets.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, *args, **kwargs):
        formato = request.query_params.get('formato', 'xlsx').lower()

        if formato not in ['xlsx', 'pdf']:
            return Response({'error': 'Formato no válido. Use "xlsx" o "pdf".'}, status=400)

        # Reutilizamos el filtro universal de tickets
        tickets_filtrados = filtrar_tickets(request)

        try:
            if formato == 'xlsx':
                ruta_archivo = generar_excel_tickets(tickets_filtrados)
            else: # pdf
                ruta_archivo = generar_pdf_tickets(tickets_filtrados)
        except Exception as e:
            return Response({'error': f'Error al generar el archivo de reporte: {str(e)}'}, status=500)

        if os.path.exists(ruta_archivo):
            return FileResponse(open(ruta_archivo, 'rb'), as_attachment=True)
        raise Http404("El archivo de reporte no fue encontrado.")

class GenerarReporteUsuariosView(APIView):
    """
    Genera y sirve reportes de listado de usuarios.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, *args, **kwargs):
        formato = request.query_params.get('formato', 'xlsx').lower()

        if formato not in ['xlsx', 'pdf']:
            return Response({'error': 'Formato no válido. Use "xlsx" o "pdf".'}, status=400)

        # Por ahora, obtenemos todos los usuarios. Se pueden añadir filtros si es necesario.
        usuarios = User.objects.all().order_by('username')

        try:
            if formato == 'xlsx':
                ruta_archivo = generar_excel_usuarios(usuarios)
            else: # pdf
                ruta_archivo = generar_pdf_usuarios(usuarios)
        except Exception as e:
            return Response({'error': f'Error al generar el archivo de reporte de usuarios: {str(e)}'}, status=500)

        if os.path.exists(ruta_archivo):
            return FileResponse(open(ruta_archivo, 'rb'), as_attachment=True)
        raise Http404("El archivo de reporte no fue encontrado.")

class GenerarReporteRendimientoView(APIView):
    """
    Genera y sirve reportes de rendimiento de agentes.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, *args, **kwargs):
        formato = request.query_params.get('formato', 'xlsx').lower()

        if formato not in ['xlsx', 'pdf']:
            return Response({'error': 'Formato no válido. Use "xlsx" o "pdf".'}, status=400)

        # Obtenemos los datos de rendimiento, se pueden añadir filtros si es necesario
        rendimiento = AgentPerformance.objects.select_related('agente').all().order_by('-tickets_resueltos')

        try:
            if formato == 'xlsx':
                ruta_archivo = generar_excel_rendimiento(rendimiento)
            else: # pdf
                ruta_archivo = generar_pdf_rendimiento(rendimiento)
        except Exception as e:
            return Response({'error': f'Error al generar el archivo de reporte de rendimiento: {str(e)}'}, status=500)

        if os.path.exists(ruta_archivo):
            return FileResponse(open(ruta_archivo, 'rb'), as_attachment=True)
        raise Http404("El archivo de reporte no fue encontrado.")
class GenerarReporteCategoriasView(APIView):
    """
    Genera y sirve reportes con métricas por categoría.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, *args, **kwargs):
        formato = request.query_params.get('formato', 'xlsx').lower()

        if formato not in ['xlsx', 'pdf']:
            return Response({'error': 'Formato no válido. Use "xlsx" o "pdf".'}, status=400)

        # Obtener el queryset base
        categorias = ticket_models.CategoriaPrincipal.objects.filter(activo=True)

        # Aplicar filtro de categoría si se provee
        categoria_id = request.query_params.get('categoria')
        if categoria_id:
            categorias = categorias.filter(id=categoria_id)

        # Calculamos las métricas para cada categoría de forma explícita
        for cat in categorias:
            tickets_de_categoria = ticket_models.Ticket.objects.filter(categoria_principal=cat)
            
            metricas = tickets_de_categoria.aggregate(
                total_tickets=Count('id'),
                tickets_abiertos=Count('id', filter=Q(estado__in=['Abierto', 'En Proceso'])),
                tickets_resueltos=Count('id', filter=Q(estado='Resuelto')),
                rating_promedio=Avg('rating', filter=Q(rating__isnull=False)),
                tiempo_promedio_resolucion_duration=Avg(
                    F('fecha_cierre') - F('fecha_creacion'),
                    filter=Q(fecha_cierre__isnull=False)
                )
            )
            
            # Asignamos las métricas calculadas al objeto de categoría
            cat.total_tickets = metricas.get('total_tickets', 0)
            cat.tickets_abiertos = metricas.get('tickets_abiertos', 0)
            cat.tickets_resueltos = metricas.get('tickets_resueltos', 0)
            cat.rating_promedio = metricas.get('rating_promedio', 0)
            cat.tiempo_promedio_resolucion_duration = metricas.get('tiempo_promedio_resolucion_duration')

            if cat.tiempo_promedio_resolucion_duration:
                cat.tiempo_promedio_resolucion_horas = cat.tiempo_promedio_resolucion_duration.total_seconds() / 3600
            else:
                cat.tiempo_promedio_resolucion_horas = 0
        # Generar el reporte (La lógica aquí es correcta)
        try:
            if formato == 'xlsx':
                ruta_archivo = generar_excel_categorias(categorias)
            else: # pdf
                ruta_archivo = generar_pdf_categorias(categorias)
        except Exception as e:
            print("🚨 ERROR AL GENERAR REPORTE DE CATEGORÍAS:", e) 
            import traceback
            traceback.print_exc() 
            return Response({'error': f'Error al generar el archivo de reporte por categorías: {str(e)}'}, status=500)

        if os.path.exists(ruta_archivo):
            return FileResponse(open(ruta_archivo, 'rb'), as_attachment=True)
        raise Http404("El archivo de reporte no fue encontrado.")

