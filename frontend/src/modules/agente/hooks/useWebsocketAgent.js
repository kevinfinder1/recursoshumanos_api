// useWebsocketAgent.js - Versión mejorada
import { useEffect, useRef, useCallback } from "react";

const useWebsocketAgent = (onRefresh) => {
    const wsRef = useRef(null);
    const reconnectTimeout = useRef(null);
    const lastRefresh = useRef(0);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    // 🎯 Función mejorada para obtener el token
    const getToken = useCallback(() => {
        // Probar diferentes formas de obtener el token
        const token =
            localStorage.getItem("access") ||
            localStorage.getItem("token") ||
            sessionStorage.getItem("access") ||
            sessionStorage.getItem("token");

        console.log("🔑 Token encontrado:", token ? "SÍ" : "NO");
        return token;
    }, []);

    // 🔄 Evita refrescos múltiples
    const safeRefresh = useCallback(() => {
        const now = Date.now();
        if (now - lastRefresh.current < 1000) {
            console.log("🔄 Refresh ignorado (demasiado rápido)");
            return;
        }
        lastRefresh.current = now;
        console.log("🔄 Ejecutando refresh desde WebSocket");
        onRefresh();
    }, [onRefresh]);

    // 🔌 Reconexión inteligente
    const reconnect = useCallback(() => {
        if (reconnectAttempts.current >= maxReconnectAttempts) {
            console.warn("❌ Máximo de reconexiones alcanzado");
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        console.log(`🔌 Reconectando en ${delay}ms (intento ${reconnectAttempts.current + 1})`);

        reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectWS();
        }, delay);
    }, []);

    const connectWS = useCallback(() => {
        const token = getToken();

        if (!token) {
            console.warn("❌ No hay token disponible, reintentando en 5 segundos...");
            reconnectTimeout.current = setTimeout(connectWS, 5000);
            return;
        }

        try {
            const socket = new WebSocket(
                `ws://192.168.50.68:8000/ws/notificaciones/?token=${token}`
            );
            wsRef.current = socket;

            socket.onopen = () => {
                console.log("✅ WebSocket conectado exitosamente");
                reconnectAttempts.current = 0;
            };

            socket.onclose = (event) => {
                console.log(`🔌 WebSocket desconectado: ${event.code} - ${event.reason}`);

                if (event.code === 1000) {
                    console.log("WebSocket cerrado intencionalmente");
                    return;
                }

                reconnect();
            };

            socket.onerror = (error) => {
                console.error("❌ Error en WebSocket:", error);
            };

            socket.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    const accion = data.tipo || data.action;

                    console.log("📨 Mensaje WebSocket recibido:", data);

                    const eventos = [
                        "ticket_creado",
                        "ticket_asignado",
                        "ticket_reasignado",
                        "ticket_aceptado",
                        "ticket_rechazado",
                        "ticket_expirado",
                        "ticket_actualizado",
                        "ticket_comentado",
                        "ticket_cerrado"
                    ];

                    if (eventos.includes(accion)) {
                        console.log(`🔄 Evento WebSocket: ${accion} - Refrescando datos...`);
                        safeRefresh();
                    }
                } catch (err) {
                    console.error("❌ Error parsing WebSocket message:", err);
                }
            };

        } catch (error) {
            console.error("❌ Error creando WebSocket:", error);
            reconnect();
        }
    }, [getToken, safeRefresh, reconnect]);

    useEffect(() => {
        console.log("🚀 Iniciando conexión WebSocket...");
        connectWS();

        return () => {
            console.log("🧹 Limpiando WebSocket...");
            if (wsRef.current) {
                wsRef.current.close(1000, "Component unmounting");
            }
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
            }
        };
    }, [connectWS]);

    return {
        wsRef,
        reconnect: connectWS,
        getStatus: () => {
            if (!wsRef.current) return 'NO_INITIALIZED';
            switch (wsRef.current.readyState) {
                case WebSocket.CONNECTING: return 'CONNECTING';
                case WebSocket.OPEN: return 'CONNECTED';
                case WebSocket.CLOSING: return 'CLOSING';
                case WebSocket.CLOSED: return 'DISCONNECTED';
                default: return 'UNKNOWN';
            }
        }
    };
};

export default useWebsocketAgent;