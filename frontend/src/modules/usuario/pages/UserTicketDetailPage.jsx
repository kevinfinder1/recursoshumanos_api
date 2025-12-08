// src/pages/solicitante/UserTicketDetailPage.jsx
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import {
    Calendar,
    Clock,
    User,
    ArrowLeft,
    FileDown,
    Trash2,
    Pencil,
    X,
    Star,
    MessageSquare,
} from "lucide-react";

import { deleteUserTicket, rateUserTicket, updateUserTicket } from "../../../api/userTickets";
import { useUserTicketDetail } from "../hooks/useUserTickets";
import UserTicketForm from "../components/UserTicketForm";
import "../styles/userPanel.css";

const StarRating = ({ onRate, loading }) => {
    const [hover, setHover] = useState(0);
    return (
        <div className="flex items-center gap-1">
            {[...Array(5)].map((_, index) => {
                const ratingValue = index + 1;
                return (
                    <button
                        key={ratingValue}
                        disabled={loading}
                        onClick={() => onRate(ratingValue)}
                        onMouseEnter={() => setHover(ratingValue)}
                        onMouseLeave={() => setHover(0)}
                        className="p-1 transition-transform duration-200 ease-in-out hover:scale-125 disabled:opacity-50"
                    >
                        <Star
                            className={`w-6 h-6 ${ratingValue <= hover ? "text-yellow-400" : "text-gray-300"}`}
                            fill={ratingValue <= hover ? "currentColor" : "none"}
                        />
                    </button>
                );
            })}
        </div>
    );
};

const formatHistoryChange = (accion) => {
    if (!accion) return null;

    let parsedChange = accion;
    // El campo 'cambio' puede venir como un string JSON, hay que parsearlo.
    if (typeof parsedChange === 'string' && parsedChange.startsWith('{')) {
        try {
            parsedChange = JSON.parse(parsedChange);
        } catch (e) {
            // Si falla el parseo, devolvemos la cadena original.
            return accion;
        }
    }

    // Ahora sí, trabajamos con el objeto parseado.
    if (parsedChange && typeof parsedChange === 'object' && parsedChange.campo) {
        const fieldName = parsedChange.campo.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        const valAnt = parsedChange.valor_anterior;
        const valNue = parsedChange.valor_nuevo;

        if (valAnt !== null && valAnt !== undefined) {
            return `Cambió ${fieldName} de "${valAnt}" a "${valNue}".`;
        }
        return `Estableció ${fieldName} a "${valNue}".`;
    }

    // Si es una cadena de texto simple (fallback)
    return accion;
}

const TicketHistory = ({ history }) => {
    if (!history || history.length === 0) {
        return (
            <div className="mt-8">
                <h3 className="up-history-title">Historial del Ticket</h3>
                <p className="text-muted p-4">No hay historial de cambios para este ticket.</p>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <h3 className="up-history-title">Historial del Ticket</h3>
            <div className="up-history-timeline">
                {history.map((item) => (
                    <div key={item.id} className="history-item">
                        <div className="up-history-icon-wrapper">
                            <div className="up-history-icon">
                                {item.descripcion ? <MessageSquare size={14} /> : <Clock size={14} />}
                            </div>
                        </div>
                        <div className="up-history-content">
                            <p className="up-history-meta">
                                <span className="font-semibold">
                                    {(() => {
                                        // ✅ Lógica mejorada para mostrar el nombre
                                        // 1. Prioridad: El objeto completo `usuario_info`
                                        if (item.usuario_info) {
                                            const nombreCompleto = `${item.usuario_info.first_name || ''} ${item.usuario_info.last_name || ''}`.trim();
                                            return nombreCompleto || item.usuario_info.username; // Si no tiene nombre, muestra el username
                                        }
                                        // 2. Fallback: El campo `nombre_usuario` si existe
                                        if (item.nombre_usuario) {
                                            return item.nombre_usuario;
                                        }
                                        // 3. Último recurso: El ID del usuario
                                        return `Usuario #${item.usuario}`;
                                    })()}
                                </span>
                                <span className="text-muted"> - {new Date(item.fecha).toLocaleString()}</span>
                            </p>
                            <p className="up-history-text">{item.descripcion || formatHistoryChange(item.accion)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function UserTicketDetailPage() {
    const { id } = useParams();
    const { ticket, loading, error, setTicket } = useUserTicketDetail(id);
    const navigate = useNavigate();
    const [deleting, setDeleting] = useState(false);
    const [ratingLoading, setRatingLoading] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleDelete = async () => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esta acción.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, ¡eliminar!',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        setDeleting(true);
        try {
            await deleteUserTicket(id);
            toast.success("Ticket eliminado correctamente.");
            navigate("/usuario");
        } catch (err) {
            toast.error("No se pudo eliminar el ticket.");
            console.error(err);
        } finally {
            setDeleting(false);
        }
    };

    const handleRate = async (ratingNumber) => {
        setRatingLoading(true);
        try {
            await rateUserTicket(id, ratingNumber);
            setTicket({ ...ticket, rating: ratingNumber });
            toast.success("¡Gracias por tu calificación!");
        } catch (err) {
            toast.error(err.response?.data?.detail || "No se pudo enviar la calificación.");
            console.error(err);
        } finally {
            setRatingLoading(false);
        }
    };

    const handleUpdate = async (formValues) => {
        setSubmitting(true);
        try {
            const updatedTicket = await updateUserTicket(id, formValues);
            // Actualizamos el estado local con los datos del ticket actualizado
            setTicket(prev => ({ ...prev, ...updatedTicket }));
            toast.success("Ticket actualizado correctamente.");
            setIsEditModalOpen(false); // Cerramos el modal
        } catch (err) {
            console.error(err);
            const backendMessage =
                err.response?.data?.detail ||
                Object.values(err.response?.data || {}).flat().join(" ") ||
                "Error al actualizar el ticket.";
            toast.error(backendMessage);
        } finally {
            setSubmitting(false);
        }
    };


    if (loading) return <TicketDetailSkeleton />;
    if (error || !ticket) return <div className="up-error-box">{error || "No se pudo cargar el ticket."}</div>;

    return (
        <div className="up-panel-section">

            {/* HEADER */}
            <div className="flex justify-between items-center gap-4 mb-6 flex-wrap">
                <div className="flex items-center gap-3">
                    <button className="up-btn-icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="up-section-title">Ticket #{ticket.id}</h1>
                </div>
                <h2 className="up-detail-title text-right">{ticket.titulo}</h2>
            </div>

            {/* CARD PRINCIPAL */}
            <div className="up-ticket-detail-card">

                {/* TABLA DE DETALLES */}
                <div className="up-detail-table-container">
                    <table className="up-detail-table">
                        <tbody>
                            <tr>
                                <td>Estado</td>
                                <td>
                                    <span className={`up-ticket-status ${ticket.estado.toLowerCase().replace(' ', '-')}`}>
                                        {ticket.estado}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td>Prioridad</td>
                                <td>
                                    <span className={`up-ticket-priority ${ticket.prioridad.toLowerCase()}`}>
                                        {ticket.prioridad}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td>Categoría</td>
                                <td>{ticket.categoria_nombre}</td>
                            </tr>
                            <tr>
                                <td>Subcategoría</td>
                                <td>{ticket.subcategoria_nombre || "N/A"}</td>
                            </tr>
                            <tr>
                                <td><span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Creado</span></td>
                                <td>{new Date(ticket.fecha_creacion).toLocaleString()}</td>
                            </tr>
                            {ticket.fecha_actualizacion && (
                                <tr>
                                    <td><span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Actualizado</span></td>
                                    <td>{new Date(ticket.fecha_actualizacion).toLocaleString()}</td>
                                </tr>
                            )}
                            {ticket.agente_info && (
                                <tr>
                                    <td><span className="flex items-center gap-2"><User className="w-4 h-4" /> Agente</span></td>
                                    <td>{ticket.agente_info.username}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* DESCRIPCIÓN */}
                <div className="up-detail-description">
                    <strong>Descripción:</strong>
                    <p>{ticket.descripcion}</p>
                </div>

                {/* HISTORIAL */}
                <TicketHistory history={ticket.historial} />

                {/* ARCHIVO */}
                {ticket.archivo_adjunto && (
                    <a
                        href={ticket.archivo_adjunto}
                        target="_blank"
                        rel="noreferrer"
                        className="up-detail-file"
                    >
                        <FileDown className="w-5 h-5" />
                        Ver archivo adjunto
                    </a>
                )}

                {/* ACCIONES */}
                <div className="up-detail-actions">

                    {ticket.puede_editar && (
                        <button
                            className="up-btn-outline"
                            onClick={() => setIsEditModalOpen(true)}
                        >
                            <Pencil className="w-4 h-4" />
                            Editar
                        </button>
                    )}

                    {ticket.puede_eliminar && (
                        <button
                            className="up-btn-danger"
                            disabled={deleting}
                            onClick={handleDelete}
                        >
                            <Trash2 className="w-4 h-4" />
                            {deleting ? "Eliminando…" : "Eliminar"}
                        </button>
                    )}

                    {/* CALIFICACIÓN */}
                    {ticket.estado === "Resuelto" && !ticket.rating && (
                        <div className="flex flex-col items-center gap-2 p-4 border-t border-gray-200 mt-4">
                            <p className="font-semibold text-gray-700">¿Qué tal fue el servicio?</p>
                            <StarRating onRate={handleRate} loading={ratingLoading} />
                            {ratingLoading && <p className="text-sm text-muted">Enviando calificación...</p>}
                        </div>
                    )}

                    {ticket.rating && (
                        <div className="up-rating-display">
                            <Star className="w-5 h-5 text-yellow-400" fill="currentColor" />
                            <span>Tu calificación: <strong>{ticket.rating}/5</strong></span>
                        </div>
                    )}
                </div>

            </div>

            {/* ===== MODAL DE EDICIÓN ===== */}
            {isEditModalOpen && (
                <div className="up-modal">
                    <div className="up-modal-window flex flex-col max-h-[90vh]">
                        <div className="up-modal-header">
                            <h3>Editar Ticket #{ticket.id}</h3>
                            <button className="up-btn-close" onClick={() => setIsEditModalOpen(false)}>
                                <X />
                            </button>
                        </div>
                        <div className="up-modal-body overflow-y-auto">
                            <UserTicketForm
                                initialValues={{
                                    titulo: ticket.titulo,
                                    descripcion: ticket.descripcion,
                                    prioridad: ticket.prioridad,
                                    categoria_principal: ticket.categoria_principal,
                                    subcategoria: ticket.subcategoria,
                                }}
                                onSubmit={handleUpdate}
                                submitting={submitting}
                                mode="edit"
                            />
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

const TicketDetailSkeleton = () => (
    <div className="up-panel-section animate-pulse">
        {/* HEADER SKELETON */}
        <div className="flex justify-between items-center gap-4 mb-6 flex-wrap">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                <div className="h-8 bg-gray-300 rounded w-32"></div>
            </div>
            <div className="h-7 bg-gray-300 rounded w-1/2 md:w-1/3 ml-auto"></div>
        </div>

        {/* CARD SKELETON */}
        <div className="up-ticket-detail-card">
            {/* TABLE SKELETON */}
            <div className="up-detail-table-container mt-0">
                <div className="w-full">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex border-b border-gray-200">
                            <div className="w-[150px] bg-gray-100 p-4"><div className="h-5 bg-gray-300 rounded"></div></div>
                            <div className="flex-1 p-4"><div className="h-5 bg-gray-300 rounded w-3/4"></div></div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="up-detail-description">
                <div className="h-5 bg-gray-300 rounded w-32 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-4/5"></div>
            </div>

            <div className="up-detail-actions">
                <div className="h-10 bg-gray-300 rounded w-28"></div>
                <div className="h-10 bg-gray-300 rounded w-28"></div>
            </div>
        </div>
    </div>
);
