import api from "./axiosInstance";

// Trae los tickets necesarios para el dashboard del usuario
export const fetchDashboardTickets = async () => {
    const response = await api.get("/user/tickets/");
    // Hacemos la función robusta: si la respuesta es paginada, usamos `results`.
    // Si no, usamos la data directamente.
    return response.data.results || response.data;
};