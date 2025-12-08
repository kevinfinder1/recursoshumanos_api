import pytest
from django.utils import timezone
from tickets.models import CategoriaPrincipal, Ticket
from users.models import User
from tickets.services.agent_availability_service import AgentAvailabilityService

pytestmark = pytest.mark.django_db

# ---------------------------------------------------------
# 🧪 1. Crear agentes por rol
# ---------------------------------------------------------
@pytest.fixture
def agentes_tca():
    a1 = User.objects.create_user(username="tca1", password="123", role="agente_tca")
    a2 = User.objects.create_user(username="tca2", password="123", role="agente_tca")
    return [a1, a2]

@pytest.fixture
def categoria_tca():
    return CategoriaPrincipal.objects.create(
        nombre="Soporte TCA",
        tipo_agente="agente_tca"
    )

# ---------------------------------------------------------
# 🧪 2. Caso: retorna el agente con MENOS carga
# ---------------------------------------------------------
def test_asignacion_agente_menos_cargado(agentes_tca, categoria_tca):
    a1, a2 = agentes_tca

    # le damos más carga al primer agente
    Ticket.objects.create(
        titulo="Ticket cargado",
        descripcion="...",
        categoria_principal=categoria_tca,
        creado_por=a1,
        asignado_a=a1
    )

    agente = AgentAvailabilityService.obtener_agente_disponible(categoria_tca)

    assert agente == a2, "Debe asignar al agente con menos carga"

# ---------------------------------------------------------
# 🧪 3. Caso: si NO existen agentes del tipo requerido → None
# ---------------------------------------------------------
def test_asignacion_sin_agentes(categoria_tca):
    agente = AgentAvailabilityService.obtener_agente_disponible(categoria_tca)
    assert agente is None, "Debe retornar None si no hay agentes del tipo indicado"

# ---------------------------------------------------------
# 🧪 4. Caso: balanceo cuando ambos tienen igual carga
# ---------------------------------------------------------
def test_asignacion_balanceada(agentes_tca, categoria_tca):
    a1, a2 = agentes_tca

    # ambos tienen 1 ticket
    Ticket.objects.create(
        titulo="T1",
        descripcion="...",
        categoria_principal=categoria_tca,
        creado_por=a1,
        asignado_a=a1
    )

    Ticket.objects.create(
        titulo="T2",
        descripcion="...",
        categoria_principal=categoria_tca,
        creado_por=a2,
        asignado_a=a2
    )

    agente = AgentAvailabilityService.obtener_agente_disponible(categoria_tca)

    assert agente in [a1, a2], "Con mismos valores, cualquiera es válido"

# ---------------------------------------------------------
# 🧪 5. Creación de ticket → asigna automáticamente a agente correcto
# ---------------------------------------------------------
def test_creacion_ticket_asigna_automatica(client, agentes_tca, categoria_tca):
    usuario = User.objects.create_user(
        username="kevin", password="123", role="solicitante"
    )

    client.login(username="kevin", password="123")

    respuesta = client.post(
        "/api/user/tickets/",
        {
            "titulo": "Problema TCA",
            "descripcion": "No funciona",
            "categoria_principal": categoria_tca.id,
            "prioridad": "Media"
        }
    )

    assert respuesta.status_code == 201, respuesta.content

    data = respuesta.json()
    assert data["agente_info"] is not None, "Ticket debe asignarse automáticamente"

# ---------------------------------------------------------
# 🧪 6. Ticket queda PENDIENTE si no hay agentes
# ---------------------------------------------------------
def test_ticket_pendiente_sin_agentes(client):
    categoria = CategoriaPrincipal.objects.create(
        nombre="Sin agentes",
        tipo_agente="agente_tca"
    )

    user = User.objects.create_user(
        username="client", password="123", role="solicitante"
    )

    client.login(username="client", password="123")

    response = client.post(
        "/api/user/tickets/",
        {
            "titulo": "Solicitud",
            "descripcion": "Algo",
            "categoria_principal": categoria.id,
        }
    )

    assert response.status_code == 201
    data = response.json()
    assert data["estado"] == "pendiente_asignacion"
