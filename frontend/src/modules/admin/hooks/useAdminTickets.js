// src/modules/admin/hooks/useAdminTickets.js
import { useState, useEffect } from 'react';
import { adminTicketsApi } from '../api/adminTicketsApi';

export const useAdminTickets = () => {
    const [tickets, setTickets] = useState([]);
    const [ticketSeleccionado, setTicketSeleccionado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);
    const [filtros, setFiltros] = useState({});
    const [paginacion, setPaginacion] = useState({});
    const [estadisticas, setEstadisticas] = useState({
        total: 0,
        abiertos: 0,
        en_proceso: 0,
        resueltos: 0
    });

    // Obtener lista de tickets
    const obtenerTickets = async (params = {}) => {
        try {
            setCargando(true);
            setError(null);

            const respuesta = await adminTicketsApi.obtenerTickets(params);

            // Calcular estadísticas básicas desde los tickets
            if (respuesta.results || Array.isArray(respuesta)) {
                const ticketsData = respuesta.results || respuesta;
                setTickets(ticketsData);

                // Calcular estadísticas
                const stats = {
                    total: ticketsData.length,
                    abiertos: ticketsData.filter(t => t.estado === 'Abierto').length,
                    en_proceso: ticketsData.filter(t => t.estado === 'En Proceso').length,
                    resueltos: ticketsData.filter(t => t.estado === 'Resuelto').length
                };
                setEstadisticas(stats);
            }

            setPaginacion(respuesta.pagination || {});
            setFiltros(respuesta.filtros_aplicados || {});
        } catch (err) {
            setError('Error al cargar los tickets');
            console.error('Error tickets:', err);
        } finally {
            setCargando(false);
        }
    };

    // Obtener detalle de un ticket
    const obtenerTicket = async (id) => {
        try {
            setError(null);
            const ticket = await adminTicketsApi.obtenerTicket(id);
            return { exito: true, ticket };
        } catch (err) {
            const mensajeError = 'Error al cargar el ticket';
            setError(mensajeError);
            return { exito: false, error: mensajeError };
        }
    };

    // Actualizar ticket
    const actualizarTicket = async (id, datosTicket) => {
        try {
            setError(null);
            const ticketActualizado = await adminTicketsApi.actualizarTicket(id, datosTicket);

            // Actualizar en la lista
            setTickets(prev => prev.map(ticket =>
                ticket.id === id ? { ...ticket, ...ticketActualizado } : ticket
            ));

            return { exito: true, ticket: ticketActualizado };
        } catch (err) {
            const mensajeError = err.response?.data || 'Error al actualizar el ticket';
            setError(mensajeError);
            return { exito: false, error: mensajeError };
        }
    };

    // Obtener opciones de filtro - SIMULADO
    const obtenerOpcionesFiltro = async () => {
        try {
            const data = await adminTicketsApi.obtenerOpcionesFiltro();
            console.log("✅ DATOS PARA FILTROS RECIBIDOS:", data); // <-- Añade esta línea para depurar
            return data;
        } catch (err) {
            console.error('Error opciones filtro:', err);
            // Devolver datos por defecto si falla
            return {
                categorias: [],
                agentes: []
            };
        }
    };

    // Aplicar filtros
    const aplicarFiltros = (nuevosFiltros) => {
        obtenerTickets(nuevosFiltros);
    };

    // Cambiar página
    const cambiarPagina = (pagina) => {
        obtenerTickets({ ...filtros, page: pagina });
    };

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