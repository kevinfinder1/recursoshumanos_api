// useAgentTickets.js - Versión simplificada
import { useState, useCallback, useEffect } from "react";
import { getMisTicketsCreados, getTicketsAsignadosAMi, getAgentesDisponibles, getPendientesAceptacion } from "../../../api/ticketsApi";

const POLLING_INTERVAL = 10000; // 10 segundos

const useAgentTickets = () => {
    const [ticketsAsignados, setTicketsAsignados] = useState([]);
    const [misTicketsCreados, setMisTicketsCreados] = useState([]);
    const [agentes, setAgentes] = useState([]);
    const [pendientes, setPendientes] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /* ------------------------------------------------------
       📌 1. OBTENER TICKETS (DOS FUNCIONES SEPARADAS)
    ------------------------------------------------------ */
    const fetchTicketsAsignados = useCallback(async () => {
        try {
            const { data } = await getTicketsAsignadosAMi();
            const safeTickets = Array.isArray(data.results) ? data.results : [];
            setTicketsAsignados(safeTickets);
            return safeTickets;
        } catch (error) {
            console.error("❌ Error al obtener tickets asignados:", error);
            setTicketsAsignados([]);
            return [];
        }
    }, []);

    const fetchMisTicketsCreados = useCallback(async () => {
        try {
            const { data } = await getMisTicketsCreados();
            const safeTickets = Array.isArray(data.results) ? data.results : [];
            setMisTicketsCreados(safeTickets);
            return safeTickets;
        } catch (error) {
            console.error("❌ Error al obtener tickets creados:", error);
            setMisTicketsCreados([]);
            return [];
        }
    }, []);

    /* ------------------------------------------------------
       📌 2. OBTENER AGENTES DISPONIBLES
    ------------------------------------------------------ */
    const fetchAgentes = useCallback(async () => {
        try {
            const { data } = await getAgentesDisponibles();
            setAgentes(Array.isArray(data.agentes) ? data.agentes : []); // Esto ya estaba bien
        } catch (error) {
            console.error("❌ Error al obtener agentes:", error);
            setAgentes([]);
        }
    }, []);

    /* ------------------------------------------------------
       📌 3. OBTENER PENDIENTES DE ACEPTACIÓN (NUEVA FUNCIÓN)
    ------------------------------------------------------ */
    const fetchPendientes = useCallback(async () => {
        try {
            console.log("📨 Solicitando tickets pendientes de aceptación...");
            const { data } = await getPendientesAceptacion();
            // La respuesta tiene el formato { tickets: [], asignaciones: [] }
            const safePendientes = Array.isArray(data.tickets) ? data.tickets : [];
            console.log(`✅ Pendientes recibidos: ${safePendientes.length}`);
            setPendientes(safePendientes);
            return safePendientes;
        } catch (error) {
            console.error("❌ Error al obtener pendientes:", error);
            setPendientes([]);
            return [];
        }
    }, []);

    /* ------------------------------------------------------
       📌 4. CALCULAR ESTADÍSTICAS
    ------------------------------------------------------ */
    const calcularStats = useCallback((asignadosList, creadosList, pendientesList) => {
        const safeAsignados = Array.isArray(asignadosList) ? asignadosList : [];
        const safeCreados = Array.isArray(creadosList) ? creadosList : [];
        const safePendientes = Array.isArray(pendientesList) ? pendientesList : [];

        const statsData = {
            totalAsignados: safeAsignados.length,
            abiertos: safeAsignados.filter(t =>
                t.estado === "Abierto" || t.status === "open"
            ).length,
            enProceso: safeAsignados.filter(t =>
                t.estado === "En Proceso" || t.status === "in_progress"
            ).length,
            resueltos: safeAsignados.filter(t =>
                t.estado === "Resuelto" || t.status === "resolved"
            ).length,
            pendientesAceptacion: safePendientes.length,
        };

        console.log("📊 Estadísticas calculadas:", statsData);
        setStats(statsData);
    }, []);

    /* ------------------------------------------------------
       📌 5. FUNCIÓN PRINCIPAL - CARGA TODO
    ------------------------------------------------------ */
    const fetchAll = useCallback(async (isInitialLoad = false) => {
        // Solo mostramos el spinner en la carga inicial
        if (isInitialLoad) {
            setLoading(true);
        }
        setError(null);

        try {
            if (isInitialLoad) {
                console.log("🚀 Iniciando carga completa de datos...");
            } else {
                console.log("🔄 Actualización automática de datos...");
            }

            // Cargar tickets y agentes en paralelo
            const [asignadosData, creadosData, pendientesData] = await Promise.all([
                fetchTicketsAsignados(),
                fetchMisTicketsCreados(),
                fetchPendientes(),
                fetchAgentes(), // Los agentes no dependen de nada, se pueden cargar en paralelo
            ]);

            // Calcular estadísticas
            calcularStats(asignadosData, creadosData, pendientesData);

            if (isInitialLoad) {
                console.log("✅ Carga completa finalizada exitosamente");
            }

        } catch (error) {
            console.error("❌ Error en carga completa:", error);
            setError("Error al cargar los datos del dashboard");
        } finally {
            if (isInitialLoad) {
                setLoading(false);
            }
        }
    }, [fetchTicketsAsignados, fetchMisTicketsCreados, fetchAgentes, fetchPendientes, calcularStats]);

    /* ------------------------------------------------------
       📌 6. EFECTO INICIAL
    ------------------------------------------------------ */
    useEffect(() => {
        // 1. Carga inicial de los datos
        fetchAll(true);
        // 2. Inicia el polling para refrescar los datos periódicamente
        const intervalId = setInterval(() => fetchAll(false), POLLING_INTERVAL);
        // 3. Limpia el intervalo cuando el componente se desmonta
        return () => clearInterval(intervalId);
    }, [fetchAll]);

    /* ------------------------------------------------------
       📌 7. ACTUALIZAR ESTADÍSTICAS CUANDO CAMBIEN LOS DATOS
    ------------------------------------------------------ */
    useEffect(() => {
        calcularStats(ticketsAsignados, misTicketsCreados, pendientes);
    }, [ticketsAsignados, misTicketsCreados, pendientes, calcularStats]);

    /* ------------------------------------------------------
       📌 NUEVAS FUNCIONES PARA MANIPULACIÓN DE ESTADO
    ------------------------------------------------------ */
    const moverTicketDePendienteAAsignado = useCallback((ticketAceptado) => {
        // Quitar de la lista de pendientes
        setPendientes(prev => prev.filter(p => p.id !== ticketAceptado.id));
        // Añadir a la lista de asignados
        setTicketsAsignados(prev => [ticketAceptado, ...prev]);
    }, []);

    const quitarTicketDeAsignados = useCallback((ticketId) => {
        setTicketsAsignados(prev => prev.filter(t => t.id !== ticketId));
    }, []);

    return {
        ticketsAsignados: Array.isArray(ticketsAsignados) ? ticketsAsignados : [],
        setTicketsAsignados,
        misTicketsCreados: Array.isArray(misTicketsCreados) ? misTicketsCreados : [],
        setMisTicketsCreados,
        agentes: Array.isArray(agentes) ? agentes : [],
        pendientes: Array.isArray(pendientes) ? pendientes : [],
        stats,
        loading,
        error,
        fetchAll,
        // 🎯 Exponer las nuevas funciones
        moverTicketDePendienteAAsignado,
        quitarTicketDeAsignados,
    };
};

export default useAgentTickets;