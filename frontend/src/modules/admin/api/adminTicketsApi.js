// src/modules/admin/api/adminTicketsApi.js
import API from '../../../api/axiosInstance';

export const adminTicketsApi = {
    // Obtener lista de tickets con filtros
    obtenerTickets: async (params = {}) => {
        const response = await API.get('/admin/tickets/', { params });
        return response.data;
    },

    // Obtener detalle de un ticket
    obtenerTicket: async (id) => {
        const response = await API.get(`/admin/tickets/${id}/`);
        return response.data;
    },

    // Actualizar ticket (reasignar, cambiar estado, etc.)
    actualizarTicket: async (id, datosTicket) => {
        const response = await API.patch(`/admin/tickets/${id}/`, datosTicket);
        return response.data;
    },

    // ✅ SOLUCIÓN: Hacer la llamada real al endpoint que ya creamos en el backend.
    obtenerOpcionesFiltro: async () => {
        try {
            // ✅ CORRECCIÓN: La URL correcta debe coincidir con la estructura del backend.
            // Todas las URLs de adminpanel empiezan con '/adminpanel/'.
            const response = await API.get('/adminpanel/tickets/opciones_filtro/');
            return response.data;
        } catch (error) {
            console.error("Error al obtener opciones de filtro:", error);
            throw error; // Lanzar el error para que el hook lo maneje
        }
    },

    // Obtener estadísticas de tickets - ENDPOINT QUE NO EXISTE, LO QUITAMOS
    obtenerEstadisticas: async () => {
        // Este endpoint no existe, devolvemos datos por defecto
        console.warn('Endpoint /admin/tickets/estadisticas/ no existe, usando datos por defecto');
        return {
            total: 0,
            abiertos: 0,
            en_proceso: 0,
            resueltos: 0,
            vencidos: 0 // Añadimos 'vencidos' para que no falle si el frontend lo espera
        };
    }
};