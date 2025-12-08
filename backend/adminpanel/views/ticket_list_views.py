from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from tickets.models import Ticket, CategoriaPrincipal
from users.models import User
from ..models import Priority # ✅ SOLUCIÓN: Importar Priority desde la app correcta (adminpanel)
from ..admin_serializers import AdminTicketSerializer, AdminTicketUpdateSerializer, AdminUserMiniSerializer # 👈 Importar el nuevo serializer
from ..utils_filters import filtrar_tickets   # 👈 tu filtro universal
from ..permissions import IsAdminRole

# --- AÑADIDO ---
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
# --- FIN AÑADIDO ---

class AdminTicketListView(ListAPIView):
    """
    Lista global de tickets para el administrador.
    Incluye paginación, filtros GET avanzados y ordenamiento.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = AdminTicketSerializer

    def get_queryset(self):
        # 1️⃣ Aplicar el filtro universal
        tickets = filtrar_tickets(self.request)

        # 2️⃣ Optimizar consultas
        tickets = tickets.select_related(
            "solicitante", "agente",
            "categoria_principal", "subcategoria",
            "prioridad"
        ).order_by("-fecha_creacion")

        return tickets

# --- AÑADIDO ---
# Vista para ver y actualizar un ticket específico
class AdminTicketDetailView(RetrieveUpdateAPIView):
    """
    Vista para que un administrador vea los detalles de un ticket
    y pueda reasignar agente, cambiar estado o prioridad.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]
    # CORRECCIÓN: Especificar el serializer principal para la vista.
    serializer_class = AdminTicketSerializer 
    queryset = Ticket.objects.select_related(
        "solicitante", "agente", "categoria_principal", "subcategoria"
    ).all()
    lookup_field = 'id' # Para buscar por /tickets/{id}/

    def get_serializer_class(self):
        """
        Elige el serializer según la acción: uno para leer (GET) y otro para escribir (PATCH).
        """
        # Para leer (GET), usamos el serializer que muestra todo
        if self.request.method == 'GET':
            return AdminTicketSerializer
        # Para escribir (PATCH, PUT), usamos el serializer de actualización
        return AdminTicketUpdateSerializer
# --- FIN AÑADIDO ---

# --- AÑADIDO: Vista para las opciones de los filtros ---
class AdminTicketFilterOptionsView(APIView):
    """
    Devuelve las opciones disponibles para los filtros de la lista de tickets.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, *args, **kwargs):
        # Opciones para el estado (son fijas en el modelo Ticket)
        estados = [choice[0] for choice in Ticket.ESTADO_CHOICES]

        # Opciones para Prioridad
        prioridades = Priority.objects.all().values('id', 'nombre')

        # Opciones para Categoría
        categorias = CategoriaPrincipal.objects.filter(activo=True).values('id', 'nombre')

        # Opciones para Agentes
        agentes = User.objects.filter(
            rol__tipo_base__in=['agente', 'admin'],
            is_active=True
        ).values('id', 'username')

        data = {
            'estados': estados,
            'prioridades': list(prioridades),
            'categorias': list(categorias),
            'agentes': list(agentes)
        }
        return Response(data, status=status.HTTP_200_OK)
