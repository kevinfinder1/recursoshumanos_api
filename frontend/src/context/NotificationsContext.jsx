// src/context/NotificationsContext.jsx
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback
} from "react";

import {
    fetchNotifications,
    markNotificationRead,
    deleteNotification,
    markAllRead,
    clearAllNotifications,
} from "../api/notifications";

import { useNotificationSocket } from "../hooks/useNotificationSocket";
import notificationSound from "../assets/sounds/notification-emsa.mp3";

import { useToast } from "./ToastContext";
import { useAuth } from "./AuthContext";
import { useSound } from "../hooks/useSound";

const NotificationsContext = createContext(null);
export const useNotificationsContext = () => useContext(NotificationsContext);

// 🔥 CLAVE DE PERSISTENCIA
const STORAGE_KEY = "cm_notifications";

export const NotificationsProvider = ({ children }) => {
    const [notifications, setNotifications] = useState(() => {
        // Recuperar notificaciones almacenadas
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [loading, setLoading] = useState(true);

    const { isAuthenticated, loading: authLoading } = useAuth();
    const { showToast } = useToast();

    const playSound = useSound(notificationSound, 0.6);

    // ----------------------------------------------------
    // 🟦 PERSISTENCIA AUTOMÁTICA
    // ----------------------------------------------------
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    }, [notifications]);

    // ----------------------------------------------------
    // 🟦 CARGA DESDE BACKEND (SOLO CUANDO AUTH YA ESTÉ LISTO)
    // ----------------------------------------------------
    const loadNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchNotifications();

            if (Array.isArray(data)) {
                // 🔥 fusionar: backend + lo que quedó en local
                setNotifications(prev => {
                    const idsPrev = new Set(prev.map(n => n.id));
                    const merged = [
                        ...data.filter(n => !idsPrev.has(n.id)),
                        ...prev
                    ].sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));

                    return merged;
                });
            }
        } catch (e) {
            console.error("Error cargando notificaciones:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            loadNotifications();
        }
    }, [authLoading, isAuthenticated, loadNotifications]);

    // ----------------------------------------------------
    // 🟦 MANEJO DE NUEVAS NOTIFICACIONES (WEBSOCKET)
    // ----------------------------------------------------
    const handleNewNotification = useCallback(
        (data) => {

            // ⭐ Detectar mensajes de chat
            if (data?.tipo === "chat_message") {

                playSound();

                const notifChat = {
                    id: data.id,
                    tipo: "chat_message",
                    mensaje: data.mensaje,
                    fecha_creacion: data.fecha_creacion,
                    leida: false,
                    chat_room: data.chat_room,
                };

                setNotifications(prev => {
                    const merged = [notifChat, ...prev];
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                    return merged;
                });

                showToast(`💬 ${data.mensaje}`, "info");
                return;
            }

            // 🔔 Notif normal
            playSound();

            setNotifications(prev => {
                const idsPrev = new Set(prev.map(n => n.id));
                if (idsPrev.has(data.id)) return prev;

                const merged = [data, ...prev];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                return merged;
            });

            const toastInfo = mapNotiToToast(data);
            if (toastInfo) showToast(toastInfo.message, toastInfo.type);
        },
        [playSound, showToast]
    );

    useNotificationSocket(handleNewNotification);

    const unreadCount = notifications.filter(n => !n.leida).length;

    // ----------------------------------------------------
    // 🟦 ACCIONES
    // ----------------------------------------------------
    const handleMarkRead = async (id) => {
        try {
            await markNotificationRead(id);
            setNotifications(prev =>
                prev.map(n => (n.id === id ? { ...n, leida: true } : n))
            );
        } catch (err) {
            console.error("Error marcando notificación:", err);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error("Error eliminando:", err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
        } catch (err) {
            console.error("Error markAllRead:", err);
        }
    };

    const handleClearAll = async () => {
        try {
            await clearAllNotifications();
            setNotifications([]);
        } catch (err) {
            console.error("Error clearAll:", err);
        }
    };

    return (
        <NotificationsContext.Provider
            value={{
                notifications,
                loading,
                unreadCount,
                handleMarkRead,
                handleDelete,
                handleMarkAllRead,
                handleClearAll,
                reload: loadNotifications,
            }}
        >
            {children}
        </NotificationsContext.Provider>
    );
};

/* ----------------------------------------------------
   MAPEAR TIPOS DE NOTIFICACIONES → TOASTS
---------------------------------------------------- */
const mapNotiToToast = (notif) => {
    const { tipo, mensaje, ticket } = notif;

    switch (tipo) {
        case "ticket_creado":
            return { message: `Nuevo ticket creado: #${ticket}`, type: "info" };

        case "ticket_asignado":
            return { message: `Ticket #${ticket} ha sido asignado a ti`, type: "success" };

        case "ticket_actualizado":
            return { message: `Actualización en el ticket #${ticket}`, type: "warning" };

        case "ticket_reasignado":
            return { message: `Ticket #${ticket} ha sido reasignado`, type: "info" };

        case "ticket_cerrado":
            return { message: `Ticket #${ticket} ha sido cerrado`, type: "error" };

        case "ticket_nuevo_admin":
            return { message: `Nuevo ticket ingresado (#${ticket})`, type: "info" };

        default:
            return { message: `🔔 Notificación: ${mensaje}`, type: "info" };
    }
};
