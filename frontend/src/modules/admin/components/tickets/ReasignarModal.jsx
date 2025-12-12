// src/modules/admin/components/tickets/ReasignarModal.jsx
import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { adminUsersApi } from '../../api/adminUsersApi';
import './ReasignarModal.css';

const ReasignarModal = ({ ticket, onReasignar, onCancelar, mensajeExito }) => {
    const [agentes, setAgentes] = useState([]);
    const [agenteSeleccionado, setAgenteSeleccionado] = useState('');
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        cargarAgentes();

        // Preseleccionar el agente actual si existe
        if (ticket.agente && ticket.agente.id) {
            setAgenteSeleccionado(ticket.agente.id.toString());
        }
    }, [ticket]);

    const cargarAgentes = async () => {
        try {
            setCargando(true);
            const respuesta = await adminUsersApi.obtenerUsuarios({ role: '' });
            const data = respuesta.results || respuesta; // Manejar paginación o array directo

            // ✅ MEJORA: Filtrar agentes según el 'tipo_agente' de la categoría del ticket.
            const rolRequeridoId = ticket.categoria_principal?.tipo_agente;

            let agentesFiltrados = Array.isArray(data) ? data.filter(user =>
                user.rol?.tipo_base === 'agente' || user.rol?.tipo_base === 'admin'
            ) : [];

            // Si la categoría del ticket especifica un rol, filtramos por ese rol.
            if (rolRequeridoId) {
                agentesFiltrados = agentesFiltrados.filter(user => user.rol?.id === rolRequeridoId);
            }

            // Opcional: quitar al agente actual de la lista para evitar reasignarse a sí mismo.
            agentesFiltrados = agentesFiltrados.filter(user => user.id !== ticket.agente_info?.id);

            setAgentes(agentesFiltrados);
        } catch (err) {
            setError('Error al cargar los agentes');
            console.error('Error agentes:', err);
        } finally {
            setCargando(false);
        }
    };

    const manejarReasignar = async () => {
        if (!agenteSeleccionado) {
            setError('Por favor selecciona un agente');
            return;
        }

        setError(null);
        await onReasignar(ticket.id, parseInt(agenteSeleccionado));
    };

    if (mensajeExito) {
        return (
            <div className="modal-overlay">
                <div className="modal-reasignar">
                    <div className="modal-header">
                        <h3>Reasignar Ticket</h3>
                        <button onClick={onCancelar} className="btn-cerrar-modal"><FaTimes /></button>
                    </div>
                    <div className="modal-contenido">
                        <div className="mensaje-exito-modal">
                            {mensajeExito}
                        </div>
                    </div>
                    <div className="modal-acciones">
                        <button
                            onClick={onCancelar}
                            className="btn-modal btn-cerrar"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay">
            <div className="modal-reasignar">
                <div className="modal-header">
                    <h3>Reasignar Ticket #{ticket.id}</h3>
                    <button onClick={onCancelar} className="btn-cerrar-modal"><FaTimes /></button>
                </div>

                <div className="modal-contenido">
                    <div className="info-ticket">
                        <h4>{ticket.titulo}</h4>
                        <p>
                            <strong>Agente actual:</strong>{' '}
                            {ticket.agente_info?.username || 'Sin asignar'}
                        </p>
                    </div>

                    {error && (
                        <div className="mensaje-error">
                            {error}
                        </div>
                    )}

                    <div className="formulario-reasignar">
                        <div className="grupo-formulario">
                            <label htmlFor="agente">Seleccionar Agente:</label>
                            {cargando ? (
                                <div className="cargando-agentes">Cargando agentes...</div>
                            ) : (
                                <select
                                    id="agente"
                                    value={agenteSeleccionado}
                                    onChange={(e) => setAgenteSeleccionado(e.target.value)}
                                    className="select-agente"
                                >
                                    <option value="">Seleccionar agente...</option>
                                    {agentes.map((agente) => (
                                        <option key={agente.id} value={agente.id}>
                                            {agente.username} ({agente.rol_display || (agente.role && typeof agente.role === 'object' ? agente.role.nombre_visible : agente.role) || 'Sin rol'})
                                            {agente.total_tickets_asignados !== undefined &&
                                                ` - ${agente.total_tickets_asignados} tickets`
                                            }
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {agenteSeleccionado && (
                            <div className="info-agente-seleccionado">
                                <h5>Información del Agente Seleccionado:</h5>
                                {agentes.find(a => a.id.toString() === agenteSeleccionado) && (
                                    <div className="detalles-agente">
                                        <p>
                                            <strong>Usuario:</strong>{' '}
                                            {agentes.find(a => a.id.toString() === agenteSeleccionado).username}
                                        </p>
                                        <p>
                                            <strong>Rol:</strong>{' '}
                                            {agentes.find(a => a.id.toString() === agenteSeleccionado).rol_display}
                                        </p>
                                        <p>
                                            <strong>Tickets Asignados:</strong>{' '}
                                            {agentes.find(a => a.id.toString() === agenteSeleccionado).total_tickets_asignados || 0}
                                        </p>
                                        <p>
                                            <strong>Estado:</strong>{' '}
                                            {agentes.find(a => a.id.toString() === agenteSeleccionado).esta_activo ? 'Activo' : 'Inactivo'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-acciones">
                    <button
                        onClick={onCancelar}
                        className="btn-modal btn-cancelar"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={manejarReasignar}
                        className="btn-modal btn-confirmar"
                        disabled={!agenteSeleccionado || cargando}
                    >
                        {cargando ? 'Reasignando...' : 'Confirmar Reasignación'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReasignarModal;