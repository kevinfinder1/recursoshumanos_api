// useChatSocket.js - CORREGIDO
import { useEffect, useRef } from 'react';

const useChatSocket = (roomId, onMessage) => {
    const wsRef = useRef(null);

    useEffect(() => {
        // Obtener el token del localStorage
        const token =
            sessionStorage.getItem("access") ||
            localStorage.getItem("secure_access");

        if (!token) {
            console.error('❌ No hay token disponible para WebSocket');
            return;
        }

        const wsUrl = `ws://192.168.50.68:8000/ws/chat/${roomId}/?token=${token}`;
        console.log(`🔌 Conectando WebSocket: ${wsUrl}`);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('✅ WebSocket conectado');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onMessage(data);
            } catch (error) {
                console.error('❌ Error parsing WebSocket message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('🔌 WebSocket desconectado');
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [roomId, onMessage]);

    return wsRef;
};

export default useChatSocket;
