import { useState, useEffect } from 'react';
import { adminTicketsApi } from '../api/adminTicketsApi';

export const useAdminTickets = () => {
    const [tickets, setTickets] = useState([]);
    const [ticketSeleccionado, setTicketSeleccionado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);

    // 🔹 filtros reales usados
    const [filtros, setFiltros] = useState({
        search: '',
        estado: '',
        categoria: '',
        prioridad: '',
        agente: '',
        orden: '-fecha_creacion',
        page: 1
    });

    const [paginacion, setPaginacion] = useState({
        count: 0,
        next: null,
        previous: null
    });

    const [estadisticas, setEstadisticas] = useState({
        total: 0,
        abiertos: 0,
        en_proceso: 0,
        resueltos: 0
    });

    // ===============================
    // 🔹 OBTENER TICKETS
    // ===============================
    const obtenerTickets = async (params = filtros) => {
        try {
            setCargando(true);
            setError(null);

            console.log("🧠 Hook → filtros enviados:", params);

            const respuesta = await adminTicketsApi.obtenerTickets(params);

            const ticketsData = respuesta.results || [];

            setTickets(ticketsData);

            // ✅ PAGINACIÓN REAL
            setPaginacion({
                count: respuesta.count || 0,
                next: respuesta.next,
                previous: respuesta.previous
            });

            // ✅ ESTADÍSTICAS CORRECTAS
            setEstadisticas({
                total: respuesta.count || 0,
                abiertos: ticketsData.filter(t => t.estado === 'Abierto').length,
                en_proceso: ticketsData.filter(t => t.estado === 'En Proceso').length,
                resueltos: ticketsData.filter(t => t.estado === 'Resuelto').length
            });

            // ✅ guardar filtros usados
            setFiltros(prev => ({ ...prev, ...params }));
        } catch (err) {
            console.error('❌ Error tickets:', err);
            setError('Error al cargar los tickets');
        } finally {
            setCargando(false);
        }
    };

    // ===============================
    // 🔹 DETALLE
    // ===============================
    const obtenerTicket = async (id) => {
        try {
            const ticket = await adminTicketsApi.obtenerTicket(id);
            return { exito: true, ticket };
        } catch {
            setError('Error al cargar el ticket');
            return { exito: false };
        }
    };

    // ===============================
    // 🔹 ACTUALIZAR
    // ===============================
    const actualizarTicket = async (id, datosTicket) => {
        try {
            await adminTicketsApi.actualizarTicket(id, datosTicket);
            await obtenerTickets(); // 🔄 refresca lista
            return { exito: true };
        } catch (err) {
            setError('Error al actualizar el ticket');
            return { exito: false };
        }
    };

    // ===============================
    // 🔹 OPCIONES DE FILTRO
    // ===============================
    const obtenerOpcionesFiltro = async () => {
        try {
            return await adminTicketsApi.obtenerOpcionesFiltro();
        } catch {
            return { categorias: [], agentes: [], estados: [], prioridades: [] };
        }
    };

    // ===============================
    // 🔹 APLICAR FILTROS
    // ===============================
    const aplicarFiltros = (nuevosFiltros) => {
        obtenerTickets({ ...filtros, ...nuevosFiltros, page: 1 });
    };

    // ===============================
    // 🔹 PAGINACIÓN
    // ===============================
    const cambiarPagina = (pagina) => {
        obtenerTickets({ ...filtros, page: pagina });
    };

    // 🔄 CARGA INICIAL
    useEffect(() => {
        obtenerTickets();
    }, []);

    return {
        tickets,
        ticketSeleccionado,
        setTicketSeleccionado,
        cargando,
        error,
        filtros,
        paginacion,
        estadisticas,
        obtenerTickets,
        obtenerTicket,
        actualizarTicket,
        aplicarFiltros,
        cambiarPagina,
        obtenerOpcionesFiltro
    };
};
