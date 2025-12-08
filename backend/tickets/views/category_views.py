from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from tickets.models import CategoriaPrincipal, Subcategoria
from tickets.serializers import CategoriaPrincipalSerializer, SubcategoriaSerializer
from tickets.permissions import IsAdminOrReadOnly

class CategoriaPrincipalViewSet(viewsets.ModelViewSet):
    """
    Vista para gestionar categorías principales
    """
    queryset = CategoriaPrincipal.objects.filter(activo=True).order_by('orden')
    serializer_class = CategoriaPrincipalSerializer
    permission_classes = [IsAdminOrReadOnly]

    @action(detail=True, methods=['get'])
    def subcategorias(self, request, pk=None):
        """Obtener subcategorías de una categoría específica"""
        categoria = self.get_object()
        subcategorias = categoria.subcategorias.all()
        serializer = SubcategoriaSerializer(subcategorias, many=True)
        return Response(serializer.data)


class SubcategoriaViewSet(viewsets.ModelViewSet):
    """
    Vista para gestionar subcategorías
    """
    queryset = Subcategoria.objects.all()
    serializer_class = SubcategoriaSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        categoria_id = self.request.query_params.get('categoria_id')
        if categoria_id:
            queryset = queryset.filter(categoria_id=categoria_id)
        return queryset