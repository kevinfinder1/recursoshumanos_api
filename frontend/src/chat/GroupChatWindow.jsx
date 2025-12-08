import React, { useState, useEffect, useCallback } from "react";
import API from "../api/axiosInstance"; // Asegúrate que la ruta es correcta
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import ImageViewer from "./ImageViewer";
import useGroupSocket from "../hooks/useGroupSocket";

const GroupChatWindow = ({ group }) => {
    const [messages, setMessages] = useState([]);
    const [imagePreview, setImagePreview] = useState(null);

    const onSocketMessage = useCallback((msg) => {
        // Evitar duplicados: añadir solo si el mensaje no existe ya
        setMessages((prev) => {
            // ✅ Ignorar eventos que no son mensajes de chat (como 'typing')
            if (!msg.id || !msg.timestamp) {
                return prev;
            }
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
        });
    }, []);

    // WebSocket grupal
    const wsRef = useGroupSocket(group, onSocketMessage);

    // Cargar mensajes iniciales
    useEffect(() => {
        loadMessages();
    }, [group]);

    const loadMessages = async () => {
        const res = await API.get(`/chat/group/${group}/messages/`);
        setMessages(res.data.messages);
    };

    return (
        <div className="chat-window">
            {/* Header */}
            <div className="group-header">
                <h2 className="group-header__title">Chat Grupal – {group}</h2>
                <p className="group-header__subtitle">
                    Conversación entre agentes y administradores.
                </p>
            </div>

            {/* Mensajes */}
            <ChatMessages
                messages={messages}
                onImageClick={(src) => setImagePreview(src)}
            />

            {/* Input */}
            <ChatInput
                isGroup
                groupName={group}
                onSend={(msg) => setMessages((prev) => {
                    // Prevenir duplicados al recibir la confirmación del API
                    if (prev.find(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                })}
                wsRef={wsRef}
            />

            <ImageViewer
                src={imagePreview}
                onClose={() => setImagePreview(null)}
            />
        </div>
    );
};

export default GroupChatWindow;
