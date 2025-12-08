import { useState, useEffect, useCallback } from 'react';
import api from '../../../api/axiosInstance';

const POLLING_INTERVAL = 30000; // 30 segundos

export const useAgentDashboard = () => {
    const [data, setData] = useState({ tickets: [], stats: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadData = useCallback(async () => {
        // No mostramos el spinner en las recargas automáticas para una mejor UX
        // setLoading(true); 
        try {
            setError('');
            const response = await api.get('/agente/tickets/');
            const tickets = response.data.results || response.data;

            // Aquí podrías calcular estadísticas específicas del agente si lo necesitas
            const stats = {
                total: tickets.length,
                abiertos: tickets.filter(t => t.estado === 'Abierto').length,
                enProceso: tickets.filter(t => t.estado === 'En Proceso').length,
            };

            setData({ tickets, stats });
        } catch (err) {
            console.error("Error cargando dashboard de agente:", err);
            setError("No se pudo cargar la información.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData(); // Carga inicial
        const intervalId = setInterval(loadData, POLLING_INTERVAL); // Inicia el polling
        return () => clearInterval(intervalId); // Limpia el intervalo al desmontar el componente
    }, [loadData]);

    return { ...data, loading, error, reload: loadData };
};