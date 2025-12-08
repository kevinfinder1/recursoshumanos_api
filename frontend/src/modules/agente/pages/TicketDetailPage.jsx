import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useOutletContext } from 'react-router-dom';
import { getDetalleTicketAgente, reasignarTicket, cambiarEstadoTicket, getAgentesDisponibles, eliminarTicket, sendAgentTicketMessage } from '../../../api/ticketsApi';
import { ArrowLeft, Send, Clock, Edit, Trash2, User, Calendar, AlertCircle, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useAuth } from '../../../context/AuthContext';
import EditTicketModal from '../components/EditTicketModal';
import "../styles/agente.css";

const TicketDetailPage = ({ onReassignSuccess }) => {
    const { id: ticketId } = useParams();
    const navigate = useNavigate();
    const { fetchAll: reloadDashboardData } = useOutletContext();
    const { user } = useAuth();

    const [ticket, setTicket] = useState(null);
    const [agentes, setAgentes] = useState([]);
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [nuevoEstadoSeleccionado, setNuevoEstadoSeleccionado] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [newMessage, setNewMessage] = useState('');
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const ticketResponse = await getDetalleTicketAgente(ticketId);
            setTicket(ticketResponse.data);

            const agentesResponse = await getAgentesDisponibles();
            const currentUserInTicket = ticketResponse.data.agente_info?.id;
            const filteredAgentes = agentesResponse.data.agentes.filter(ag => ag.id !== currentUserInTicket);
            setAgentes(filteredAgentes);

        } catch (err) {
            console.error("Error al cargar el detalle del ticket:", err);
            setError('No se pudo cargar el ticket. Es posible que no tengas permiso o que no exista.');
        } finally {
            setLoading(false);
        }
    }, [ticketId]);

    const handleChangeState = async (nuevoEstado) => {
        if (!nuevoEstado || nuevoEstado === ticket.estado) {
            toast.error("Selecciona un estado diferente.");
            return;
        }

        toast.promise(
            cambiarEstadoTicket(ticketId, nuevoEstado),
            {
                loading: 'Cambiando estado...',
                success: (response) => {
                    setTicket(response.data.ticket);
                    setNuevoEstadoSeleccionado(response.data.ticket.estado);
                    if (reloadDashboardData) reloadDashboardData();
                    return 'Estado actualizado exitosamente.';
                },
                error: 'No se pudo cambiar el estado.',
            }
        );
    };

    const handleReassign = async (agentId) => {
        if (!agentId) return;

        toast.promise(
            reasignarTicket(ticketId, agentId),
            {
                loading: 'Enviando solicitud de reasignación...',
                success: () => {
                    if (onReassignSuccess) onReassignSuccess(parseInt(ticketId));
                    navigate('/agente');
                    return 'Solicitud enviada exitosamente.';
                },
                error: 'No se pudo enviar la solicitud.',
            }
        );
    };

    const handleDelete = async () => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esta acción. El ticket será eliminado permanentemente.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, ¡eliminar!',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        toast.promise(
            eliminarTicket(ticketId),
            {
                loading: 'Eliminando ticket...',
                success: () => {
                    navigate('/agente');
                    return 'Ticket eliminado exitosamente.';
                },
                error: 'No se pudo eliminar el ticket.',
            }
        );
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setIsSendingMessage(true);
        try {
            await sendAgentTicketMessage(ticketId, newMessage);
            setNewMessage('');
            toast.success('Mensaje enviado.');
            await fetchData();
        } catch (error) {
            toast.error('No se pudo enviar el mensaje.');
        } finally {
            setIsSendingMessage(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (ticket) setNuevoEstadoSeleccionado(ticket.estado);
    }, [ticket]);

    useEffect(() => {
        if (ticket && ticket.tiempo_restante_edicion > 0) {
            setCountdown(ticket.tiempo_restante_edicion);

            const timer = setInterval(() => {
                setCountdown(prevCountdown => {
                    if (prevCountdown <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prevCountdown - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [ticket]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="agente-dashboard">
                <div className="ticket-detail-container">
                    <div className="ticket-list-loading">
                        <div className="loading-spinner"></div>
                        <p>Cargando detalle del ticket...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="agente-dashboard">
                <div className="ticket-detail-container">
                    <div className="empty-tickets" style={{ textAlign: 'center', padding: '40px' }}>
                        <AlertCircle size={48} style={{ color: 'var(--color-warning)', marginBottom: '16px' }} />
                        <p style={{ color: 'var(--color-warning)', fontSize: '18px', marginBottom: '8px' }}>{error}</p>
                        <Link to="/agente" className="btn-primary" style={{ display: 'inline-block', marginTop: '16px' }}>
                            Volver al Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="agente-dashboard">
                <div className="ticket-detail-container">
                    <div className="empty-tickets" style={{ textAlign: 'center', padding: '40px' }}>
                        <p style={{ fontSize: '18px', marginBottom: '16px' }}>Ticket no encontrado</p>
                        <Link to="/agente" className="btn-primary" style={{ display: 'inline-block' }}>
                            Volver al Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="agente-dashboard">
            <div className="ticket-detail-container">
                <div className="ticket-detail-header">
                    <div>
                        <h1 className="detail-title">{ticket.titulo}</h1>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                            <span className={`ticket-priority ${ticket.prioridad.toLowerCase()}`}>
                                {ticket.prioridad}
                            </span>
                            <span className={`ticket-status ${ticket.estado.toLowerCase().replace(' ', '-')}`}>
                                {ticket.estado}
                            </span>
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: 'var(--text-muted)',
                                fontSize: '14px'
                            }}>
                                <Calendar size={14} />
                                {new Date(ticket.fecha_creacion).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <Link to="/agente" className="back-link">
                        <ArrowLeft size={20} />
                        Volver al Dashboard
                    </Link>
                </div>

                <div className="ticket-detail-grid">
                    {/* Columna izquierda - Información del ticket */}
                    <div>
                        <div className="ticket-info-section">
                            <h4>Información del Ticket</h4>
                            <table className="info-table">
                                <tbody>
                                    <tr>
                                        <td>ID:</td>
                                        <td><strong>#{ticket.id}</strong></td>
                                    </tr>
                                    <tr>
                                        <td>Solicitante:</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <User size={14} style={{ color: 'var(--text-muted)' }} />
                                                {ticket.solicitante_info?.username || 'N/A'}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Agente asignado:</td>
                                        <td>
                                            {ticket.agente_info ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <User size={14} style={{ color: 'var(--text-muted)' }} />
                                                    {ticket.agente_info.username}
                                                </div>
                                            ) : (
                                                'Sin asignar'
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Fecha creación:</td>
                                        <td>{new Date(ticket.fecha_creacion).toLocaleString()}</td>
                                    </tr>
                                    {ticket.fecha_actualizacion && (
                                        <tr>
                                            <td>Última actualización:</td>
                                            <td>{new Date(ticket.fecha_actualizacion).toLocaleString()}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Acciones del creador */}
                        {user && ticket.solicitante_info?.id === user.id && (
                            <div className="ticket-info-section" style={{ marginTop: '24px' }}>
                                <h4>Acciones del Creador</h4>
                                {countdown > 0 ? (
                                    <>
                                        <div style={{
                                            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                                            border: '1px solid rgba(245, 158, 11, 0.3)',
                                            borderRadius: 'var(--radius-md)',
                                            padding: '16px',
                                            marginBottom: '16px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                <Clock size={16} style={{ color: 'var(--color-accent)' }} />
                                                <span style={{ fontWeight: '600', color: 'var(--color-accent)' }}>
                                                    Tiempo restante para editar:
                                                </span>
                                            </div>
                                            <div style={{
                                                fontSize: '24px',
                                                fontWeight: '700',
                                                color: 'var(--color-accent)',
                                                textAlign: 'center',
                                                fontFamily: 'monospace'
                                            }}>
                                                {formatTime(countdown)}
                                            </div>
                                        </div>
                                        <div className="detail-actions">
                                            <button
                                                onClick={() => setIsEditModalOpen(true)}
                                                className="btn-primary"
                                                style={{ flex: 1 }}
                                                type="button"
                                            >
                                                <Edit size={16} style={{ marginRight: '8px' }} />
                                                Editar Ticket
                                            </button>
                                            <button
                                                onClick={handleDelete}
                                                className="btn-danger"
                                                style={{ flex: 1 }}
                                                type="button"
                                            >
                                                <Trash2 size={16} style={{ marginRight: '8px' }} />
                                                Eliminar
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{
                                        background: 'var(--bg-lighter)',
                                        padding: '16px',
                                        borderRadius: 'var(--radius-md)',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{ color: 'var(--text-muted)', marginBottom: '0' }}>
                                            El tiempo para editar o eliminar este ticket ha expirado.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Columna derecha - Descripción e historial */}
                    <div>
                        <div className="ticket-info-section">
                            <h4>Descripción</h4>
                            <div className="ticket-description-full">
                                {ticket.descripcion || (
                                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                        No hay descripción disponible.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="ticket-info-section" style={{ marginTop: '24px' }}>
                            <h4>Historial y Comentarios</h4>
                            <div className="historial-list">
                                {ticket.historial && ticket.historial.length > 0 ? (
                                    ticket.historial
                                        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                                        .map(item => (
                                            <div key={item.id} className="historial-item">
                                                <div className="historial-accion">
                                                    <MessageSquare size={14} style={{ display: 'inline', marginRight: '6px' }} />
                                                    {item.descripcion ? 'Comentario' : item.accion}
                                                </div>
                                                <div className="historial-descripcion">
                                                    {item.descripcion || item.accion}
                                                </div>
                                                <div className="historial-fecha">
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <User size={12} />
                                                        {(() => {
                                                            if (item.usuario_info) {
                                                                const nombreCompleto = `${item.usuario_info.first_name || ''} ${item.usuario_info.last_name || ''}`.trim();
                                                                return nombreCompleto || item.usuario_info.username;
                                                            }
                                                            return 'Usuario desconocido';
                                                        })()}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{new Date(item.fecha).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ))
                                ) : (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '32px',
                                        color: 'var(--text-muted)'
                                    }}>
                                        <MessageSquare size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                                        <p>No hay historial disponible.</p>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleSendMessage} className="chat-form-agente">
                                <textarea
                                    id="mensaje-ticket"
                                    name="mensaje"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Escribe tu comentario aquí..."
                                    disabled={isSendingMessage}
                                    rows="3"
                                    autoComplete="off"
                                />
                                <button
                                    type="submit"
                                    disabled={isSendingMessage || !newMessage.trim()}
                                    className="btn-primary"
                                >
                                    {isSendingMessage ? (
                                        <>
                                            <div className="loading-spinner" style={{
                                                width: '16px',
                                                height: '16px',
                                                marginRight: '8px',
                                                borderWidth: '2px'
                                            }}></div>
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} style={{ marginRight: '8px' }} />
                                            Enviar
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Acciones del agente */}
                {user && (!ticket.solicitante_info || ticket.solicitante_info.id !== user.id) && (
                    <div className="ticket-actions">
                        <h3>Acciones del Agente</h3>

                        {ticket.estado === 'Resuelto' ? (
                            <div className="warning-message" style={{
                                background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                                borderColor: 'rgba(22, 163, 74, 0.3)',
                                color: '#065f46'
                            }}>
                                Este ticket está resuelto y cerrado.
                            </div>
                        ) : (
                            <div className="action-group">
                                <div>
                                    <label htmlFor="estado-select">Cambiar Estado</label>
                                    <select
                                        id="estado-select"
                                        name="estado"
                                        value={nuevoEstadoSeleccionado}
                                        onChange={(e) => setNuevoEstadoSeleccionado(e.target.value)}
                                        autoComplete="off"
                                    >
                                        <option value="Abierto">Abierto</option>
                                        <option value="En Proceso">En Proceso</option>
                                        <option value="Resuelto">Resuelto</option>
                                    </select>
                                    <button
                                        onClick={() => handleChangeState(nuevoEstadoSeleccionado)}
                                        disabled={nuevoEstadoSeleccionado === ticket.estado}
                                        className="btn-primary"
                                        type="button"
                                    >
                                        {nuevoEstadoSeleccionado === ticket.estado ? 'Estado Actual' : 'Guardar Estado'}
                                    </button>
                                </div>

                                <div>
                                    <label htmlFor="agente-select">Reasignar a otro agente</label>
                                    <select
                                        id="agente-select"
                                        name="agente"
                                        value={selectedAgentId}
                                        onChange={(e) => setSelectedAgentId(e.target.value)}
                                        autoComplete="off"
                                    >
                                        <option value="">-- Seleccionar agente --</option>
                                        {agentes.map(ag => (
                                            <option key={ag.id} value={ag.id}>
                                                {ag.username}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => handleReassign(selectedAgentId)}
                                        disabled={!selectedAgentId}
                                        className="btn-secondary"
                                        type="button"
                                    >
                                        Enviar Ticket
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isEditModalOpen && (
                <EditTicketModal
                    ticket={ticket}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={(updatedTicket) => setTicket(updatedTicket)}
                />
            )}
        </div>
    );
};

export default TicketDetailPage;