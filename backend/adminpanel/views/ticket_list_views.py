from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q

from tickets.models import Ticket, CategoriaPrincipal
from users.models import User
from ..models import Priority
from ..admin_serializers import AdminTicketSerializer, AdminTicketUpdateSerializer
from ..utils_filters import filtrar_tickets
from ..permissions import IsAdminRole


class AdminTicketViewSet(viewsets.ModelViewSet):
    """
    ViewSet COMPLETO para tickets del administrador (CRUD)
    """
    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = AdminTicketSerializer

    def get_queryset(self):
        # Iniciamos con todos los tickets optimizados
        queryset = Ticket.objects.select_related(
            "solicitante", "agente", "categoria_principal", 
            "subcategoria"
        ).all()

        # --- APLICAR FILTROS EXPLÍCITAMENTE ---
        params = self.request.query_params

        # 1. Búsqueda (Search)
        search = params.get('search')
        if search:
            if search.isdigit():
                queryset = queryset.filter(id=search)
            else:
                queryset = queryset.filter(
                    Q(titulo__icontains=search) |
                    Q(descripcion__icontains=search) |
                    Q(solicitante__username__icontains=search) |
                    Q(solicitante__email__icontains=search)
                )

        # 2. Estado
        estado = params.get('estado')
        if estado:
            queryset = queryset.filter(estado=estado)

        # 3. Categoría (ID)
        categoria = params.get('categoria')
        if categoria:
            queryset = queryset.filter(categoria_principal_id=categoria)

        # 4. Agente (ID)
        agente = params.get('agente')
        if agente:
            queryset = queryset.filter(agente_id=agente)

        # 5. Prioridad (Manejo especial ID -> Nombre)
        prioridad_id = params.get('prioridad')
        if prioridad_id and str(prioridad_id).isdigit(): # ✅ Validación extra
            try:
                prio_obj = Priority.objects.get(id=prioridad_id)
                # Filtramos por el nombre ya que el modelo Ticket guarda el string
                queryset = queryset.filter(prioridad=prio_obj.nombre)
            except (Priority.DoesNotExist, ValueError):
                pass

        # 6. Ordenamiento
        orden = params.get('orden', '-fecha_creacion')
        if orden:
            # Validar campos permitidos para evitar errores
            if orden.lstrip('-') in ['fecha_creacion', 'prioridad', 'estado', 'id', 'fecha_actualizacion']:
                queryset = queryset.order_by(orden)
        
        return queryset

    def get_serializer_class(self):
        # Para actualizaciones usar AdminTicketUpdateSerializer
        if self.request.method in ['PUT', 'PATCH']:
            return AdminTicketUpdateSerializer
        return AdminTicketSerializer

# Mantener esta vista SI el frontend ya la usa
class AdminTicketFilterOptionsView(APIView):
    """
    Vista alternativa para opciones de filtro (para compatibilidad)
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, *args, **kwargs):

        estados = [choice[0] for choice in Ticket.ESTADO_CHOICES]
        prioridades = Priority.objects.all().values('id', 'nombre')
        categorias = CategoriaPrincipal.objects.filter(activo=True).values('id', 'nombre')
        agentes = User.objects.filter(
            rol__tipo_base__in=['agente', 'admin'],
            is_active=True
        ).values('id', 'username')

        response_data = {
            'estados': estados,
            'prioridades': list(prioridades),
            'categorias': list(categorias),
            'agentes': list(agentes)
        }
        
        return Response(response_data, status=status.HTTP_200_OK)