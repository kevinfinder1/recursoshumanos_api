import { useEffect, useState, useCallback } from "react";
import { fetchDashboardTickets } from "../../../api/dashboard";

const POLLING_INTERVAL = 10000; // 10 segundos

export const useUserDashboard = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadDashboard = useCallback(async (isInitialLoad = false) => {
        // Solo mostramos el spinner en la carga inicial
        if (isInitialLoad) {
            setLoading(true);
        }
        try {
            setError("");
            const data = await fetchDashboardTickets();
            setTickets(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error cargando dashboard:", err);
            setError("No se pudo cargar la información del dashboard.");
        } finally {
            if (isInitialLoad) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        // 1. Carga inicial de los datos
        loadDashboard(true);
        // 2. Inicia el polling para refrescar los datos periódicamente
        const intervalId = setInterval(() => loadDashboard(false), POLLING_INTERVAL);
        // 3. Limpia el intervalo cuando el componente se desmonta
        return () => clearInterval(intervalId);
    }, [loadDashboard]);

    // =========================
    // Métricas
    // =========================
    const total = tickets.length;
    const abiertos = tickets.filter((t) => t.estado === "Abierto").length;
    const pendientes = tickets.filter((t) =>
        ["Pendiente", "pendiente_asignacion"].includes(t.estado)
    ).length;
    const enProceso = tickets.filter((t) => t.estado === "En Proceso").length;
    const resueltos = tickets.filter((t) => t.estado === "Resuelto").length;
    const vencidos = tickets.filter((t) => t.esta_vencido).length;

    // últimos
    const ultimos = tickets.slice(0, 5);

    // tickets sin calificar
    const sinRating = tickets.filter(
        (t) => t.estado === "Resuelto" && !t.rating
    );

    // tickets editables (tiempo restante > 0)
    const editables = tickets.filter((t) => t.tiempo_restante_edicion > 0);

    return {
        loading,
        error,
        reload: loadDashboard,
        tickets, // Pasamos todos los tickets para la lista
        metrics: {
            total,
            abiertos,
            pendientes,
            enProceso,
            resueltos,
            vencidos,
        },
        ultimos,
        sinRating,
        editables,
    };
};