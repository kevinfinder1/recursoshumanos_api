// src/modules/admin/api/adminReportsApi.js
import API from '../../../api/axiosInstance';

export const adminReportsApi = {
    // Generar reporte Excel
    generarReporteExcel: async (tipo, parametros = {}) => {
        const response = await API.post(`/admin/reportes/${tipo}/excel/`, parametros, {
            responseType: 'blob'
        });
        return response.data;
    },

    // Generar reporte PDF
    generarReportePDF: async (tipo, parametros = {}) => {
        const response = await API.post(`/admin/reportes/${tipo}/pdf/`, parametros, {
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