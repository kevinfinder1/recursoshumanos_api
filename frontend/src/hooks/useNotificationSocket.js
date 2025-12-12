// src/hooks/useNotificationSocket.js
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const useNotificationSocket = (onMessageCallback) => {
    const { token, isAuthenticated } = useAuth(); // 1. Obtener isAuthenticated
    useEffect(() => {
        // 2. Si no está autenticado o no hay token, no hacer nada.
        if (!isAuthenticated || !token) {
            return;
        }

        // 3. Determinar URL del WebSocket dinámicamente
        const API_URL = import.meta.env.VITE_API_URL || "http://192.168.50.68:8000";
        // Eliminar protocolo http/https para obtener solo host:port
        const host = API_URL.replace(/^https?:\/\//, "");
        // Determinar protocolo ws/wss
        const protocol = API_URL.startsWith("https") ? "wss" : "ws";

        const wsUrl = `${protocol}://${host}/ws/notificaciones/?token=${encodeURIComponent(
            token
        )}`;

        const socket = new WebSocket(wsUrl);

        socket.onopen = () => console.log('🔔 WS conectado');
        socket.onclose = () => console.log('🔕 WS cerrado');
        socket.onerror = (e) => console.error('Error WS:', e);

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // ⭐ Detectar mensajes del chat
                if (data.channel === "chat_message") {
                    onMessageCallback({
                        id: `chat-${data.message_id}`,
                        tipo: "chat_message",
                        mensaje: `${data.sender_name}: ${data.message}`,
                        fecha_creacion: new Date().toISOString(),
                        leida: false,
                        chat_room: data.room_id,
                    });
                    return;
                }

                // Notificación normal
                onMessageCallback(data);

            } catch (e) {
                console.error('Error JSON parse:', e);
            }
        };

        return () => socket.close();
    }, [isAuthenticated, token, onMessageCallback]); // 3. Añadir isAuthenticated a las dependencias
};
