// src/modules/admin/hooks/useAdminDashboard.js
import { useState, useEffect } from 'react';
import { adminDashboardApi } from '../api/adminDashboardApi';

export const useAdminDashboard = () => {
    const [metricas, setMetricas] = useState(null);
    const [estadisticas, setEstadisticas] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [rangoSeleccionado, setRangoSeleccionado] = useState('total');

    const obtenerDatosDashboard = async (rango = 'total') => {
        try {
            setCargando(true);
            setError(null);

            // Solo obtener métricas principales (endpoint que existe)
            const datosMetricas = await adminDashboardApi.obtenerMetricas(rango);

            // Calcular estadísticas básicas desde las métricas
            const statsBasicas = {
                total_usuarios: 0, // No disponible en el backend
                usuarios_activos: 0, // No disponible en el backend
                usuarios_inactivos: 0, // No disponible en el backend
                nuevos_7dias: 0, // No disponible en el backend
                nunca_login: 0, // No disponible en el backend
                porcentaje_activos: 0 // No disponible en el backend
            };

            setMetricas(datosMetricas);
            setEstadisticas(statsBasicas);
            setRangoSeleccionado(rango);
        } catch (err) {
            setError('Error al cargar los datos del dashboard');
            console.error('Error dashboard:', err);
        } finally {
            setCargando(false);
        }
    };

    const cambiarRango = (nuevoRango) => {
        obtenerDatosDashboard(nuevoRango);
    };

    useEffect(() => {
        obtenerDatosDashboard();
    }, []);

    return {
        metricas,
        estadisticas,
        cargando,
        error,
        rangoSeleccionado,
        cambiarRango,
        recargarDatos: () => obtenerDatosDashboard(rangoSeleccionado)
    };
};