import React from "react";
import { Link, useOutletContext } from "react-router-dom";
import "../styles/agente.css";

const MyCreatedTickets = ({ title = "Mis Tickets Creados" }) => {
    const { misTicketsCreados: tickets, loading, fetchAll: onRefresh } = useOutletContext();

    const safeTickets = Array.isArray(tickets) ? tickets : [];

    if (loading) {
        return (
            <div className="ticket-list-loading">
                <div className="loading-spinner"></div>
                <p>Cargando tickets...</p>
            </div>
        );
    }

    return (
        <div className="ticket-list-container">
            <div className="ticket-list-header">
                <h2>{title} ({safeTickets.length})</h2>
                <button
                    onClick={onRefresh}
                    className="refresh-button"
                    disabled={loading}
                >
                    Actualizar
                </button>
            </div>

            {safeTickets.length === 0 ? (
                <div className="empty-tickets">
                    <p>No has creado ningún ticket</p>
                    <small>Los tickets que crees para otros agentes aparecerán aquí.</small>
                </div>
            ) : (
                <div className="tickets-grid">
                    {safeTickets.map((ticket) => (
                        <TicketCard
                            key={ticket.id || ticket._id}
                            ticket={ticket}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const TicketCard = ({ ticket }) => {
    if (!ticket) return null;

    const cardStyle = {
        textDecoration: 'none',
        color: 'inherit',
    };

    return (
        <Link to={`/agente/tickets/${ticket.id}`} style={cardStyle} className="ticket-card">
            <div>
                <div className="ticket-header">
                    <h3 className="ticket-title">{ticket.titulo || "Sin título"}</h3>
                    <span className={`ticket-priority ${ticket.prioridad?.toLowerCase() || 'normal'}`}>{ticket.prioridad || 'Normal'}</span>
                </div>
                <p className="ticket-description">{ticket.descripcion || "Sin descripción"}</p>
                <div className="ticket-footer">
                    <span className={`ticket-status ${ticket.estado?.replace(' ', '-').toLowerCase() || 'desconocido'}`}>{ticket.estado || 'Desconocido'}</span>
                    <span className="ticket-date">{new Date(ticket.fecha_creacion).toLocaleDateString()}</span>
                </div>
            </div>
        </Link>
    );
};

export default MyCreatedTickets;