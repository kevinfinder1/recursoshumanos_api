// src/modules/admin/hooks/useAdminReports.js
import { useState } from 'react';
import { adminReportsApi } from '../api/adminReportsApi';

export const useAdminReports = () => {
    const [generando, setGenerando] = useState(false);
    const [error, setError] = useState(null);

    const descargarArchivo = (blob, nombreArchivo) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const generarReporte = async (tipo, formato, parametros = {}) => {
        try {
            setGenerando(true);
            setError(null);

            let data;
            let nombreArchivo = `reporte_${tipo}_${new Date().toISOString().split('T')[0]}`;

            if (formato === 'excel') {
                data = await adminReportsApi.generarReporteExcel(tipo, parametros);
                nombreArchivo += '.xlsx';
            } else {
                data = await adminReportsApi.generarReportePDF(tipo, parametros);
                nombreArchivo += '.pdf';
            }

            descargarArchivo(data, nombreArchivo);
            return { exito: true };
        } catch (err) {
            const mensajeError = 'Error al generar el reporte';
            setError(mensajeError);
            console.error('Error reporte:', err);
            return { exito: false, error: mensajeError };
        } finally {
            setGenerando(false);
        }
    };

    const obtenerDatosGraficos = async (parametros = {}) => {
        try {
            const data = await adminReportsApi.obtenerDatosGraficos(parametros);
            return { exito: true, data };
        } catch (err) {
            console.error('Error datos gráficos:', err);
            return { exito: false, error: 'Error al cargar datos para gráficos' };
        }
    };

    const obtenerEstadisticasAvanzadas = async (parametros = {}) => {
        try {
            const data = await adminReportsApi.obtenerEstadisticasAvanzadas(parametros);
            return { exito: true, data };
        } catch (err) {
            console.error('Error estadísticas avanzadas:', err);
            return { exito: false, error: 'Error al cargar estadísticas' };
        }
    };

    return {
        generando,
        error,
        generarReporte,
        obtenerDatosGraficos,
        obtenerEstadisticasAvanzadas
    };
};