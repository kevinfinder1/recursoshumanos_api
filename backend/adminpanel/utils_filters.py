# filters.py
from django.utils import timezone
from datetime import datetime, timedelta
from django.db.models import Q
from tickets.models import Ticket

def filtrar_tickets(request):
    # ✅ SOLUCIÓN: Usar request.query_params en lugar de request.GET para vistas de API.
    params = request.query_params
    
    agente = params.get("agente")
    estado = params.get("estado")
    categoria = params.get("categoria")
    subcategoria = params.get("subcategoria")
    prioridad = params.get("prioridad")
    rating = params.get("rating")
    search = params.get("search")
    orden = params.get("orden") # 
    fecha_inicio = params.get("fecha_inicio")
    fecha_fin = params.get("fecha_fin")
    rango = params.get("rango")

    hoy = timezone.now()
    tickets = Ticket.objects.all()

    # -------------------------
    # FILTROS DIRECTOS
    # -------------------------
    if agente:
        tickets = tickets.filter(agente_id=agente)

    if estado:
        tickets = tickets.filter(estado=estado)

    if categoria:
        tickets = tickets.filter(categoria_principal_id=categoria)

    if subcategoria:
        tickets = tickets.filter(subcategoria_id=subcategoria)

    if prioridad:
        tickets = tickets.filter(prioridad_id=prioridad) # Asumiendo que 'prioridad' es una FK a un modelo Priority

    if rating:
        tickets = tickets.filter(rating=rating)

    # -------------------------
    # BUSCADOR GLOBAL
    # -------------------------
    if search:
        tickets = tickets.filter(
            Q(titulo__icontains=search) |
            Q(descripcion__icontains=search) |
            Q(solicitante__username__icontains=search) |
            Q(agente__username__icontains=search)
        )

    # -------------------------
    # RANGOS RÁPIDOS
    # -------------------------
    if rango == "dia":
        tickets = tickets.filter(fecha_creacion__date=hoy.date())
    elif rango == "semana":
        inicio = hoy - timedelta(days=hoy.weekday())
        tickets = tickets.filter(fecha_creacion__gte=inicio)
    elif rango == "mes":
        inicio = hoy.replace(day=1)
        tickets = tickets.filter(fecha_creacion__gte=inicio)
    elif rango == "anio":
        inicio = hoy.replace(month=1, day=1)
        tickets = tickets.filter(fecha_creacion__gte=inicio)
    elif rango == "7dias":
        tickets = tickets.filter(fecha_creacion__gte=hoy - timedelta(days=7))
    elif rango == "30dias":
        tickets = tickets.filter(fecha_creacion__gte=hoy - timedelta(days=30))

    # -------------------------
    # RANGO PERSONALIZADO
    # -------------------------
    if fecha_inicio:
        fecha_i = datetime.strptime(fecha_inicio, "%Y-%m-%d")
        tickets = tickets.filter(fecha_creacion__gte=fecha_i)

    if fecha_fin:
        fecha_f = datetime.strptime(fecha_fin, "%Y-%m-%d")
        tickets = tickets.filter(fecha_creacion__lte=fecha_f)

    # -------------------------
    # ORDENAMIENTO
    # -------------------------
    if orden:
        tickets = tickets.order_by(orden)

    return tickets
