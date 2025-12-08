import API from "./axiosInstance";

/**
 * Obtiene los tickets creados por el agente logueado.
 */
export const getMisTicketsCreados = () =>
    API.get("/agent/tickets/mis-tickets-creados/");

/** Obtiene los tickets asignados al agente logueado. */
export const getTicketsAsignadosAMi = () =>
    API.get("/agent/tickets/tickets-asignados-a-mi/");

/**
 * Obtiene el detalle de un ticket específico.
 */
export const getDetalleTicketAgente = (id) =>
    API.get(`/agent/tickets/${id}/`);

/**
 * Obtiene la lista de tickets pendientes de aceptación por reasignación.
 */
export const getPendientesAceptacion = () =>
    API.get("/agent/tickets/pendientes_aceptacion/");

/**
 * Obtiene la lista de agentes disponibles para asignarles un ticket.
 */
export const getAgentesDisponibles = () =>
    API.get("/agent/agentes-disponibles/");

/**
 * Crea un nuevo ticket usando el endpoint rápido.
 */
export const crearTicketRapido = (payload) =>
    API.post("/agent/tickets/crear-rapido/", payload);

/**
 * Inicia el proceso de reasignación de un ticket a otro agente.
 */
export const reasignarTicket = (ticketId, agentId, tiempoAceptacion = 300) =>
    API.post(`/agent/tickets/${ticketId}/reasignar/`, {
        agente_destino: agentId,
        tiempo_aceptacion: tiempoAceptacion // 🎯 Añadir este campo
    });

/**
 * Cambia el estado de un ticket.
 */
export const cambiarEstadoTicket = (ticketId, nuevoEstado) =>
    API.post(`/agent/tickets/${ticketId}/cambiar_estado/`, { estado: nuevoEstado });

/**
 * Edita un ticket existente (PUT request).
 * El payload debe contener todos los campos necesarios.
 */
export const editarTicket = (ticketId, payload) =>
    API.put(`/agent/tickets/${ticketId}/`, payload);

/**
 * Elimina un ticket.
 */
export const eliminarTicket = (ticketId) =>
    API.delete(`/agent/tickets/${ticketId}/`);

/**
 * Envía un mensaje o comentario a un ticket desde la vista del agente.
 */
export const sendAgentTicketMessage = (ticketId, message) =>
    API.post(`/agent/tickets/${ticketId}/add_comment/`, {
        // El historial del ticket usa 'descripcion' para los comentarios.
        descripcion: message,
    });