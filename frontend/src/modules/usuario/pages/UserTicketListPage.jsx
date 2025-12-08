// src/pages/solicitante/UserTicketListPage.jsx
import React from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
    Calendar,
    AlertCircle,
    Clock,
    CheckCircle2,
    Ticket,
    User,
} from "lucide-react";
import "../styles/userPanel.css";

const estadoClases = { // Mapeo a las clases CSS existentes en userPanel.css
    "Pendiente": "pendiente",
    "En Proceso": "en-proceso",
    "Resuelto": "resuelto",
    // "Abierto" y otros usarán el estilo por defecto de .ticket-status si no están aquí
};

const estadoIcono = {
    "Abierto": <AlertCircle className="w-4 h-4" />,
    "Pendiente": <AlertCircle className="w-4 h-4" />,
    "En Proceso": <Clock className="w-4 h-4" />, // Corregido para usar el ícono correcto
    "Resuelto": <CheckCircle2 className="w-4 h-4" />,
};

export default function UserTicketListPage() {
    const { tickets, loading, error, reload } = useOutletContext();
    const navigate = useNavigate();

    return (
        <div className="up-panel-section">

            <h1 className="up-section-title">Mis Tickets</h1>

            {/* Mensajes */}
            {loading && <p className="text-muted">Cargando tickets…</p>}
            {error && (
                <div className="up-error-box">
                    {error}
                    <button className="up-btn-red mt-3" onClick={reload}>
                        Reintentar
                    </button>
                </div>
            )}
            {!loading && (!tickets || tickets.length === 0) && (
                <p className="text-muted">No tienes tickets creados aún.</p>
            )}

            {/* LISTA */}
            <div className="up-tickets-list">
                {tickets?.map((t) => (
                    <div
                        key={t.id}
                        className="up-ticket-card"
                        onClick={() => navigate(`/usuario/tickets/${t.id}`)}
                    >
                        {/* Primera fila */}
                        <div className="flex items-center gap-3 mb-3">
                            <span className="up-ticket-id">#{t.id}</span>

                            <span className={`up-ticket-status ${estadoClases[t.estado] || 'pendiente'}`}>
                                {estadoIcono[t.estado]}
                                {t.estado}
                            </span>

                            <span className={`up-ticket-priority ${t.prioridad.toLowerCase()}`}>
                                • {t.prioridad}
                            </span>
                        </div>

                        {/* TÍTULO */}
                        <h3 className="up-ticket-title">{t.titulo}</h3>

                        {/* METADATOS */}
                        <div className="up-ticket-meta mt-4">
                            <span className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted" />
                                {new Date(t.fecha_creacion).toLocaleString()}
                            </span>

                            {t.categoria_nombre && (
                                <span className="up-ticket-category">
                                    {t.categoria_nombre}
                                </span>
                            )}
                        </div>

                        {/* AGENTE */}
                        {t.agente_info && (
                            <div className="flex items-center gap-2 mt-4 text-muted">
                                <User className="w-4 h-4" />
                                {t.agente_info.username} ({t.agente_info.email})
                            </div>
                        )}

                        {/* BOTÓN */}
                        <button className="up-btn-details mt-5">
                            Ver Detalles
                        </button>
                    </div>
                ))}
            </div>

        </div>
    );
}
