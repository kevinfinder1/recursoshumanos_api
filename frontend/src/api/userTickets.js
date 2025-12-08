// src/api/userTickets.js
import api from "./axiosInstance"; // Usamos la instancia centralizada de Axios

export const fetchUserTickets = async () => {
    // La instancia 'api' ya incluye la URL base y los headers de autenticación
    const { data } = await api.get("/user/tickets/");
    return data; // lista de tickets (TicketSerializer)
};

export const fetchUserTicketDetail = async (id) => {
    const { data } = await api.get(`/user/tickets/${id}/`);
    return data; // TicketDetailSerializer
};

export const createUserTicket = async (payload) => {
    // payload = { titulo, descripcion, prioridad, categoria_principal, subcategoria, archivo_adjunto? }
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            formData.append(key, value);
        }
    });

    // La instancia 'api' se encarga de los headers. Solo añadimos el Content-Type.
    const { data } = await api.post("/user/tickets/", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return data;
};

export const updateUserTicket = async (id, payload) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            formData.append(key, value);
        }
    });

    const { data } = await api.put(`/user/tickets/${id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return data;
};

export const deleteUserTicket = async (id) => api.delete(`/user/tickets/${id}/`);

export const rateUserTicket = async (id, rating) => {
    const { data } = await api.post(`/user/tickets/${id}/calificar/`, { rating });
    return data;
};

export const fetchCategorias = async () => {
    try {
        const { data } = await api.get("/categorias/");

        // Si la API usa paginación:
        return data.results || [];
    } catch (err) {
        console.error("Error API Categorias:", err.response?.data || err);
        throw err;
    }
};

export const fetchSubcategorias = async (categoriaId) => {
    try {
        const { data } = await api.get(`/subcategorias/?categoria_id=${categoriaId}`);
        return data.results || [];
    } catch (err) {
        console.error("Error API Subcategorias:", err.response?.data || err);
        throw err;
    }
};
