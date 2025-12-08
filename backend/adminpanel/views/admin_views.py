# admin_views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets, status, serializers
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import HttpResponse
from django.db.models import Count, Avg, Q, F, ExpressionWrapper, DurationField
from datetime import timedelta

from users.models import User, Rol, Area # Importar Rol y Area
from tickets.models import Ticket, CategoriaPrincipal # Ya se importa aquí
from ..models import Priority, AgentPerformance, Category, SystemLog
from .services import UserValidationService  # 👈 IMPORTAR NUEVO SERVICIO
from ..permissions import IsAdminRole # 👈 Importar el permiso personalizado
from ..admin_serializers import (
    AdminDashboardMetricsSerializer, AdminAgentPerformanceSerializer, AdminAgentCreateUpdateSerializer, 
    CategorySerializer, AdminUserListSerializer, CategoriaPrincipalSerializer, AreaSerializer, RolAdminSerializer,
    PrioritySerializer
)


class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole] # 👈 Usar el permiso personalizado

    def get(self, request):
        # Obtener el rango de fechas desde los parámetros GET
        rango = request.query_params.get('rango', 'total')
        categoria_id = request.query_params.get('categoria')  # 👈 NUEVO FILTRO
        hoy = timezone.now().date()
        
        # Aplicar filtro de rango de fechas universal
        tickets_filtrados = self.get_tickets_in_range(rango)

        # 👈 FILTRAR POR CATEGORÍA SI SE ESPECIFICA
        if categoria_id:
            tickets_filtrados = tickets_filtrados.filter(categoria_principal_id=categoria_id)

        # =============================
        # 🚀 CONSULTA ÚNICA CON AGREGACIÓN CONDICIONAL
        # =============================
        metricas = tickets_filtrados.aggregate(
            total_tickets=Count('id'),
            tickets_hoy=Count('id', filter=Q(fecha_creacion__date=hoy)),
            tickets_abiertos=Count('id', filter=Q(estado="Abierto")),
            tickets_en_progreso=Count('id', filter=Q(estado="En Proceso")),
            tickets_resueltos=Count('id', filter=Q(estado="Resuelto")),
            
            tickets_atrasados=Count('id', filter=Q(
                estado__in=["Abierto", "En Proceso"],
                fecha_creacion__lt=timezone.now() - ExpressionWrapper(F('tiempo_estimado_resolucion') * timedelta(hours=1), output_field=DurationField())
            )),
            
            promedio_rating=Avg('rating', filter=Q(rating__isnull=False)),
            
            # 🎯 CORRECCIÓN: Cálculo correcto del tiempo de resolución
            tiempo_promedio_resolucion=Avg(
                F('fecha_cierre') - F('fecha_creacion'),
                filter=Q(fecha_cierre__isnull=False)
            )
        )

        # Convertir timedelta a horas
        tiempo_prom_resolucion_horas = (metricas['tiempo_promedio_resolucion'].total_seconds() / 3600) if metricas['tiempo_promedio_resolucion'] else 0

        # =============================
        # RATING POR CATEGORÍA
        # =============================
        rating_por_categoria_qs = tickets_filtrados.filter(categoria_principal__isnull=False, rating__isnull=False)\
            .values('categoria_principal__nombre')\
            .annotate(promedio=Avg('rating'))\
            .order_by('-promedio')
        rating_por_categoria = {item['categoria_principal__nombre']: round(item['promedio'], 2) for item in rating_por_categoria_qs}

        # =============================
        # RATING POR AGENTE
        # =============================
        rating_por_agente_qs = tickets_filtrados.filter(agente__isnull=False, rating__isnull=False)\
            .values('agente__username')\
            .annotate(promedio=Avg('rating'))\
            .order_by('-promedio')
        rating_por_agente = {item['agente__username']: round(item['promedio'], 2) for item in rating_por_agente_qs}

        # =============================
        # TICKETS POR PRIORIDAD
        # =============================
        prioridad_stats = tickets_filtrados.values(
            "prioridad"
        ).annotate(total=Count("id")).order_by()
        tickets_por_prioridad = {item["prioridad"]: item["total"] for item in prioridad_stats if item["prioridad"]}

        # =============================
        # TICKETS POR CATEGORÍA
        # =============================
        categoria_stats = tickets_filtrados.values(
            "categoria_principal__nombre"
        ).annotate(total=Count("id")).order_by()
        tickets_por_categoria = {item["categoria_principal__nombre"] or "Sin Categoría": item["total"] for item in categoria_stats}

        # =============================
        # EFECTIVIDAD GLOBAL
        # =============================
        perf = AgentPerformance.objects.all()
        efectividad_global = (
            perf.aggregate(Avg("efectividad"))["efectividad__avg"] or 0
        )

        # =============================
        # CONSTRUIR RESPUESTA
        # =============================
        data = {
            "total_tickets": metricas.get('total_tickets', 0),
            "tickets_hoy": metricas.get('tickets_hoy', 0),
            "tickets_abiertos": metricas.get('tickets_abiertos', 0),
            "tickets_en_progreso": metricas.get('tickets_en_progreso', 0),
            "tickets_resueltos": metricas.get('tickets_resueltos', 0),
            "tickets_atrasados": metricas.get('tickets_atrasados', 0),

            "promedio_rating": round(metricas.get('promedio_rating') or 0, 2),
            "rating_por_categoria": rating_por_categoria,
            "rating_por_agente": rating_por_agente,

            "tickets_por_prioridad": tickets_por_prioridad,
            "tickets_por_categoria": tickets_por_categoria,

            "tiempo_promedio_resolucion": round(tiempo_prom_resolucion_horas, 2),
            "efectividad_global": round(efectividad_global, 2),
        }

        serializer = AdminDashboardMetricsSerializer(data)
        return Response(serializer.data)

    def get_tickets_in_range(self, rango):
        """Función auxiliar para filtrar tickets por rango de fecha."""
        hoy = timezone.now()
        if rango == "dia":
            return Ticket.objects.filter(fecha_creacion__date=hoy.date())
        elif rango == "semana":
            inicio = hoy - timedelta(days=hoy.weekday())
            return Ticket.objects.filter(fecha_creacion__gte=inicio)
        elif rango == "mes":
            return Ticket.objects.filter(fecha_creacion__year=hoy.year, fecha_creacion__month=hoy.month)
        elif rango == "anio":
            return Ticket.objects.filter(fecha_creacion__year=hoy.year)
        elif rango == "7dias":
            return Ticket.objects.filter(fecha_creacion__gte=hoy - timedelta(days=7))
        elif rango == "30dias":
            return Ticket.objects.filter(fecha_creacion__gte=hoy - timedelta(days=30))
        return Ticket.objects.all()


# ============================================================
#  VIEWSET PARA GESTIONAR AGENTES (CRUD)
# ============================================================
class UserPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class AgenteAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminRole]
    pagination_class = UserPagination

    def get_queryset(self):
        queryset = User.objects.all() # ✅ SOLUCIÓN: Mostrar todos los usuarios por defecto
        return self.aplicar_filtros(queryset)

    def aplicar_filtros(self, queryset):
        request = self.request
        
        # 📋 FILTRO POR ROL
        rol_id = request.query_params.get('rol')
        if rol_id:
            queryset = queryset.filter(rol_id=rol_id)
        
        # 📋 FILTRO POR ESTADO
        estado = request.query_params.get('estado')
        if estado == 'activo':
            queryset = queryset.filter(is_active=True)
        elif estado == 'inactivo':
            queryset = queryset.filter(is_active=False)
        
        # 📋 FILTRO POR FECHAS
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        if fecha_desde:
            queryset = queryset.filter(date_joined__date__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(date_joined__date__lte=fecha_hasta)
        
        # 🔍 BÚSQUEDA AVANZADA
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(rol__nombre_visible__icontains=search)
            )
        
        # 📊 ORDENAMIENTO
        orden = request.query_params.get('orden', '-date_joined')
        campos_validos = ['username', 'email', 'first_name', 'last_name', 'rol', 'date_joined', 'last_login']
        if orden.lstrip('-') in campos_validos:
            queryset = queryset.order_by(orden)
        
        return queryset

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AdminAgentCreateUpdateSerializer
        elif self.action == 'list':
            return AdminUserListSerializer
        elif self.action == 'retrieve':
            return AdminAgentCreateUpdateSerializer  # Para ver detalles
        return super().get_serializer_class()

    def list(self, request, *args, **kwargs):
        """
        Sobrescribir list para incluir metadata útil para React
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def get_paginated_response(self, data):
        """
        Respuesta paginada personalizada con metadata para React
        """
        paginator = self.paginator
        return Response({
            'pagination': {
                'count': paginator.page.paginator.count,
                'next': paginator.get_next_link(),
                'previous': paginator.get_previous_link(),
                'current_page': paginator.page.number,
                'total_pages': paginator.page.paginator.num_pages,
                'page_size': paginator.page_size
            },
            'results': data,
            'filtros_aplicados': self.obtener_filtros_aplicados()
        })

    def obtener_filtros_aplicados(self):
        """
        Obtener metadata de los filtros aplicados
        """
        request = self.request
        filtros = {}
        
        if request.query_params.get('rol'):
            filtros['rol'] = request.query_params.get('rol')
        if request.query_params.get('estado'):
            filtros['estado'] = request.query_params.get('estado')
        if request.query_params.get('search'):
            filtros['search'] = request.query_params.get('search')
        
        return filtros

    def create(self, request, *args, **kwargs):
        # ✅ SOLUCIÓN: Crear una copia mutable de request.data
        data = request.data.copy()
        username = data.get('username', '').strip().lower()
        email = data.get('email', '').strip().lower()
        data['username'] = username
        data['email'] = email
        
        preventive_errors = UserValidationService.check_duplicate_user(username, email)
        if preventive_errors:
            raise serializers.ValidationError(preventive_errors)
        
        serializer = self.get_serializer(data=data)
        
        # ✅ SOLUCIÓN: Añadir logging para depurar el error 400
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError as e:
            print("🚨 DEBUG: Error de validación al crear usuario.")
            print("   - Datos recibidos:", data)
            print("   - Errores del Serializer:", e.detail)
            # Re-lanzamos la excepción para que DRF devuelva el 400
            raise e
            
        user = serializer.save()
        
        SystemLog.objects.create(
            usuario=request.user,
            accion="CREATE",
            descripcion=f"Usuario creado: {user.username} ({user.rol.nombre_visible if user.rol else 'Sin rol'})",
            ip=self.get_client_ip(request)
        )
        
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'message': f'Usuario {user.username} creado exitosamente',
                'user': AdminUserListSerializer(user).data
            },
            status=status.HTTP_201_CREATED,
            headers=headers
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        # ✅ SOLUCIÓN: Crear una copia mutable de request.data
        data = request.data.copy()
        username = data.get('username', instance.username).strip().lower()
        email = data.get('email', instance.email).strip().lower()
        data['username'] = username
        data['email'] = email
        
        preventive_errors = UserValidationService.check_duplicate_user(
            username, email, instance.id
        )
        if preventive_errors:
            raise serializers.ValidationError(preventive_errors)
        
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        SystemLog.objects.create(
            usuario=request.user,
            accion="UPDATE",
            descripcion=f"Usuario actualizado: {user.username} ({user.rol.nombre_visible if user.rol else 'Sin rol'})",
            ip=self.get_client_ip(request)
        )

        return Response(
            {
                'message': f'Usuario {user.username} actualizado exitosamente',
                'user': AdminUserListSerializer(user).data
            }
        )

    def perform_destroy(self, instance):
        SystemLog.objects.create(
            usuario=self.request.user,
            accion="DELETE",
            descripcion=f"Usuario eliminado: {instance.username} ({instance.rol.nombre_visible if instance.rol else 'Sin rol'})",
            ip=self.get_client_ip(self.request)
        )
        
        if instance == self.request.user:
            raise serializers.ValidationError("No puedes eliminar tu propio perfil de usuario.")
        instance.delete()

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    @action(detail=False, methods=['get'])
    def opciones_filtro(self, request):
        """
        Devuelve opciones de filtro para los dropdowns en React
        """
        roles_con_count = User.objects.exclude(rol__tipo_base='solicitante').values('rol__id', 'rol__nombre_visible').annotate(
            total=Count('id')
        )
        
        total_activos = User.objects.exclude(rol__tipo_base='solicitante').filter(is_active=True).count()
        total_inactivos = User.objects.exclude(rol__tipo_base='solicitante').filter(is_active=False).count()
        
        return Response({
            'roles': [
                {
                    'value': item['rol__id'],
                    'label': item['rol__nombre_visible'],
                    'count': item['total']
                }
                for item in roles_con_count
            ],
            'estados': [
                {'value': 'activo', 'label': 'Activo', 'count': total_activos},
                {'value': 'inactivo', 'label': 'Inactivo', 'count': total_inactivos}
            ],
            'ordenamientos': [
                {'value': '-date_joined', 'label': 'Más recientes primero'},
                {'value': 'date_joined', 'label': 'Más antiguos primero'},
                {'value': 'username', 'label': 'Usuario (A-Z)'},
                {'value': '-username', 'label': 'Usuario (Z-A)'},
                {'value': 'first_name', 'label': 'Nombre (A-Z)'},
                {'value': '-first_name', 'label': 'Nombre (Z-A)'},
            ]
        })

    @action(detail=False, methods=['get'])
    def estadisticas_rapidas(self, request):
        """Estadísticas generales de usuarios"""
        total_usuarios = User.objects.exclude(rol__tipo_base='solicitante').count()
        usuarios_activos = User.objects.exclude(rol__tipo_base='solicitante').filter(is_active=True).count()
        
        # Usuarios registrados en los últimos 7 días
        ultima_semana = timezone.now() - timedelta(days=7)
        nuevos_7dias = User.objects.exclude(rol__tipo_base='solicitante').filter(
            date_joined__gte=ultima_semana
        ).count()
        
        # Usuarios que nunca han iniciado sesión
        nunca_login = User.objects.exclude(rol__tipo_base='solicitante').filter(
            last_login__isnull=True
        ).count()
        
        return Response({
            'total_usuarios': total_usuarios,
            'usuarios_activos': usuarios_activos,
            'usuarios_inactivos': total_usuarios - usuarios_activos,
            'nuevos_7dias': nuevos_7dias,
            'nunca_login': nunca_login,
            'porcentaje_activos': round((usuarios_activos / total_usuarios * 100) if total_usuarios > 0 else 0, 1)
        })

    @action(detail=False, methods=['post'])
    def validar_usuario(self, request):
        """
        Endpoint para validación en tiempo real antes de crear/actualizar
        """
        username = request.data.get('username', '').strip().lower()
        email = request.data.get('email', '').strip().lower()
        user_id = request.data.get('user_id')  # Para actualizaciones
        
        errors = UserValidationService.check_duplicate_user(
            username, email, user_id
        )
        
        # Validaciones adicionales
        if username and len(username) < 3:
            errors['username'] = "El usuario debe tener al menos 3 caracteres."
            
        if email and '@' not in email:
            errors['email'] = "Por favor ingresa un email válido."
        
        # Si hay errores de duplicado, generar sugerencias
        suggestions = {}
        if 'username' in errors and username:
            suggestions['username'] = UserValidationService.get_suggested_username(username)
            
        return Response({
            'is_valid': len(errors) == 0,
            'errors': errors,
            'suggestions': suggestions
        })

    @action(detail=False, methods=['get'])
    def verificar_disponibilidad(self, request):
        """
        Verificar disponibilidad de username o email específico
        """
        username = request.query_params.get('username', '').strip().lower()
        email = request.query_params.get('email', '').strip().lower()
        user_id = request.query_params.get('user_id')
        
        result = {
            'username_available': True,
            'email_available': True,
            'suggestions': []
        }
        
        if username:
            result['username_available'] = UserValidationService.validate_username_availability(
                username, user_id
            )
            if not result['username_available']:
                result['suggestions'] = UserValidationService.get_suggested_username(username)
                
        if email:
            result['email_available'] = UserValidationService.validate_email_availability(
                email, user_id
            )
            
        return Response(result)

    @action(detail=False, methods=['post'])
    def exportar_seleccion(self, request):
        """
        Exportar usuarios seleccionados (para checkboxes en React)
        """
        user_ids = request.data.get('user_ids', [])
        formato = request.data.get('formato', 'excel')
        
        if not user_ids:
            return Response(
                {'error': 'No se seleccionaron usuarios para exportar'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        usuarios = User.objects.filter(id__in=user_ids)
        
        if formato == 'excel':
            return self.exportar_excel(usuarios)
        elif formato == 'pdf':
            return self.exportar_pdf(usuarios)
        else:
            return Response(
                {'error': 'Formato no válido. Use "excel" o "pdf"'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def exportar_excel(self, usuarios):
        """Exportar a Excel (usando tu función existente pero adaptada)"""
        from datetime import datetime
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment
        
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Usuarios Exportados"
        
        # Estilos
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        
        # Encabezados optimizados para React
        headers = ['ID', 'Usuario', 'Email', 'Nombre Completo', 'Rol', 'Estado', 'Fecha Registro']
        
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
        
        # Datos
        for row, usuario in enumerate(usuarios, 2):
            nombre_completo = f"{usuario.first_name or ''} {usuario.last_name or ''}".strip()
            
            data = [
                usuario.id,
                usuario.username,
                usuario.email,
                nombre_completo or usuario.username, # Corregido
                usuario.rol.nombre_visible if usuario.rol else 'Sin rol',
                'Activo' if usuario.is_active else 'Inactivo',
                usuario.date_joined.strftime('%Y-%m-%d %H:%M') if usuario.date_joined else ''
            ]
            
            for col, value in enumerate(data, 1):
                ws.cell(row=row, column=col, value=value)
        
        # Ajustar columnas
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 30)
            ws.column_dimensions[column_letter].width = adjusted_width
        
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        filename = f"usuarios_exportados_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        response['Content-Disposition'] = f'attachment; filename={filename}'
        
        wb.save(response)
        return response

    @action(detail=True, methods=['post'])
    def toggle_activo(self, request, pk=None):
        """
        Alternar estado activo/inactivo de un usuario (para toggle switches en React)
        """
        usuario = self.get_object()
        nuevo_estado = not usuario.is_active
        usuario.is_active = nuevo_estado
        usuario.save()
        
        # Log de la acción
        SystemLog.objects.create(
            usuario=request.user,
            accion="UPDATE",
            descripcion=f"Estado de usuario {usuario.username} cambiado a {'Activo' if nuevo_estado else 'Inactivo'}",
            ip=self.get_client_ip(request)
        )
        
        return Response({
            'message': f'Usuario {"activado" if nuevo_estado else "desactivado"} exitosamente',
            'nuevo_estado': nuevo_estado,
            'usuario': AdminUserListSerializer(usuario).data
        })

class CategoryAdminViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar categorías del sistema.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]
    queryset = CategoriaPrincipal.objects.all() # Usar todos para poder ver y editar inactivos
    pagination_class = None  # 👈 DESHABILITAR PAGINACIÓN PARA ESTA VISTA
    serializer_class = CategoriaPrincipalSerializer
    
    def perform_create(self, serializer):
        serializer.save()
        # Log de creación
        SystemLog.objects.create(
            usuario=self.request.user,
            accion="CREATE",
            descripcion=f"Categoría creada: {serializer.validated_data['nombre']}",
            ip=self.get_client_ip()
        )
    
    def perform_update(self, serializer):
        serializer.save()
        # Log de actualización
        SystemLog.objects.create(
            usuario=self.request.user,
            accion="UPDATE",
            descripcion=f"Categoría actualizada: {serializer.validated_data['nombre']}",
            ip=self.get_client_ip()
        )
    
    def perform_destroy(self, instance):
        nombre = instance.nombre
        instance.delete()
        # Log de eliminación
        SystemLog.objects.create(
            usuario=self.request.user,
            accion="DELETE",
            descripcion=f"Categoría eliminada: {nombre}",
            ip=self.get_client_ip()
        )
    
    def get_client_ip(self):
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
        return ip

class RolAdminViewSet(viewsets.ModelViewSet):
    """
    ViewSet para que el admin gestione los roles del sistema.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]
    queryset = Rol.objects.all()
    serializer_class = RolAdminSerializer # ✅ Usar el serializer correcto

class AreaAdminViewSet(viewsets.ModelViewSet):
    """
    ViewSet para que el admin gestione las áreas/departamentos.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]
    queryset = Area.objects.all()
    # Necesitaremos un AreaSerializer, lo crearemos en el siguiente paso.
    # Por ahora, podemos usar un serializer genérico o crearlo.
    serializer_class = AreaSerializer

class PriorityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet de solo lectura para obtener la lista de prioridades.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]
    queryset = Priority.objects.all().order_by('nivel')
    serializer_class = PrioritySerializer
    pagination_class = None # No paginar las prioridades
