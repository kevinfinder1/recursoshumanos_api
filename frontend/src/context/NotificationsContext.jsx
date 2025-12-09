// src/context/NotificationsContext.jsx
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useRef
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

    const toastShownRef = useRef(new Set());

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
            console.log("🔄 loadNotifications: iniciando...");
            const data = await fetchNotifications();

            console.log("📦 loadNotifications: data recibida =", data);
            console.log("📦 ¿Es array?", Array.isArray(data));
            console.log("📦 ¿Es objeto con results?", data?.results);

            // El backend devuelve un objeto paginado {count, next, previous, results}
            // Extraer el array de resultados
            const notificationsArray = Array.isArray(data) ? data : (data?.results || []);

            console.log("📦 Array extraído:", notificationsArray);
            console.log("📦 Longitud:", notificationsArray.length);

            if (Array.isArray(notificationsArray)) {
                const sorted = notificationsArray.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
                console.log("✅ Notificaciones ordenadas y actualizando estado:", sorted);
                setNotifications(sorted);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
            } else {
                console.error("❌ loadNotifications: no es array después de extraer", typeof notificationsArray);
            }
        } catch (e) {
            console.error("❌ loadNotifications error:", e);
            showToast("Error cargando notificaciones", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

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

            const notiId = data?.id ?? data?.notification_id ?? data?.notificationId ?? null;
            const toastInfo = mapNotiToToast(data);

            if (toastInfo) {
                // Evitar mostrar el mismo toast varias veces basándonos en el id de notificación
                if (notiId) {
                    if (!toastShownRef.current.has(notiId)) {
                        toastShownRef.current.add(notiId);
                        showToast(toastInfo.message, toastInfo.type);
                    } else {
                        // ya mostrado: no hacer nada
                    }
                } else {
                    // si no hay id en el payload, mostrar solo si no hay duplicates recientes:
                    // podrías decidir guardarlo por texto, o simplemente mostrarlo (menos ideal)
                    showToast(toastInfo.message, toastInfo.type);
                }
            }
        },
        [playSound, showToast]
    );

    useNotificationSocket(handleNewNotification);

    const unreadCount = notifications.filter(n => !n.leida).length;

    // ----------------------------------------------------
    // 🟦 ACCIONES
    // ----------------------------------------------------
    const handleMarkRead = async (id) => {
        if (!id) {
            showToast("Notificación inválida (sin id)", "error");
            return;
        }

        try {
            await markNotificationRead(id);
            setNotifications(prev =>
                prev.map(n => (n.id === id ? { ...n, leida: true } : n))
            );
        } catch (err) {
            console.error("Error marcando notificación:", err);
            console.error("Axios response:", err?.response);

            const status = err?.response?.status;
            const serverData = err?.response?.data;
            const serverMsg =
                serverData?.error ||
                serverData?.detail ||
                (typeof serverData === "string" ? serverData : null);

            if (status === 404 || (serverMsg && /no notification/i.test(String(serverMsg).toLowerCase()))) {
                // Notificación no existe para este usuario -> eliminar localmente
                setNotifications(prev => prev.filter(n => n.id !== id));
                showToast("La notificación ya no existe (se eliminó localmente).", "warning");
                // opcional: recargar desde backend para sincronizar
                loadNotifications().catch(() => { });
                return;
            }

            // Otros errores: mostrar mensaje del servidor o genérico
            if (serverMsg) {
                showToast(String(serverMsg), "error");
            } else {
                showToast("Error marcando notificación", "error");
            }
        }
    };

    const handleDelete = async (id) => {
        if (!id) {
            showToast("Notificación inválida (sin id)", "error");
            return;
        }

        try {
            await deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error("Error eliminando:", err);
            console.error("Axios response:", err?.response);

            const status = err?.response?.status;
            const serverData = err?.response?.data;
            const serverMsg =
                serverData?.error ||
                serverData?.detail ||
                (typeof serverData === "string" ? serverData : null);

            if (status === 404 || (serverMsg && /no notification/i.test(String(serverMsg).toLowerCase()))) {
                // Ya no existe: quitar del estado local
                setNotifications(prev => prev.filter(n => n.id !== id));
                showToast("La notificación ya no existe (eliminada localmente).", "warning");
                // opcional: recargar desde backend para sincronizar
                loadNotifications().catch(() => { });
                return;
            }

            if (serverMsg) {
                showToast(String(serverMsg), "error");
            } else {
                showToast("Error eliminando notificación", "error");
            }
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
    const { tipo, mensaje } = notif || {};

    // Obtener un identificador legible del ticket si existe.
    // Algunos payloads pueden usar `ticket` (id), `ticket_titulo` (string) o `ticket_id`.
    const ticketId = notif?.ticket ?? notif?.ticket_id ?? null;
    const ticketTitulo = notif?.ticket_titulo ?? null;
    const ticketLabel = ticketId ? `#${ticketId}` : (ticketTitulo ? `${ticketTitulo}` : "");

    // Helper para retornar mensaje preferido: usar `mensaje` si viene,
    // sino construir uno basado en tipo + ticketLabel.
    const preferMensaje = (defaultText) => {
        if (mensaje && String(mensaje).trim().length > 0) return String(mensaje);
        return defaultText;
    };

    switch (tipo) {
        case "ticket_creado":
            return { message: preferMensaje(`Nuevo ticket creado ${ticketLabel}`), type: "info" };

        case "ticket_asignado":
            return { message: preferMensaje(`Ticket ${ticketLabel} ha sido asignado a ti`), type: "success" };

        case "ticket_actualizado":
            return { message: preferMensaje(`Actualización en el ticket ${ticketLabel}`), type: "warning" };

        case "ticket_reasignado":
            return { message: preferMensaje(`Ticket ${ticketLabel} ha sido reasignado`), type: "info" };

        case "ticket_cerrado":
            return { message: preferMensaje(`Ticket ${ticketLabel} ha sido cerrado`), type: "error" };

        case "ticket_nuevo_admin":
            return { message: preferMensaje(`Nuevo ticket ingresado (${ticketLabel || ""})`), type: "info" };

        default:
            // Para notificaciones genéricas usar `mensaje` o un mensaje por defecto
            return { message: preferMensaje(mensaje || "🔔 Tienes una nueva notificación"), type: "info" };
    }
};
