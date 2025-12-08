import React from "react";
import "../styles/agente.css";

const TicketDetail = ({ ticket, historial, onClose, onEstado, onReasignar, agentes }) => {
    if (!ticket) {
        return null;
    }

    const safeHistorial = Array.isArray(historial) ? historial : [];
    const safeAgentes = Array.isArray(agentes) ? agentes : [];

    return (
        <div className="modal">
            {/* Usamos una clase 'large' para un modal más ancho si es necesario */}
            <div className="modal-window large">
                <div className="modal-header">
                    <h3>
                        <span className="text-muted">Ticket #{ticket.id}</span>
                        <br />
                        {ticket.titulo}
                    </h3>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    <div className="ticket-detail-grid">
                        {/* Columna Izquierda: Información y Acciones */}
                        <div className="ticket-info-section">
                            <h4>Detalles del Ticket</h4>
                            <table className="info-table">
                                <tbody>
                                    <tr>
                                        <td>Estado:</td>
                                        <td><span className={`ticket-status ${ticket.estado?.replace(' ', '-').toLowerCase() || 'desconocido'}`}>{ticket.estado}</span></td>
                                    </tr>
                                    <tr>
                                        <td>Prioridad:</td>
                                        <td><span className={`ticket-priority ${ticket.prioridad?.toLowerCase() || 'normal'}`}>{ticket.prioridad}</span></td>
                                    </tr>
                                    <tr>
                                        <td>Solicitante:</td>
                                        <td>{ticket.solicitante_info?.username || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td>Agente:</td>
                                        <td>{ticket.agente_info?.username || 'No asignado'}</td>
                                    </tr>
                                    <tr>
                                        <td>Creado:</td>
                                        <td>{new Date(ticket.fecha_creacion).toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className="ticket-actions">
                                <div className="action-group">
                                    <label htmlFor="estado-select">Cambiar Estado</label>
                                    <select id="estado-select" onChange={(e) => onEstado(e.target.value)} defaultValue={ticket.estado}>
                                        <option value="Abierto">Abierto</option>
                                        <option value="En Proceso">En Proceso</option>
                                        <option value="Resuelto">Resuelto</option>
                                    </select>
                                </div>
                                <div className="action-group">
                                    <label htmlFor="reasignar-btn">Reasignar</label>
                                    <button id="reasignar-btn" onClick={onReasignar} className="btn-secondary small">
                                        Reasignar Ticket
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Columna Derecha: Descripción e Historial */}
                        <div className="ticket-info-section">
                            <h4>Descripción</h4>
                            <p className="ticket-description-full">{ticket.descripcion}</p>

                            <h4>Historial de Cambios</h4>
                            <div className="historial-list">
                                {safeHistorial.length > 0 ? (
                                    safeHistorial.map((h) => (
                                        <div key={h.id} className="historial-item">
                                            <div className="historial-accion">{h.accion}</div>
                                            <div className="historial-descripcion">{h.descripcion}</div>
                                            <div className="historial-fecha">{new Date(h.fecha).toLocaleString()}</div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted">No hay historial de cambios para este ticket.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketDetail;
