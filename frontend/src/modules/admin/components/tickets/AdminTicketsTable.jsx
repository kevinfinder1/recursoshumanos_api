// src/modules/admin/components/tickets/AdminTicketsTable.jsx
import React from 'react';
import { FaEye, FaExchangeAlt, FaStar } from 'react-icons/fa';
import './AdminTicketsTable.css';

const AdminTicketsTable = ({
    tickets,
    cargando,
    onVerDetalle,
    onReasignar
}) => {
    if (cargando) {
        return <div className="tabla-cargando">Cargando tickets...</div>;
    }

    if (!tickets || tickets.length === 0) {
        return <div className="tabla-vacia">No se encontraron tickets</div>;
    }

    // DEBUG: Imprimir el primer ticket para ver su estructura
    console.log('Datos del ticket en la TABLA:', tickets[0]);

    const getBadgeEstado = (estado) => {
        const estados = {
            'Abierto': { clase: 'estado-abierto', texto: 'Abierto' },
            'En Proceso': { clase: 'estado-proceso', texto: 'En Proceso' },
            'Resuelto': { clase: 'estado-resuelto', texto: 'Resuelto' },
            'Cerrado': { clase: 'estado-cerrado', texto: 'Cerrado' }
        };

        return estados[estado] || { clase: 'estado-default', texto: estado };
    };

    const getBadgePrioridad = (prioridad, color) => {
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
            year: 'numeric'
        });
    };

    return (
        <div className="contenedor-tabla">
            <table className="tabla-tickets">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Título</th>
                        <th>Solicitante</th>
                        <th>Agente</th>
                        <th>Categoría</th>
                        <th>Estado</th>
                        <th>Prioridad</th>
                        <th>Fecha Creación</th>
                        <th>Días Abierto</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {tickets.map((ticket) => {
                        const badgeEstado = getBadgeEstado(ticket.estado);
                        const badgePrioridad = getBadgePrioridad(ticket.prioridad, ticket.prioridad_color);

                        return (
                            <tr key={ticket.id}>
                                <td>
                                    <span className="ticket-id">#{ticket.id}</span>
                                </td>
                                <td>
                                    <div className="celda-titulo">
                                        <span className="ticket-titulo">{ticket.titulo}</span>
                                        {ticket.rating && (
                                            <span className="ticket-rating"><FaStar /> {ticket.rating}</span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <span className="usuario-info">
                                        {ticket.solicitante_info?.username || 'N/A'}
                                    </span>
                                </td>
                                <td>
                                    <span className="usuario-info">
                                        {ticket.agente_info?.username || 'Sin asignar'}
                                    </span>
                                </td>
                                <td>
                                    <span className="categoria-info">
                                        {ticket.categoria_principal || 'Sin categoría'}
                                    </span>
                                </td>
                                <td>
                                    <span className={`badge-estado ${badgeEstado.clase}`}>
                                        {badgeEstado.texto}
                                    </span>
                                </td>
                                <td>
                                    <span
                                        className={`badge-prioridad ${badgePrioridad.clase}`}
                                        style={{ backgroundColor: ticket.prioridad_color }}
                                    >
                                        {badgePrioridad.texto}
                                    </span>
                                </td>
                                <td>
                                    <span className="fecha-info">
                                        {formatFecha(ticket.fecha_creacion)}
                                    </span>
                                </td>
                                <td>
                                    <span className="dias-abierto">
                                        {ticket.dias_abierto || 0}d
                                    </span>
                                </td>
                                <td>
                                    <div className="contenedor-acciones">
                                        <button
                                            onClick={() => onVerDetalle(ticket)}
                                            className="btn-accion btn-ver"
                                            title="Ver detalles"
                                        >
                                            <FaEye />
                                        </button>
                                        <button
                                            onClick={() => onReasignar(ticket)}
                                            className="btn-accion btn-reasignar"
                                            title="Reasignar agente"
                                        >
                                            <FaExchangeAlt />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default AdminTicketsTable;