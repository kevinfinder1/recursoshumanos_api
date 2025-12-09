// src/components/NotificationPanel.jsx
// CAMBIOS CLAVE:
// 1. Cambiar ruta de `/usuario/ticket/` a `/usuario/tickets/` (añadir "s")
// 2. Cambiar ruta de `/agente/ticket/` a `/agente/tickets/` (añadir "s")
// 3. Agregar console.log para debuggear el ticketId
// 4. Validación mejorada

import React, { useState } from "react";
import { X, Trash2, CheckCircle2, ArrowRight } from "lucide-react";
import { useNotificationsContext } from "../context/NotificationsContext";
import { useAuth } from "../context/AuthContext";
import "./NotificationPanel.css";
import { useNavigate } from "react-router-dom";

const NotificationPanel = ({ open, onClose }) => {
    const [tab, setTab] = useState("notifs");
    const {
        notifications,
        loading,
        handleMarkRead,
        handleDelete,
        handleMarkAllRead,
        handleClearAll,
    } = useNotificationsContext();
    const { user } = useAuth();
    const navigate = useNavigate();

    if (!open) return null;

    const handleContentClick = (e) => {
        e.stopPropagation();
    };

    // ✅ CORRECCIÓN: Cambiar /ticket/ por /tickets/
    const goToTicket = (ticketId, e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        console.log("🎫 goToTicket llamado con ticketId:", ticketId);
        console.log("👤 user.role:", user?.role);

        if (!ticketId) {
            console.warn("❌ No hay ticketId válido");
            return;
        }

        const base = user?.role === "solicitante" ? "/usuario" : "/agente";
        const ruta = `${base}/tickets/${ticketId}`; // ✅ CORREGIDO: /tickets/ (con "s")
        console.log("🔀 Navegando a:", ruta);
        navigate(ruta);
        onClose();
    };

    const handleNotificationClick = (notification) => {
        console.log("📬 Notificación clickeada:", notification);

        if (notification.ticket) {
            goToTicket(notification.ticket);
        }
        if (!notification.leida) {
            handleMarkRead(notification.id);
        }
    };

    return (
        <div
            className="notification-panel-overlay"
            onClick={onClose}
        >
            <div
                className="notification-panel"
                onClick={handleContentClick}
            >
                {/* Header */}
                <div className="notification-panel__header">
                    <h2 className="notification-panel__title">Notificaciones</h2>
                    <button onClick={onClose} className="notification-panel__close-btn">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Acciones */}
                <div className="notification-panel__actions">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAllRead();
                        }}
                        className="notification-panel__action-btn"
                    >
                        <CheckCircle2 className="w-3 h-3" />
                        Marcar todo como leído
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClearAll();
                        }}
                        className="notification-panel__action-btn notification-panel__action-btn--clear"
                    >
                        <Trash2 className="w-3 h-3" />
                        Limpiar todo
                    </button>
                </div>

                {/* Lista */}
                <div className="notification-panel__body">
                    <div className="notification-panel__tabs">
                        <button
                            onClick={() => setTab("notifs")}
                            className={`notification-panel__tab-btn ${tab === "notifs" ? "notification-panel__tab-btn--active" : ""}`}
                        >
                            🔔 Notificaciones
                        </button>

                        <button
                            onClick={() => setTab("chats")}
                            className={`notification-panel__tab-btn ${tab === "chats" ? "notification-panel__tab-btn--active" : ""}`}
                        >
                            💬 Chats
                        </button>
                    </div>

                    {loading ? (
                        <div className="notification-panel__message">Cargando...</div>
                    ) : notifications.length === 0 ? (
                        <div className="notification-panel__message">
                            No tienes notificaciones.
                        </div>
                    ) : null}

                    {/* ⭐ TAB NOTIFICACIONES */}
                    {tab === "notifs" && (
                        <div>
                            {notifications
                                .filter(n => n.tipo !== "chat_message")
                                .map((n, idx) => {
                                    const key = n.id ?? `notif-${idx}`;
                                    const clickable = !!n.ticket && !!n.id;

                                    return (
                                        <div
                                            key={key}
                                            className={`notification-item ${!n.leida ? "notification-item--unread" : ""}`}
                                            onClick={() => clickable && handleNotificationClick(n)}
                                            style={{ cursor: clickable ? "pointer" : "default" }}
                                        >
                                            <div className="notification-item__header">
                                                <div className="notification-item__content">
                                                    <p className="notification-item__title">
                                                        {mapTipoToLabel(n.tipo)}
                                                    </p>
                                                    <p className="notification-item__message">
                                                        {n.mensaje}
                                                    </p>
                                                    {n.ticket && (
                                                        <p className="notification-item__meta notification-item__meta--ticket">
                                                            🎫 Ticket #{n.ticket}
                                                        </p>
                                                    )}
                                                    <p className="notification-item__meta">
                                                        {formatFecha(n.fecha_creacion)}
                                                    </p>
                                                </div>
                                                <div className="notification-item__actions">
                                                    {n.ticket && n.id && (
                                                        <button
                                                            onClick={(e) => goToTicket(n.ticket, e)}
                                                            className="notification-item__action-btn notification-item__action-btn--primary"
                                                            title="Ir al ticket"
                                                        >
                                                            <ArrowRight className="w-3 h-3" />
                                                            Ver
                                                        </button>
                                                    )}
                                                    {!n.leida && n.id && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMarkRead(n.id);
                                                            }}
                                                            className="notification-item__action-btn"
                                                        >
                                                            Marcar leído
                                                        </button>
                                                    )}
                                                    {n.id && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(n.id);
                                                            }}
                                                            className="notification-item__delete-btn"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}

                    {/* ⭐ TAB CHATS (Messenger preview) */}
                    {tab === "chats" && (
                        <div>
                            {notifications
                                .filter(n => n.tipo === "chat_message")
                                .map((n, idx) => {
                                    const key = n.id ?? `chat-${idx}`;
                                    return (
                                        <div
                                            key={key}
                                            className="chat-notification-item"
                                            onClick={() => {
                                                const base = user?.role === "solicitante" ? "/usuario" : "/agente";
                                                navigate(`${base}/chat?ticket=${n.chat_room}`);
                                                onClose();
                                            }}
                                        >
                                            <div className="notification-item__title">
                                                💬 {n.mensaje}
                                            </div>

                                            <div className="notification-item__meta">
                                                {formatFecha(n.fecha_creacion)}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helpers para fecha/tipo
const formatFecha = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const ahora = new Date();
    const diff = ahora - d;

    // Si es menos de 1 minuto
    if (diff < 60000) return "Hace unos segundos";
    // Si es menos de 1 hora
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    // Si es menos de 1 día
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;

    return d.toLocaleString();
};

const mapTipoToLabel = (tipo) => {
    switch (tipo) {
        case "ticket_creado":
            return "✨ Nuevo ticket creado";
        case "ticket_asignado":
            return "👤 Ticket asignado";
        case "ticket_nuevo_admin":
            return "📌 Nuevo ticket (admin)";
        case "ticket_actualizado":
            return "🔄 Ticket actualizado";
        case "ticket_cerrado":
            return "✅ Ticket cerrado";
        case "ticket_eliminado":
            return "🗑️ Ticket eliminado";
        case "ticket_reasignado":
            return "↔️ Ticket reasignado";
        case "chat_message":
            return "💬 Nuevo mensaje de chat";
        default:
            return "🔔 Notificación";
    }
};

export default NotificationPanel;
