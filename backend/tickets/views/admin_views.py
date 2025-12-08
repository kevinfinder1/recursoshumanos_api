from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from tickets.models import Ticket, TicketAssignment
from tickets.serializers import TicketSerializer, TicketDetailSerializer
from tickets.permissions import IsAgenteOrAdmin

class AdminTicketViewSet(viewsets.ModelViewSet):
    """
    Vista para administradores - Acceso completo a todos los tickets
    """
    serializer_class = TicketSerializer
    permission_classes = [IsAgenteOrAdmin]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TicketDetailSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        """Administradores ven todos los tickets"""
        return Ticket.objects.all().order_by('-fecha_creacion')

    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtener estadísticas generales del sistema"""
        # Estadísticas básicas
        total_tickets = Ticket.objects.count()
        tickets_abiertos = Ticket.objects.filter(estado='Abierto').count()
        tickets_proceso = Ticket.objects.filter(estado='En Proceso').count()
        tickets_resueltos = Ticket.objects.filter(estado='Resuelto').count()
        
        # Tickets por categoría
        tickets_por_categoria = Ticket.objects.values(
            'categoria_principal__nombre'
        ).annotate(
            total=Count('id')
        ).order_by('-total')
        
        # Tickets vencidos
        tickets_vencidos = Ticket.objects.filter(esta_vencido=True).count()
        
        # Reasignaciones pendientes
        reasignaciones_pendientes = TicketAssignment.objects.filter(estado='pendiente').count()
        
        # Tiempo promedio de resolución (solo tickets cerrados)
        tickets_cerrados = Ticket.objects.filter(estado='Resuelto', fecha_cierre__isnull=False)
        tiempo_promedio = None
        if tickets_cerrados.exists():
            total_segundos = sum(
                (ticket.fecha_cierre - ticket.fecha_creacion).total_seconds()
                for ticket in tickets_cerrados
            )
            tiempo_promedio_horas = total_segundos / (tickets_cerrados.count() * 3600)
            tiempo_promedio = round(tiempo_promedio_horas, 1)
        
        return Response({
            "estadisticas_generales": {
                "total_tickets": total_tickets,
                "tickets_abiertos": tickets_abiertos,
                "tickets_en_proceso": tickets_proceso,
                "tickets_resueltos": tickets_resueltos,
                "tickets_vencidos": tickets_vencidos,
                "reasignaciones_pendientes": reasignaciones_pendientes,
                "tiempo_promedio_resolucion_horas": tiempo_promedio
            },
            "tickets_por_categoria": list(tickets_por_categoria),
        })

    @action(detail=False, methods=['get'])
    def reporte_agentes(self, request):
        """Reporte de desempeño por agente"""
        from users.models import User
        
        # ✅ CORRECCIÓN: Usar tipo_base para encontrar a todos los agentes
        agentes = User.objects.filter(rol__tipo_base='agente')
        
        reporte_agentes = []
        for agente in agentes:
            # Tickets asignados al agente
            tickets_asignados = Ticket.objects.filter(agente=agente)
            tickets_resueltos = tickets_asignados.filter(estado='Resuelto')
            tickets_vencidos = tickets_asignados.filter(esta_vencido=True)
            
            # Calcular tasa de resolución
            tasa_resolucion = 0
            if tickets_asignados.exists():
                tasa_resolucion = (tickets_resueltos.count() / tickets_asignados.count()) * 100
            
            # Rating promedio
            rating_promedio = tickets_resueltos.aggregate(
                avg_rating=Count('rating')
            )['avg_rating'] or 0
            
            reporte_agentes.append({
                "agente": agente.username,
                "role": agente.rol.nombre_visible if agente.rol else 'N/A',
                "tickets_asignados": tickets_asignados.count(),
                "tickets_resueltos": tickets_resueltos.count(),
                "tickets_vencidos": tickets_vencidos.count(),
                "tasa_resolucion": round(tasa_resolucion, 1),
                "rating_promedio": rating_promedio
            })
        
        return Response({
            "reporte_agentes": sorted(reporte_agentes, key=lambda x: x['tasa_resolucion'], reverse=True)
        })