// src/modules/admin/components/tickets/TicketDetailModal.jsx
import React from 'react';
import { FaStar, FaExchangeAlt, FaTimes } from 'react-icons/fa';
import './TicketDetailModal.css';

const TicketDetailModal = ({ ticket, cargando, onCerrar, onCambiarEstado, onReasignar }) => {
    const getBadgeEstado = (estado) => {
        const estados = {
            'Abierto': { clase: 'estado-abierto', texto: 'Abierto' },
            'En Proceso': { clase: 'estado-proceso', texto: 'En Proceso' },
            'Resuelto': { clase: 'estado-resuelto', texto: 'Resuelto' },
            'Cerrado': { clase: 'estado-cerrado', texto: 'Cerrado' }
        };
        return estados[estado] || { clase: 'estado-default', texto: estado };
    };

    const getBadgePrioridad = (prioridad) => {
        const prioridades = {
            'Alta': { clase: 'prioridad-alta', texto: 'Alta' },
            'Media': { clase: 'prioridad-media', texto: 'Media' },
            'Baja': { clase: 'prioridad-baja', texto: 'Baja' }
        };
        return prioridades[prioridad] || { clase: 'prioridad-default', texto: prioridad };
    };

    const formatFecha = (fecha) => {
        return new Date(fecha).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const badgeEstado = getBadgeEstado(ticket.estado);
    const badgePrioridad = getBadgePrioridad(ticket.prioridad);

    const estadosDisponibles = {
        'Abierto': ['En Proceso', 'Resuelto', 'Cerrado'],
        'En Proceso': ['Abierto', 'Resuelto', 'Cerrado'],
        'Resuelto': ['Abierto', 'En Proceso', 'Cerrado'],
        'Cerrado': ['Abierto', 'En Proceso', 'Resuelto']
    };

    return (
        <div className="modal-overlay">
            <div className="modal-ticket-detalle">
                <div className="modal-header">
                    <h3>Detalle del Ticket #{ticket.id}</h3>
                    <button onClick={onCerrar} className="btn-cerrar-modal"><FaTimes /></button>
                </div>

                <div className="modal-contenido">
                    {cargando && !ticket.titulo && (
                        <div className="cargando-detalle">
                            Cargando detalles del ticket...
                        </div>
                    )}

                    {!cargando && ticket.titulo && (
                        <>
                            {/* Información principal */}
                            <div className="seccion-ticket">
                                <div className="ticket-header">
                                    <h4 className="ticket-titulo">{ticket.titulo}</h4>
                                    <div className="ticket-badges">
                                        <span className={`badge-estado ${badgeEstado.clase}`}>
                                            {badgeEstado.texto}
                                        </span>
                                        <span
                                            className={`badge-prioridad ${badgePrioridad.clase}`}
                                            style={{ backgroundColor: ticket.prioridad_color }}
                                        >
                                            {badgePrioridad.texto}
                                        </span>                                        {ticket.rating && (
                                            <span className="badge-rating"><FaStar /> {ticket.rating}</span>
                                        )}
                                    </div>
                                </div>

                                <p className="ticket-descripcion">{ticket.descripcion}</p>
                            </div>

                            {/* Información detallada */}
                            <div className="seccion-informacion">
                                <h5>Información del Ticket</h5>
                                <div className="grid-informacion">
                                    <div className="info-item">
                                        <label>Solicitante:</label>
                                        <span>{ticket.solicitante_info?.username || 'N/A'}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Agente Asignado:</label>
                                        <span>{ticket.agente_info?.username || 'Sin asignar'}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Categoría:</label>
                                        <span>{ticket.categoria_principal || 'Sin categoría'}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Subcategoría:</label>
                                        <span>{ticket.subcategoria || 'N/A'}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Fecha Creación:</label>
                                        <span>{formatFecha(ticket.fecha_creacion)}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Última Actualización:</label>
                                        <span>{formatFecha(ticket.fecha_actualizacion)}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Fecha Cierre:</label>
                                        <span>{ticket.fecha_cierre ? formatFecha(ticket.fecha_cierre) : 'No cerrado'}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Días Abierto:</label>
                                        <span>{ticket.dias_abierto || 0} días</span>
                                    </div>
                                </div>
                            </div>

                            {/* Acciones */}
                            <div className="seccion-acciones">
                                <h5>Acciones</h5>
                                <div className="acciones-grid">
                                    {/* Cambiar estado */}
                                    <div className="accion-grupo">
                                        <label>Cambiar Estado:</label>
                                        <div className="botones-estado">
                                            {(estadosDisponibles[ticket.estado] || []).map((estado) => (
                                                <button
                                                    key={estado}
                                                    onClick={() => onCambiarEstado(ticket.id, estado)}
                                                    className={`btn-estado ${getBadgeEstado(estado).clase}`}
                                                >
                                                    {estado}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Reasignar agente */}
                                    <div className="accion-grupo">
                                        <label>Reasignar Agente:</label>
                                        <button
                                            onClick={() => onReasignar(ticket)}
                                            className="btn-reasignar"
                                        >
                                            <FaExchangeAlt /> Reasignar Agente
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-acciones">
                    <button
                        onClick={onCerrar}
                        className="btn-modal btn-cerrar"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TicketDetailModal;