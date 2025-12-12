# adminpanel/views/admin_views.py
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
import openpyxl
from openpyxl.styles import Font, PatternFill
from datetime import datetime

from users.models import User, Rol, Area
from tickets.models import Ticket, CategoriaPrincipal
from ..models import Priority, AgentPerformance, Category, SystemLog
from ..permissions import IsAdminRole
from ..admin_serializers import (
    AdminDashboardMetricsSerializer, AdminAgentPerformanceSerializer, 
    AdminAgentCreateUpdateSerializer, CategorySerializer, AdminUserListSerializer, 
    CategoriaPrincipalSerializer, AreaSerializer, RolAdminSerializer,
    PrioritySerializer, AdminTicketSerializer
)
from ..utils_filters import filtrar_tickets  # 👈 IMPORTAR FILTRO UNIVERSAL
from ..services import UserValidationService  # 👈 Importar servicio de validación

class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        data = self.get_dashboard_data(request)
        serializer = AdminDashboardMetricsSerializer(data)
        return Response(serializer.data)

    @staticmethod
    def get_dashboard_data(request):
        # Obtener el rango de fechas desde los parámetros GET
        rango = request.query_params.get('rango', 'total')
        categoria_id = request.query_params.get('categoria')
        hoy = timezone.now().date()
        
        # Usar filtro universal como base
        tickets_filtrados = filtrar_tickets(request)
        
        # Aplicar filtro de rango adicional
        tickets_filtrados = AdminDashboardView.get_tickets_in_range(tickets_filtrados, rango)

        # Filtrar por categoría si se especifica
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
                fecha_creacion__lt=timezone.now() - ExpressionWrapper(
                    F('tiempo_estimado_resolucion') * timedelta(hours=1), 
                    output_field=DurationField()
                )
            )),
            
            promedio_rating=Avg('rating', filter=Q(rating__isnull=False)),
            
            tiempo_promedio_resolucion=Avg(
                F('fecha_cierre') - F('fecha_creacion'),
                filter=Q(fecha_cierre__isnull=False)
            )
        )

        # Convertir timedelta a horas
        tiempo_prom_resolucion = metricas.get('tiempo_promedio_resolucion')
        if tiempo_prom_resolucion:
            tiempo_prom_resolucion_horas = tiempo_prom_resolucion.total_seconds() / 3600
        else:
            tiempo_prom_resolucion_horas = 0

        # =============================
        # RATING POR CATEGORÍA
        # =============================
        rating_por_categoria_qs = tickets_filtrados.filter(
            categoria_principal__isnull=False, 
            rating__isnull=False
        ).values('categoria_principal__nombre').annotate(
            promedio=Avg('rating')
        ).order_by('-promedio')
        
        rating_por_categoria = {
            item['categoria_principal__nombre']: round(item['promedio'], 2) 
            for item in rating_por_categoria_qs
        }

        # =============================
        # RATING POR AGENTE
        # =============================
        rating_por_agente_qs = tickets_filtrados.filter(
            agente__isnull=False, 
            rating__isnull=False
        ).values('agente__username').annotate(
            promedio=Avg('rating')
        ).order_by('-promedio')
        
        rating_por_agente = {
            item['agente__username']: round(item['promedio'], 2) 
            for item in rating_por_agente_qs
        }

        # =============================
        # TICKETS POR PRIORIDAD
        # =============================
        prioridad_stats = tickets_filtrados.values(
            "prioridad"
        ).annotate(total=Count("id")).order_by()
        
        tickets_por_prioridad = {
            item["prioridad"] or "Sin Prioridad": item["total"] 
            for item in prioridad_stats
        }

        # =============================
        # TICKETS POR CATEGORÍA
        # =============================
        categoria_stats = tickets_filtrados.values(
            "categoria_principal__nombre"
        ).annotate(total=Count("id")).order_by()
        
        tickets_por_categoria = {
            item["categoria_principal__nombre"] or "Sin Categoría": item["total"] 
            for item in categoria_stats
        }

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
        
        return data

    @staticmethod
    def get_tickets_in_range(base_queryset, rango):
        """Aplicar filtro de rango sobre un queryset ya filtrado"""
        hoy = timezone.now()
        if rango == "dia":
            return base_queryset.filter(fecha_creacion__date=hoy.date())
        elif rango == "semana":
            inicio = hoy - timedelta(days=hoy.weekday())
            return base_queryset.filter(fecha_creacion__gte=inicio)
        elif rango == "mes":
            return base_queryset.filter(
                fecha_creacion__year=hoy.year, 
                fecha_creacion__month=hoy.month
            )
        elif rango == "anio":
            return base_queryset.filter(fecha_creacion__year=hoy.year)
        elif rango == "7dias":
            return base_queryset.filter(fecha_creacion__gte=hoy - timedelta(days=7))
        elif rango == "30dias":
            return base_queryset.filter(fecha_creacion__gte=hoy - timedelta(days=30))
        return base_queryset

# ============================================================
#  VIEWSET PARA GESTIONAR AGENTES (CRUD)
# ============================================================
class UserPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class UserListWithRoleSerializer(AdminUserListSerializer):
    role = RolAdminSerializer(source='rol', read_only=True)

    class Meta(AdminUserListSerializer.Meta):
        fields = list(getattr(AdminUserListSerializer.Meta, 'fields', [])) + ['role']

class AgenteAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminRole]
    pagination_class = UserPagination
    queryset = User.objects.select_related('rol').all()

    def get_queryset(self):
        queryset = super().get_queryset()
        return self.aplicar_filtros(queryset)

    def aplicar_filtros(self, queryset):
        request = self.request
        
        # 📋 FILTRO POR ROL
        rol_id = request.query_params.get('rol') or request.query_params.get('role')
        if rol_id:
            queryset = queryset.filter(rol__id=rol_id)
        
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
        campos_validos = ['username', 'email', 'first_name', 'last_name', 
                         'rol', 'date_joined', 'last_login']
        if orden.lstrip('-') in campos_validos:
            queryset = queryset.order_by(orden)
        
        return queryset

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AdminAgentCreateUpdateSerializer
        elif self.action == 'list':
            return UserListWithRoleSerializer
        return AdminAgentCreateUpdateSerializer

    def create(self, request, *args, **kwargs):
        # ✅ CORRECCIÓN: Usar el servicio correctamente
        data = request.data.copy()
        
        # Convertir string vacío a None para evitar error de unicidad en numero_documento
        if 'numero_documento' in data and data['numero_documento'] == '':
            data['numero_documento'] = None
            
        # Convertir string vacío a None para evitar error de unicidad en codigo_empleado
        if 'codigo_empleado' in data and data['codigo_empleado'] == '':
            data['codigo_empleado'] = None
            
        username = data.get('username', '').strip().lower()
        email = data.get('email', '').strip().lower()
        
        # Validar duplicados ANTES de crear
        preventive_errors = UserValidationService.check_duplicate_user(username, email)
        if preventive_errors:
            raise serializers.ValidationError(preventive_errors)
        
        # Continuar con la creación...
        data['username'] = username
        data['email'] = email
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Log de la acción
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
        data = request.data.copy()
        
        # Convertir string vacío a None para evitar error de unicidad en numero_documento
        if 'numero_documento' in data and data['numero_documento'] == '':
            data['numero_documento'] = None

        # Convertir string vacío a None para evitar error de unicidad en codigo_empleado
        if 'codigo_empleado' in data and data['codigo_empleado'] == '':
            data['codigo_empleado'] = None

        username = data.get('username', instance.username).strip().lower()
        email = data.get('email', instance.email).strip().lower()
        
        # ✅ CORRECCIÓN: Usar el servicio con el ID del usuario actual
        preventive_errors = UserValidationService.check_duplicate_user(
            username, email, instance.id  # ← Pasar el ID para excluirlo
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

    @action(detail=False, methods=['post'])
    def validar_usuario(self, request):
        """
        Endpoint para validación en tiempo real antes de crear/actualizar
        """
        username = request.data.get('username', '').strip().lower()
        email = request.data.get('email', '').strip().lower()
        user_id = request.data.get('user_id')  # Para actualizaciones
        
        # ✅ Usar el servicio
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
            # ✅ Usar el método específico del servicio
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

    @action(detail=True, methods=['post'])
    def toggle_activo(self, request, pk=None):
        """
        Acción para activar/desactivar un usuario rápidamente.
        """
        user = self.get_object()
        
        if user == request.user:
            return Response(
                {'error': 'No puedes desactivar tu propio usuario.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        user.is_active = not user.is_active
        user.save()
        
        estado = "activado" if user.is_active else "desactivado"
        
        SystemLog.objects.create(
            usuario=request.user,
            accion="UPDATE",
            descripcion=f"Usuario {user.username} ha sido {estado}.",
            ip=self.get_client_ip(request)
        )
        
        return Response({
            'message': f'Usuario {user.username} {estado} exitosamente',
            'is_active': user.is_active
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        if instance == request.user:
            return Response(
                {'error': 'No puedes eliminar tu propio perfil de usuario.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        SystemLog.objects.create(
            usuario=request.user,
            accion="DELETE",
            descripcion=f"Usuario eliminado: {instance.username}",
            ip=self.get_client_ip(request)
        )
        
        return super().destroy(request, *args, **kwargs)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    @action(detail=False, methods=['get'])
    def opciones_filtro(self, request):
        roles_con_count = User.objects.exclude(
            rol__tipo_base='solicitante'
        ).values('rol__id', 'rol__nombre_visible').annotate(
            total=Count('id')
        )
        
        total_activos = User.objects.exclude(
            rol__tipo_base='solicitante'
        ).filter(is_active=True).count()
        
        total_inactivos = User.objects.exclude(
            rol__tipo_base='solicitante'
        ).filter(is_active=False).count()
        
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
            ]
        })

    @action(detail=False, methods=['get'])
    def estadisticas_rapidas(self, request):
        total_usuarios = User.objects.exclude(
            rol__tipo_base='solicitante'
        ).count()
        
        usuarios_activos = User.objects.exclude(
            rol__tipo_base='solicitante'
        ).filter(is_active=True).count()
        
        ultima_semana = timezone.now() - timedelta(days=7)
        nuevos_7dias = User.objects.exclude(
            rol__tipo_base='solicitante'
        ).filter(date_joined__gte=ultima_semana).count()
        
        nunca_login = User.objects.exclude(
            rol__tipo_base='solicitante'
        ).filter(last_login__isnull=True).count()
        
        return Response({
            'total_usuarios': total_usuarios,
            'usuarios_activos': usuarios_activos,
            'usuarios_inactivos': total_usuarios - usuarios_activos,
            'nuevos_7dias': nuevos_7dias,
            'nunca_login': nunca_login,
            'porcentaje_activos': round(
                (usuarios_activos / total_usuarios * 100) if total_usuarios > 0 else 0, 
                1
            )
        })

class CategoryAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminRole]
    queryset = CategoriaPrincipal.objects.all()
    pagination_class = None
    serializer_class = CategoriaPrincipalSerializer
    
    def perform_create(self, serializer):
        categoria = serializer.save()
        SystemLog.objects.create(
            usuario=self.request.user,
            accion="CREATE",
            descripcion=f"Categoría creada: {categoria.nombre}",
            ip=self.get_client_ip(self.request)
        )
    
    def perform_update(self, serializer):
        categoria = serializer.save()
        SystemLog.objects.create(
            usuario=self.request.user,
            accion="UPDATE",
            descripcion=f"Categoría actualizada: {categoria.nombre}",
            ip=self.get_client_ip(self.request)
        )
    
    def perform_destroy(self, instance):
        nombre = instance.nombre
        instance.delete()
        SystemLog.objects.create(
            usuario=self.request.user,
            accion="DELETE",
            descripcion=f"Categoría eliminada: {nombre}",
            ip=self.get_client_ip(self.request)
        )

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class RolAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminRole]
    queryset = Rol.objects.all()
    serializer_class = RolAdminSerializer

class AreaAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminRole]
    queryset = Area.objects.all()
    serializer_class = AreaSerializer