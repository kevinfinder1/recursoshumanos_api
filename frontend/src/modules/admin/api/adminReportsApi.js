// src/modules/admin/api/adminReportsApi.js
import API from '../../../api/axiosInstance';

export const adminReportsApi = {
    // Generar reporte Excel
    // Generar reporte Excel
    generarReporteExcel: async (tipo, parametros = {}) => {
        // Backend espera GET con query params, formato=xlsx y filtros
        const response = await API.get(`/admin/reportes/${tipo}/`, {
            params: { ...parametros, formato: 'xlsx' },
            responseType: 'blob'
        });
        return response.data;
    },

    // Generar reporte PDF
    generarReportePDF: async (tipo, parametros = {}) => {
        // Backend espera GET con query params, formato=pdf y filtros
        const response = await API.get(`/admin/reportes/${tipo}/`, {
            params: { ...parametros, formato: 'pdf' },
            responseType: 'blob'
        });
        return response.data;
    },

    // Obtener datos para gráficos - ENDPOINT QUE NO EXISTE, LO QUITAMOS
    obtenerDatosGraficos: async (parametros = {}) => {
        console.warn('Endpoint /admin/reportes/datos-graficos/ no existe');
        return {};
    },

    // Obtener estadísticas avanzadas - ENDPOINT QUE NO EXISTE, LO QUITAMOS
    obtenerEstadisticasAvanzadas: async (parametros = {}) => {
        console.warn('Endpoint /admin/reportes/estadisticas-avanzadas/ no existe');
        return {};
    }
};