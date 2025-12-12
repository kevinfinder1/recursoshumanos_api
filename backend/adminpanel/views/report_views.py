# adminpanel/views/report_views.py
import os
import logging
from django.http import FileResponse, Http404
from django.conf import settings
from django.db.models import Count, Avg, Q, F
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..report_generator import (
    generar_excel_dashboard, generar_pdf_dashboard, 
    generar_excel_tickets, generar_pdf_tickets, 
    generar_excel_usuarios, generar_pdf_usuarios, 
    generar_excel_rendimiento, generar_pdf_rendimiento, 
    generar_excel_categorias, generar_pdf_categorias
)
from ..permissions import IsAdminRole
from ..utils_filters import filtrar_tickets  # 👈 USAR FILTRO UNIVERSAL
from tickets import models as ticket_models
from users.models import User
from ..models import AgentPerformance

logger = logging.getLogger(__name__)

class GenerarReporteDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, *args, **kwargs):
        formato = request.query_params.get('formato', 'xlsx').lower()
        rango = request.query_params.get('rango', '30dias')

        if formato not in ['xlsx', 'pdf']:
            return Response({'error': 'Formato no válido. Use "xlsx" o "pdf".'}, status=400)

        try:
            # Pasar el objeto request completo (DRF Request)
            from .admin_views import AdminDashboardView
            data = AdminDashboardView.get_dashboard_data(request)
        except Exception as e:
            print(f"ERROR DASHBOARD DATA: {e}")
            logger.error(f"Error obteniendo datos del dashboard: {str(e)}", exc_info=True)
            return Response(
                {'error': f'No se pudieron obtener las métricas del dashboard: {str(e)}'}, 
                status=500
            )

        try:
            if formato == 'xlsx':
                ruta_archivo = generar_excel_dashboard(data, rango)
            else:
                ruta_archivo = generar_pdf_dashboard(data, rango)
        except Exception as e:
            print(f"ERROR GENERATING DASHBOARD FILE: {e}")
            logger.error(f"Error generando archivo dashboard: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Error al generar el archivo de reporte: {str(e)}'}, 
                status=500
            )

        if os.path.exists(ruta_archivo):
            response = FileResponse(open(ruta_archivo, 'rb'), as_attachment=True)
            return response
        else:
            raise Http404("El archivo de reporte no fue encontrado.")

class GenerarReporteTicketsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, *args, **kwargs):
        formato = request.query_params.get('formato', 'xlsx').lower()

        if formato not in ['xlsx', 'pdf']:
            return Response({'error': 'Formato no válido. Use "xlsx" o "pdf".'}, status=400)

        try:
            # Usar filtro universal
            tickets_filtrados = filtrar_tickets(request)
            
            # Optimizar consulta
            tickets_filtrados = tickets_filtrados.select_related(
                'solicitante', 'agente', 'categoria_principal'
            )

            if formato == 'xlsx':
                ruta_archivo = generar_excel_tickets(tickets_filtrados)
            else:
                ruta_archivo = generar_pdf_tickets(tickets_filtrados)
        except Exception as e:
            print(f"ERROR GENERATING TICKETS REPORT: {e}")
            logger.error(f"Error generando reporte tickets: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Error al generar el archivo de reporte: {str(e)}'}, 
                status=500
            )

        if os.path.exists(ruta_archivo):
            return FileResponse(open(ruta_archivo, 'rb'), as_attachment=True)
        raise Http404("El archivo de reporte no fue encontrado.")

class GenerarReporteUsuariosView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, *args, **kwargs):
        formato = request.query_params.get('formato', 'xlsx').lower()

        if formato not in ['xlsx', 'pdf']:
            return Response({'error': 'Formato no válido. Use "xlsx" o "pdf".'}, status=400)

        try:
            usuarios = User.objects.all().order_by('username')

            if formato == 'xlsx':
                ruta_archivo = generar_excel_usuarios(usuarios)
            else:
                ruta_archivo = generar_pdf_usuarios(usuarios)
        except Exception as e:
            print(f"ERROR GENERATING USERS REPORT: {e}")
            logger.error(f"Error generando reporte usuarios: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Error al generar el archivo de reporte de usuarios: {str(e)}'}, 
                status=500
            )

        if os.path.exists(ruta_archivo):
            return FileResponse(open(ruta_archivo, 'rb'), as_attachment=True)
        raise Http404("El archivo de reporte no fue encontrado.")

class GenerarReporteRendimientoView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, *args, **kwargs):
        formato = request.query_params.get('formato', 'xlsx').lower()

        if formato not in ['xlsx', 'pdf']:
            return Response({'error': 'Formato no válido. Use "xlsx" o "pdf".'}, status=400)

        try:
            rendimiento = AgentPerformance.objects.select_related(
                'agente'
            ).all().order_by('-tickets_resueltos')

            if formato == 'xlsx':
                ruta_archivo = generar_excel_rendimiento(rendimiento)
            else:
                ruta_archivo = generar_pdf_rendimiento(rendimiento)
        except Exception as e:
            print(f"ERROR GENERATING PERFORMANCE REPORT: {e}")
            logger.error(f"Error generando reporte rendimiento: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Error al generar el archivo de reporte de rendimiento: {str(e)}'}, 
                status=500
            )

        if os.path.exists(ruta_archivo):
            return FileResponse(open(ruta_archivo, 'rb'), as_attachment=True)
        raise Http404("El archivo de reporte no fue encontrado.")

class GenerarReporteCategoriasView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, *args, **kwargs):
        formato = request.query_params.get('formato', 'xlsx').lower()

        if formato not in ['xlsx', 'pdf']:
            return Response({'error': 'Formato no válido. Use "xlsx" o "pdf".'}, status=400)

        try:
            # Obtener el queryset base
            categorias = ticket_models.CategoriaPrincipal.objects.filter(activo=True)

            # Aplicar filtro de categoría si se provee
            categoria_id = request.query_params.get('categoria')
            if categoria_id:
                categorias = categorias.filter(id=categoria_id)

            # Calcular métricas para cada categoría
            categorias_con_metricas = []
            for cat in categorias:
                tickets_de_categoria = ticket_models.Ticket.objects.filter(
                    categoria_principal=cat
                )
                
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
                
                cat_data = {
                    'id': cat.id,
                    'nombre': cat.nombre,
                    'descripcion': cat.descripcion,
                    'activo': cat.activo,
                    'total_tickets': metricas.get('total_tickets', 0),
                    'tickets_abiertos': metricas.get('tickets_abiertos', 0),
                    'tickets_resueltos': metricas.get('tickets_resueltos', 0),
                    'rating_promedio': round(metricas.get('rating_promedio', 0) or 0, 2),
                }
                
                tiempo_res = metricas.get('tiempo_promedio_resolucion_duration')
                if tiempo_res:
                    cat_data['tiempo_promedio_resolucion_horas'] = tiempo_res.total_seconds() / 3600
                else:
                    cat_data['tiempo_promedio_resolucion_horas'] = 0
                    
                categorias_con_metricas.append(cat_data)

            if formato == 'xlsx':
                ruta_archivo = generar_excel_categorias(categorias_con_metricas)
            else:
                ruta_archivo = generar_pdf_categorias(categorias_con_metricas)
        except Exception as e:
            print(f"ERROR GENERATING CATEGORIES REPORT: {e}")
            logger.error(f"Error generando reporte categorias: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Error al generar el archivo de reporte por categorías: {str(e)}'}, 
                status=500
            )

        if os.path.exists(ruta_archivo):
            return FileResponse(open(ruta_archivo, 'rb'), as_attachment=True)
        raise Http404("El archivo de reporte no fue encontrado.")