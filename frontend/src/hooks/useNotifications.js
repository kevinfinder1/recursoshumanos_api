import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "react-toastify";

/**
 * Hook personalizado para manejar notificaciones en tiempo real vía WebSocket.
 * - Se conecta automáticamente al backend usando el token JWT del usuario autenticado.
 * - Reintenta la conexión si se cae el socket.
 * - Muestra toasts visuales al recibir nuevas notificaciones.
 * - Actualiza el estado global y las guarda en localStorage.
 */
export const useNotifications = () => {
    const [notifications, setNotifications] = useState(() => {
        try {
            const saved = localStorage.getItem("notifications");
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Error loading notifications from localStorage:", e);
            return [];
        }
    });

    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);
    const reconnectTimeout = useRef(null);

    const token = useRef(localStorage.getItem("access"));
    const user = useRef(JSON.parse(localStorage.getItem("user")));

    // 🧠 Mostrar toast visual según tipo de notificación
    const showToast = (data) => {
        const msg = data.mensaje || "Nueva notificación 📢";
        const tipo = data.tipo?.toLowerCase() || "info";

        const toastOptions = {
            position: "bottom-right",
            autoClose: 3500,
            theme: "colored",
        };

        switch (tipo) {
            case "ticket_creado":
                toast.info(`🎫 ${msg}`, toastOptions);
                break;
            case "ticket_asignado":
                toast.success(`🧑‍💼 ${msg}`, toastOptions);
                break;
            case "ticket_editado":
                toast.warning(`✏️ ${msg}`, toastOptions);
                break;
            case "ticket_eliminado":
                toast.error(`🗑️ ${msg}`, toastOptions);
                break;
            case "ticket_nuevo_admin":
                toast(`📢 ${msg}`, { ...toastOptions, icon: "📬" });
                break;
            default:
                toast(msg, toastOptions);
                break;
        }
    };

    // ⚙️ Conexión WebSocket
    const connectWebSocket = useCallback(() => {
        if (!token.current || !user.current) {
            console.warn("⚠️ No hay token o usuario, no se abrirá el socket.");
            return;
        }

        // Evitar múltiples conexiones abiertas
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            console.log("🔄 WebSocket ya está conectado, se omite reconexión.");
            return;
        }

        const wsUrl = `ws://localhost:8000/ws/notificaciones/?token=${token.current}`;
        console.log("🔌 Conectando WebSocket:", wsUrl);

        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log("✅ WebSocket conectado con éxito");
            setConnected(true);
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // ✅ Si no viene ID, generamos uno temporal
                const id = data.id || `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

                const nuevaNotificacion = {
                    id,
                    ...data,
                    fecha_creacion: data.fecha_creacion || new Date().toISOString(),
                    leido: data.leido ?? false,
                };

                setNotifications((prev) => {
                    const updated = [nuevaNotificacion, ...prev];
                    localStorage.setItem("notifications", JSON.stringify(updated));
                    return updated;
                });

                // 🔊 Sonido opcional
                const audio = new Audio("/sounds/notify.mp3");
                audio.play().catch(() => { });

                // 🎉 Toast bonito
                toast.info(nuevaNotificacion.mensaje, {
                    position: "bottom-right",
                    autoClose: 3000,
                    theme: "colored",
                });
            } catch (error) {
                console.error("❌ Error procesando mensaje:", error);
            }
        };

        socket.onerror = (error) => {
            console.error("💥 Error WebSocket:", error);
            setConnected(false);
        };

        socket.onclose = (event) => {
            console.warn("🔴 WebSocket cerrado:", event.reason || "sin razón");
            setConnected(false);

            // ♻️ Reintento controlado
            reconnectTimeout.current = setTimeout(() => {
                if (!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED) {
                    console.log("♻️ Reintentando conexión WebSocket...");
                    connectWebSocket();
                }
            }, 5000);
        };
    }, []); // deps vacías — solo se define una vez

    // 🔄 Conectar una sola vez al montar
    useEffect(() => {
        connectWebSocket();

        return () => {
            if (socketRef.current) socketRef.current.close();
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        };
    }, [connectWebSocket]);

    // ✉️ Enviar mensajes opcional
    const sendMessage = useCallback((message) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(message));
        } else {
            console.warn("⚠️ No se puede enviar, WebSocket no está conectado.");
        }
    }, []);

    return { notifications, connected, sendMessage };
};
