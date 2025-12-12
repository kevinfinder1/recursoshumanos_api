# adminpanel/utils_filters.py
from django.db.models import Q, F, ExpressionWrapper
from django.db.models import DurationField
from django.utils import timezone
from datetime import timedelta
from tickets.models import Ticket
from .models import Priority

def filtrar_tickets(request):
    """
    Filtro universal para tickets - USAR ESTA MISMA FUNCIÓN EN TODAS LAS VISTAS
    """
    queryset = Ticket.objects.all()
    
    # 🔍 BÚSQUEDA
    search = request.query_params.get('search')
    if search:
        q_objects = Q(titulo__icontains=search) | \
                    Q(descripcion__icontains=search) | \
                    Q(solicitante__username__icontains=search) | \
                    Q(agente__username__icontains=search)
        
        if search.isdigit():
            q_objects |= Q(id=int(search))
        
        queryset = queryset.filter(q_objects)

    # 📋 FILTROS BÁSICOS
    estado = request.query_params.get('estado')
    if estado:
        queryset = queryset.filter(estado=estado)

    categoria = request.query_params.get('categoria')
    if categoria:
        queryset = queryset.filter(categoria_principal_id=categoria)

    prioridad = request.query_params.get('prioridad')
    if prioridad:
        if prioridad.isdigit():
            try:
                prioridad_obj = Priority.objects.get(id=prioridad)
                queryset = queryset.filter(prioridad=prioridad_obj.nombre)
            except Priority.DoesNotExist:
                pass # Si no existe el ID, ignorar filtro o dejar queryset vacio (decisión: ignorar)
        else:
            queryset = queryset.filter(prioridad=prioridad)

    agente = request.query_params.get('agente')
    if agente:
        queryset = queryset.filter(agente_id=agente)

    # 📊 ORDENAMIENTO
    orden = request.query_params.get('orden', '-fecha_creacion')
    
    if orden in ['dias_abierto', '-dias_abierto']:
        # Calcular días abiertos
        hoy = timezone.now()
        queryset = queryset.annotate(
            dias_abierto_annotated=ExpressionWrapper(
                hoy - F('fecha_creacion'),
                output_field=DurationField()
            )
        )
        if orden == 'dias_abierto':
            queryset = queryset.order_by('dias_abierto_annotated')
        else:
            queryset = queryset.order_by('-dias_abierto_annotated')
    elif orden:
        # Para otros campos, ordenar directamente
        campos_validos = ['fecha_creacion', '-fecha_creacion', 
                         'fecha_cierre', '-fecha_cierre',
                         'prioridad', '-prioridad', 'titulo', '-titulo']
        if orden.lstrip('-') in campos_validos:
            queryset = queryset.order_by(orden)
    
    return queryset