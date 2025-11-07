import React, { useEffect, useRef, useMemo, useState, useCallback } from "react";
import axios from "axios";
import {
    Bell,
    CheckCircle2,
    AlertTriangle,
    UserCircle,
    X,
    Trash2,
    RefreshCw,
} from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import { useAuth } from "../context/AuthContext";
import NotificationToast from "./NotificationToast";
import { motion, AnimatePresence } from "framer-motion";

const tipoEstilos = {
    ticket_creado: {
        color: "bg-blue-50 border-blue-500 text-blue-800",
        icon: <CheckCircle2 className="text-blue-500 w-5 h-5" />,
        label: "Ticket Creado",
    },
    ticket_asignado: {
        color: "bg-green-50 border-green-500 text-green-800",
        icon: <UserCircle className="text-green-500 w-5 h-5" />,
        label: "Ticket Asignado",
    },
    ticket_nuevo_admin: {
        color: "bg-yellow-50 border-yellow-500 text-yellow-800",
        icon: <AlertTriangle className="text-yellow-500 w-5 h-5" />,
        label: "Nuevo Ticket (Admin)",
    },
    default: {
        color: "bg-gray-50 border-gray-300 text-gray-700",
        icon: <Bell className="text-gray-600 w-5 h-5" />,
        label: "Notificación",
    },
};

const NotificacionesPanel = ({ visible = true, onClose }) => {
    const { notifications, connected } = useNotifications();
    const { user } = useAuth();
    const token = localStorage.getItem("access");
    const panelRef = useRef(null);

    const [state, setState] = useState({
        loading: false,
        localList: [],
        error: null,
        toast: null,
        animClass: "translate-x-full opacity-0",
    });

    // --- 🔹 Función general de llamada API
    const apiCall = useCallback(
        async (endpoint, method = "GET", body = null) => {
            try {
                const response = await fetch(
                    `http://localhost:8000/api/notifications${endpoint}`,
                    {
                        method,
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                        ...(body && { body: JSON.stringify(body) }),
                    }
                );
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error(`API Error (${endpoint}):`, error);
                throw error;
            }
        },
        [token]
    );

    // --- 🔹 Obtener notificaciones
    const fetchNotifications = useCallback(async () => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const data = await apiCall("/");
            setState((prev) => ({
                ...prev,
                localList: Array.isArray(data) ? data : data.results || [],
                loading: false,
            }));
        } catch (err) {
            setState((prev) => ({
                ...prev,
                error: "No se pudieron cargar las notificaciones",
                loading: false,
            }));
        }
    }, [apiCall]);

    // --- 🔹 Marcar todas como leídas
    const markAllRead = useCallback(async () => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
            await apiCall("/mark_all_read/", "POST");
            setState((prev) => ({
                ...prev,
                localList: prev.localList.map((n) => ({ ...n, leida: true })),
                toast: "Todas las notificaciones marcadas como leídas",
                loading: false,
            }));
        } catch (err) {
            setState((prev) => ({
                ...prev,
                error: "No se pudieron marcar como leídas",
                loading: false,
            }));
        }
    }, [apiCall]);

    // --- 🔹 Limpiar todas las notificaciones
    const clearAll = useCallback(async () => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
            await apiCall("/clear_all/", "POST");
            setState((prev) => ({
                ...prev,
                localList: [],
                toast: "Todas las notificaciones eliminadas",
                loading: false,
            }));
        } catch (err) {
            setState((prev) => ({
                ...prev,
                error: "No se pudieron eliminar las notificaciones",
                loading: false,
            }));
        }
    }, [apiCall]);

    // --- 🔹 Marcar una como leída
    const markAsRead = useCallback(
        async (id) => {
            if (!id) return;
            try {
                await axios.post(
                    `http://localhost:8000/api/notifications/${id}/mark_read/`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setState((prev) => {
                    const updated = prev.localList.map((n) =>
                        n.id === id ? { ...n, leida: true } : n
                    );
                    localStorage.setItem("notifications", JSON.stringify(updated));
                    return { ...prev, localList: updated };
                });
            } catch (err) {
                console.error("Error marcando notificación como leída:", err);
                setState((prev) => ({ ...prev, error: "No se pudo marcar como leída" }));
            }
        },
        [token]
    );

    // --- 🔹 Eliminar una notificación
    const deleteNotification = useCallback(
        async (id) => {
            if (!id) return;
            try {
                await axios.delete(
                    `http://localhost:8000/api/notifications/${id}/`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setState((prev) => {
                    const updated = prev.localList.filter((n) => n.id !== id);
                    localStorage.setItem("notifications", JSON.stringify(updated));
                    return { ...prev, localList: updated, toast: "Notificación eliminada" };
                });
            } catch (err) {
                console.error("Error eliminando notificación:", err);
                setState((prev) => ({ ...prev, error: "No se pudo eliminar la notificación" }));
            }
        },
        [token]
    );

    // --- 🔹 Abrir ticket relacionado
    const openTicket = useCallback((ticketId) => {
        if (!ticketId) return;
        window.location.href = `/tickets/${ticketId}`;
    }, []);

    // --- 🔹 Efecto: visibilidad del panel
    useEffect(() => {
        setState((prev) => ({
            ...prev,
            animClass: visible
                ? "translate-x-0 opacity-100"
                : "translate-x-full opacity-0",
        }));

        if (visible) fetchNotifications();
    }, [visible, fetchNotifications]);

    // --- 🔹 Sincronización con WebSocket o Hook
    useEffect(() => {
        if (!Array.isArray(notifications) || notifications.length === 0) return;

        setState((prev) => {
            const prevIds = new Set(prev.localList.map((n) => n.id));
            const newOnes = notifications.filter((n) => !prevIds.has(n.id));
            if (newOnes.length === 0) return prev;

            const updated = [...newOnes, ...prev.localList];
            localStorage.setItem("notifications", JSON.stringify(updated));

            return { ...prev, localList: updated };
        });
    }, [JSON.stringify(notifications)]);

    const unreadCount = useMemo(
        () => state.localList.filter((n) => !n.leida).length,
        [state.localList]
    );

    const formatDate = (iso) => {
        try {
            const d = new Date(iso);
            return d.toLocaleString();
        } catch {
            return iso;
        }
    };

    // --- 🔹 Renderizado principal
    if (!visible) return null;

    return (
        <>
            {state.toast && (
                <NotificationToast
                    message={state.toast}
                    type="info"
                    onClose={() => setState((prev) => ({ ...prev, toast: null }))}
                />
            )}
            <div
                ref={panelRef}
                className={`fixed top-20 right-6 w-80 bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 z-50 transform transition-all duration-300 ease-in-out ${state.animClass}`}
            >
                {/* 🔹 Encabezado */}
                <div className="flex items-center justify-between p-3 bg-indigo-600 text-white rounded-t-xl">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Notificaciones
                        <span className="ml-2 text-sm bg-indigo-800 px-2 py-0.5 rounded-full">
                            {unreadCount}
                        </span>
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            title="Refrescar"
                            onClick={fetchNotifications}
                            className="text-xs bg-indigo-500 hover:bg-indigo-700 px-2 py-1 rounded flex items-center gap-1"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                            className="text-xs bg-indigo-500 hover:bg-indigo-700 px-2 py-1 rounded"
                            onClick={markAllRead}
                        >
                            Marcar leído
                        </button>
                        <button
                            className="text-xs bg-red-500 hover:bg-red-700 px-2 py-1 rounded"
                            onClick={clearAll}
                        >
                            Limpiar
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1 rounded hover:bg-indigo-500/20"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* 🔹 Lista */}
                <div className="max-h-96 overflow-y-auto p-3 space-y-3 transition-opacity duration-300">
                    {state.loading && (
                        <p className="text-sm text-gray-500 text-center">Cargando...</p>
                    )}
                    {state.error && (
                        <p className="text-sm text-red-600 text-center">{state.error}</p>
                    )}
                    {state.localList.length === 0 && !state.loading ? (
                        <p className="text-gray-500 text-center py-6 text-sm">
                            No hay notificaciones aún.
                        </p>
                    ) : (
                        state.localList.map((n, i) => {
                            const estilo = tipoEstilos[n.tipo] || tipoEstilos.default;
                            return (
                                <div
                                    key={n.id ?? i}
                                    className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${estilo.color} ${n.leida
                                        ? "opacity-70"
                                        : "shadow-md hover:shadow-lg"
                                        } cursor-pointer transition-all duration-300 hover:translate-x-1`}
                                    onClick={() => openTicket(n.ticket_id)}
                                >
                                    {estilo.icon}
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold">{estilo.label}</p>
                                        <p className="text-xs opacity-90 leading-snug">{n.mensaje}</p>
                                        {n.fecha_creacion && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {formatDate(n.fecha_creacion)}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2 items-center ml-2">
                                        <button
                                            className="text-xs px-2 py-1 rounded bg-white/60 hover:bg-white transition"
                                            onClick={(ev) => {
                                                ev.stopPropagation();
                                                markAsRead(n.id);
                                            }}
                                        >
                                            ✓
                                        </button>
                                        <button
                                            className="text-xs px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 transition"
                                            onClick={(ev) => {
                                                ev.stopPropagation();
                                                deleteNotification(n.id);
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* 🔴 Badge animado */}
            {unreadCount > 0 && (
                <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse"
                >
                    {unreadCount}
                </motion.span>
            )}
        </>
    );
};

export default React.memo(NotificacionesPanel);
