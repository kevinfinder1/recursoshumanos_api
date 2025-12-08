import API from '../../../api/axiosInstance';

export const adminDashboardApi = {
    // Obtener métricas del dashboard - ENDPOINT EXISTENTE
    obtenerMetricas: async (rango = 'total') => {
        const response = await API.get(`/admin/dashboard/?rango=${rango}`);
        return response.data;
    },

    // Obtener estadísticas rápidas - ENDPOINT QUE NO EXISTE, LO QUITAMOS
    obtenerEstadisticasRapidas: async () => {
        console.warn('Endpoint /admin/agentes/estadisticas_rapidas/ no existe');
        return {
            total_usuarios: 0,
            usuarios_activos: 0,
            usuarios_inactivos: 0,
            nuevos_7dias: 0,
            nunca_login: 0,
            porcentaje_activos: 0
        };
    },

    // Obtener opciones de filtro - ENDPOINT QUE NO EXISTE, LO QUITAMOS
    obtenerOpcionesFiltro: async () => {
        console.warn('Endpoint /admin/agentes/opciones_filtro/ no existe');
        return {
            roles: [],
            estados: [],
            ordenamientos: []
        };
    }
};