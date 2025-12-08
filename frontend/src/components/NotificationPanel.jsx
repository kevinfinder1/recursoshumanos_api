// src/components/NotificationPanel.jsx
import React, { useState } from "react";
import { X, Trash2, CheckCircle2 } from "lucide-react";
import { useNotificationsContext } from "../context/NotificationsContext";
import { useAuth } from "../context/AuthContext";
import "./NotificationPanel.css";

const NotificationPanel = ({ open, onClose }) => {
    const [tab, setTab] = useState("notifs"); // notifs | chats
    const {
        notifications,
        loading,
        handleMarkRead,
        handleDelete,
        handleMarkAllRead,
        handleClearAll,
    } = useNotificationsContext();
    const { user } = useAuth();

    if (!open) return null;

    // Evitar que los clicks en el contenido cierren el panel
    const handleContentClick = (e) => {
        e.stopPropagation();
    };

    return (
        <div
            className="notification-panel-overlay"
            onClick={onClose} // cerrar al hacer click fuera
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
                        onClick={handleMarkAllRead}
                        className="notification-panel__action-btn"
                    >
                        <CheckCircle2 className="w-3 h-3" />
                        Marcar todo como leído
                    </button>
                    <button
                        onClick={handleClearAll}
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
                                .map(n => (
                                    <div
                                        key={n.id}
                                        className={`notification-item ${!n.leida ? "notification-item--unread" : ""}`}
                                    >
                                        <div className="notification-item__header">
                                            <div>
                                                <p className="notification-item__title">
                                                    {mapTipoToLabel(n.tipo)}
                                                </p>
                                                <p className="notification-item__message">
                                                    {n.mensaje}
                                                </p>
                                                {n.ticket && (
                                                    <p className="notification-item__meta">
                                                        Ticket #{n.ticket}
                                                    </p>
                                                )}
                                                <p className="notification-item__meta">
                                                    {formatFecha(n.fecha_creacion)}
                                                </p>
                                            </div>
                                            <div className="notification-item__actions">
                                                {!n.leida && (
                                                    <button
                                                        onClick={() => handleMarkRead(n.id)}
                                                        className="notification-item__action-btn"
                                                    >
                                                        Marcar leído
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(n.id)}
                                                    className="notification-item__delete-btn"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}

                    {/* ⭐ TAB CHATS (Messenger preview) */}
                    {tab === "chats" && (
                        <div>
                            {notifications
                                .filter(n => n.tipo === "chat_message")
                                .map(n => (
                                    <div
                                        key={n.id}
                                        className="chat-notification-item"
                                        onClick={() => {
                                            const base = user.role === "solicitante" ? "/usuario" : "/agente";
                                            const url = `${base}/chat?ticket=${n.chat_room}`;
                                            window.location.href = url;
                                            onClose();
                                        }}
                                    >
                                        <div className="notification-item__title">
                                            {n.mensaje}
                                        </div>

                                        <div className="notification-item__meta">
                                            {new Date(n.fecha_creacion).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
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
    return d.toLocaleString();
};

const mapTipoToLabel = (tipo) => {
    switch (tipo) {
        case "ticket_creado":
            return "Nuevo ticket creado";
        case "ticket_asignado":
            return "Ticket asignado";
        case "ticket_nuevo_admin":
            return "Nuevo ticket (admin)";
        case "ticket_actualizado":
            return "Ticket actualizado";
        case "ticket_cerrado":
            return "Ticket cerrado";
        case "ticket_eliminado":
            return "Ticket eliminado";
        case "ticket_reasignado":
            return "Ticket reasignado";
        case "chat_message":
            return "Nuevo mensaje de chat";
        default:
            return "Notificación";
    }
};

export default NotificationPanel;
