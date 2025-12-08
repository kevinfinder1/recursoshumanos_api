// src/modules/admin/pages/TicketsListPage.jsx
import React, { useState, useEffect } from 'react';
import { useAdminTickets } from '../hooks/useAdminTickets';
import AdminTicketsTable from '../components/tickets/AdminTicketsTable';
import TicketsFilters from '../components/tickets/TicketsFilters';
import TicketDetailModal from '../components/tickets/TicketDetailModal';
import ReasignarModal from '../components/tickets/ReasignarModal';
import './TicketsListPage.css';

const IconoCrear = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

// --- Iconos para Estadísticas ---
const IconoTotal = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>;
const IconoAbierto = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>;
const IconoEnProceso = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const IconoResuelto = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;

const TicketsListPage = () => {
    const {
        tickets,
        cargando,
        error,
        filtros,
        estadisticas,
        obtenerTickets,
        obtenerTicket, // <-- 1. Importar la función del hook
        actualizarTicket,
        aplicarFiltros,
        obtenerOpcionesFiltro
    } = useAdminTickets();

    const [opcionesFiltro, setOpcionesFiltro] = useState({
        categorias: [],
        agentes: []
    });
    const [ticketDetalle, setTicketDetalle] = useState(null);
    const [ticketReasignar, setTicketReasignar] = useState(null);
    const [mensajeExito, setMensajeExito] = useState('');
    const [cargandoDetalle, setCargandoDetalle] = useState(false); // <-- 2. Añadir estado de carga

    useEffect(() => {
        cargarOpcionesFiltro();
    }, []);

    const cargarOpcionesFiltro = async () => {
        const opciones = await obtenerOpcionesFiltro();
        setOpcionesFiltro(opciones);
    };

    const manejarVerDetalle = async (ticket) => {
        // <-- 3. Modificar esta función
        setCargandoDetalle(true);
        setTicketDetalle({ id: ticket.id }); // Abre el modal con datos mínimos
        const resultado = await obtenerTicket(ticket.id);
        if (resultado.exito) {
            setTicketDetalle(resultado.ticket);
        }
        // El error ya se maneja en el hook, pero podrías añadir lógica aquí si quieres
        setCargandoDetalle(false);
    };

    const manejarReasignar = (ticket) => {
        setTicketReasignar(ticket);
    };

    const manejarCerrarModal = () => {
        setTicketDetalle(null);
        setTicketReasignar(null);
        setMensajeExito('');
    };

    const manejarReasignarAgente = async (ticketId, agenteId) => {
        const resultado = await actualizarTicket(ticketId, { agente: agenteId });

        if (resultado.exito) {
            setMensajeExito('Agente reasignado exitosamente');
            setTimeout(() => {
                manejarCerrarModal();
            }, 1500);
        }
    };

    const manejarCambiarEstado = async (ticketId, nuevoEstado) => {
        const resultado = await actualizarTicket(ticketId, { estado: nuevoEstado });

        if (resultado.exito) {
            setMensajeExito(`Ticket ${nuevoEstado.toLowerCase()} exitosamente`);
            setTimeout(() => {
                setMensajeExito('');
            }, 2000);
        }
    };

    return (
        <div className="pagina-lista-tickets">
            <div className="pagina-header">
                <div>
                    <h1>Gestión de Tickets</h1>
                    <p className="pagina-subtitulo">
                        Administra todos los tickets del sistema
                    </p>
                </div>
                <div className="header-acciones">
                    <button onClick={() => { }} className="btn-crear-ticket" disabled title="Funcionalidad no implementada">
                        <IconoCrear /> Crear Ticket
                    </button>
                </div>
            </div>

            {/* Estadísticas rápidas con iconos */}
            <div className="estadisticas-rapidas">
                <div className="tarjeta-estadistica-ticket total">
                    <div className="estadistica-icono"><IconoTotal /></div>
                    <div className="estadistica-info">
                        <span className="estadistica-valor">{estadisticas.total}</span>
                        <span className="estadistica-label">Total Tickets</span>
                    </div>
                </div>
                <div className="tarjeta-estadistica-ticket abiertos">
                    <div className="estadistica-icono"><IconoAbierto /></div>
                    <div className="estadistica-info">
                        <span className="estadistica-valor">{estadisticas.abiertos}</span>
                        <span className="estadistica-label">Abiertos</span>
                    </div>
                </div>
                <div className="tarjeta-estadistica-ticket en-proceso">
                    <div className="estadistica-icono"><IconoEnProceso /></div>
                    <div className="estadistica-info">
                        <span className="estadistica-valor">{estadisticas.en_proceso}</span>
                        <span className="estadistica-label">En Proceso</span>
                    </div>
                </div>
                <div className="tarjeta-estadistica-ticket resueltos">
                    <div className="estadistica-icono"><IconoResuelto /></div>
                    <div className="estadistica-info">
                        <span className="estadistica-valor">{estadisticas.resueltos}</span>
                        <span className="estadistica-label">Resueltos</span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mensaje-error">
                    {typeof error === 'object' ? JSON.stringify(error) : error}
                </div>
            )}

            {mensajeExito && (
                <div className="mensaje-exito">
                    {mensajeExito}
                </div>
            )}

            <TicketsFilters
                filtrosAplicados={filtros}
                onFiltrosChange={aplicarFiltros}
                opcionesFiltro={opcionesFiltro}
            />

            <AdminTicketsTable
                tickets={tickets}
                cargando={cargando}
                onVerDetalle={manejarVerDetalle}
                onReasignar={manejarReasignar}
            />

            {/* Modal de detalle de ticket */}
            {ticketDetalle && (
                <TicketDetailModal
                    ticket={ticketDetalle}
                    cargando={cargandoDetalle}
                    onCerrar={manejarCerrarModal}
                    onCambiarEstado={manejarCambiarEstado}
                    onReasignar={manejarReasignar}
                />
            )}

            {/* Modal de reasignación */}
            {ticketReasignar && (
                <ReasignarModal
                    ticket={ticketReasignar}
                    onReasignar={manejarReasignarAgente}
                    onCancelar={manejarCerrarModal}
                    mensajeExito={mensajeExito}
                />
            )}
        </div>
    );
};

export default TicketsListPage;