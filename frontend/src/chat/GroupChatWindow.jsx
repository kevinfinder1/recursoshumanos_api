import React, { useState, useEffect, useCallback } from "react";
import API from "../api/axiosInstance"; // Asegúrate que la ruta es correcta
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import ChatHeader from "./ChatHeader"; // Importamos el nuevo ChatHeader
import ImageViewer from "./ImageViewer";
import useGroupSocket from "../hooks/useGroupSocket";

const GroupChatWindow = ({ group, onBack }) => {
    const [messages, setMessages] = useState([]);
    const [imagePreview, setImagePreview] = useState(null);

    const onSocketMessage = useCallback((event) => {
        const { type, message: msg } = event;

        if (type === 'chat_message_new') {
            setMessages((prev) => {
                if (prev.find(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
        }

        if (type === 'chat_message_update') {
            setMessages((prev) =>
                prev.map(m => m.id === msg.id ? msg : m)
            );
        }
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
            {/* Usamos ChatHeader para el chat grupal para consistencia y el botón de menú */}
            <ChatHeader
                chat={{
                    type: 'GROUP', // Tipo interno para identificar que es un chat grupal
                    name: group,
                    // Puedes añadir más propiedades del grupo si las necesitas en el header
                }}
                onBack={onBack} // Pasa onBack
            />


            {/* Mensajes */}
            <ChatMessages
                setMessages={setMessages}
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
