# tickets/services/agent_availability_service.py

from users.models import User
from tickets.models import Ticket
from django.db.models import Count, Q

class AgentAvailabilityService:

    @staticmethod
    def obtener_agente_disponible(categoria):
        """
        Devuelve el agente con MENOS carga de trabajo
        que coincida con el tipo de agente definido en la categoría.
        """

        tipo_agente = categoria.tipo_agente

        # 1) FILTRAR agentes por tipo (rol)
        agentes = User.objects.filter(rol=tipo_agente, is_active=True)

        if not agentes.exists():
            return None

        # 2) Contar el número de tickets asignados por agente
        agentes_con_carga = agentes.annotate(
            carga=Count('tickets_asignados', filter=~Q(tickets_asignados__estado="Resuelto"))
        ).order_by('carga')

        # 3) Retornar el que menos carga tenga
        return agentes_con_carga.first()