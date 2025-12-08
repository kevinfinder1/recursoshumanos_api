from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from tickets.models import Ticket
from tickets.serializers import TicketSerializer, TicketDetailSerializer
from tickets.permissions import IsTicketOwner, CanEditTicket

class BaseTicketViewSet(viewsets.ModelViewSet):
    """
    Vista base para tickets con funcionalidades comunes
    """
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TicketDetailSerializer
        return super().get_serializer_class()

    def perform_create(self, serializer):
        serializer.save(solicitante=self.request.user)

    @action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        """Obtener historial completo del ticket"""
        ticket = self.get_object()
        from tickets.serializers import TicketHistorySerializer
        historial = ticket.historial.all().order_by('-fecha')
        serializer = TicketHistorySerializer(historial, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def chat_info(self, request, pk=None):
        """Obtener información del chat del ticket"""
        ticket = self.get_object()
        chat_data = {
            'ticket_id': ticket.id,
            'sala_chat_id': ticket.sala_chat.id if ticket.sala_chat else None,
            'participantes': []
        }
        
        if ticket.sala_chat:
            chat_data['participantes'] = [
                {
                    'id': user.id,
                    'username': user.username,
                    # ✅ CORRECCIÓN FINAL: Usar la misma lógica estandarizada de CurrentUserView
                    'role': (
                        'agente' if user.rol.tipo_base == 'agente'
                        else 'solicitante' if user.rol.tipo_base == 'solicitante'
                        else user.rol.nombre_clave
                    ) if user.rol else None
                }
                for user in ticket.sala_chat.participants.all()
            ]
            
        return Response(chat_data)