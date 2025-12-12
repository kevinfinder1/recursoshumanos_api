import API from '../../../api/axiosInstance';

export const adminTicketsApi = {
    // 🔹 Obtener lista de tickets con filtros (PAGINADO)
    obtenerTickets: async (params = {}) => {
        const response = await API.get('/adminpanel/tickets/', { params });

        // ✅ DEVOLVER TODO (count, next, previous, results)
        return response.data;
    },

    // 🔹 Obtener detalle de un ticket
    obtenerTicket: async (id) => {
        const response = await API.get(`/admin/tickets/${id}/`);
        return response.data;
    },

    // 🔹 Actualizar ticket
    actualizarTicket: async (id, datosTicket) => {
        const response = await API.patch(`/admin/tickets/${id}/`, datosTicket);
        return response.data;
    },

    // 🔹 Obtener opciones de filtros
    obtenerOpcionesFiltro: async () => {
        const response = await API.get('/admin/filtros/tickets/');
        const data = response.data;

        return {
            estados: data.estados?.map(e => ({ value: e, label: e })) || [],
            prioridades: data.prioridades?.map(p => ({ value: p.id, label: p.nombre })) || [],
            categorias: data.categorias?.map(c => ({ value: c.id, label: c.nombre })) || [],
            agentes: data.agentes?.map(a => ({ value: a.id, label: a.username })) || []
        };
    }
};
