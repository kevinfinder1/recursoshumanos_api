// ChatWindow.jsx - CORREGIDO
import React, { useState, useEffect } from 'react';
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import ImageViewer from "./ImageViewer";
import API from "../api/axiosInstance";
import useChatSocket from "../hooks/useChatSocket";

const ChatWindow = ({ chat }) => {
    const [messages, setMessages] = useState([]);
    const [imagePreview, setImagePreview] = useState(null);

    // 🚀 CONECTAR USANDO EL ID DE LA SALA DE CHAT
    const wsRef = useChatSocket(chat.id, (msg) => {
        setMessages((prev) => {
            // ✅ Ignorar eventos que no son mensajes de chat (como 'typing')
            if (!msg.id || !msg.timestamp) {
                return prev;
            }
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
        });
    });

    useEffect(() => {
        loadMessages();
    }, [chat.id]);

    const loadMessages = async () => {
        try {
            // 🚀 OBTENER MENSAJES USANDO EL ID DE LA SALA DE CHAT
            const res = await API.get(`/chat/rooms/${chat.id}/messages/`);

            // Asegurarse de que siempre se establece un array,
            // manejando respuestas paginadas (res.data.results) o directas.
            setMessages(res.data.results || res.data || []);
        } catch (error) {
            console.error("❌ Error cargando mensajes:", error);
            setMessages([]); // Mensajes vacíos como fallback
        }
    };

    // Determinar si el chat debe estar activo basado en el estado del ticket
    const isChatActive = chat.type === 'DIRECTO' || (chat.type === 'TICKET' && chat.ticket_estado === 'En Proceso');
    const ticketStatus = chat.type === 'TICKET' ? chat.ticket_estado : null;

    return (
        <div className="chat-window">
            <ChatHeader chat={chat} />
            <ChatMessages
                messages={messages}
                onImageClick={(src) => setImagePreview(src)}
            />

            {/* Renderizar el input o un mensaje de estado */}
            {isChatActive ? (
                <ChatInput
                    roomId={chat.id} // ✅ Usar el ID de la sala de chat
                    wsRef={wsRef}
                    onSend={(msg) => setMessages((prev) => {
                        // ✅ Prevenir duplicados al recibir la confirmación del API
                        if (prev.find(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    })}
                />
            ) : (
                <div className="p-4 border-t bg-gray-100 text-center">
                    <p className="text-sm text-gray-600 font-semibold">
                        El chat no está activo.
                    </p>
                    {ticketStatus && (
                        <p className="text-xs text-gray-500 mt-1">
                            El ticket se encuentra en estado "<strong>{ticketStatus}</strong>".
                            El chat se activará cuando el estado cambie a "En Proceso".
                        </p>
                    )}
                </div>
            )}

            <ImageViewer
                src={imagePreview}
                onClose={() => setImagePreview(null)}
            />
        </div>
    );
};

export default ChatWindow;
