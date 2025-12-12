import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import ChatSidebar from "./ChatSidebar";
import ChatWindow from "./ChatWindow";
import GroupChatWindow from "./GroupChatWindow";
import API from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";
import "./Chat.css";

const ChatLayout = () => {
    const { user } = useAuth();
    const isAgent = user?.role === 'agente' || user?.role === 'admin';
    const location = useLocation();

    const [selectedChat, setSelectedChat] = useState(null);
    const [chats, setChats] = useState([]);
    const [activeAgents, setActiveAgents] = useState([]);
    const [inactiveAgents, setInactiveAgents] = useState([]);
    const [loadingAgents, setLoadingAgents] = useState(false);
    const [agentsError, setAgentsError] = useState(null);

    const loadChats = useCallback(async () => {
        try {
            const response = await API.get("/chat/rooms/");
            let allChats = response.data.results || response.data || [];

            // Solo añadir el chat grupal si el usuario es agente o admin
            if (isAgent) {
                const groupChat = {
                    id: "group-hr",
                    type: "GRUPAL",
                    name: "HR - Grupo",
                    messages: [],
                };
                allChats.unshift(groupChat);
            }

            // console.log("Final chats list:", allChats); // Comentado para evitar spam en consola
            setChats(allChats);
        } catch (error) {
            console.error("Error cargando chats:", error);
            setChats([]);
        }
    }, [isAgent]);

    const loadAgents = useCallback(async () => {
        if (!isAgent) return;
        setLoadingAgents(true);
        setAgentsError(null);
        try {
            const response = await API.get("/chat/agents/");
            const allAgents = response.data.results || response.data || [];
            setActiveAgents(allAgents);
            setInactiveAgents([]);
        } catch (error) {
            console.error("Error cargando agentes:", error);
            setAgentsError("No se pudieron cargar los agentes.");
        } finally {
            setLoadingAgents(false);
        }
    }, [isAgent]);

    useEffect(() => {
        loadChats();
        loadAgents();

        // 🔹 POLLING: Actualizar lista de chats cada 3 segundos para "tiempo real" en la lista
        const interval = setInterval(() => {
            loadChats();
        }, 3000);

        const handleResize = () => {
            // La lógica de visibilidad ahora es manejada puramente por CSS
            // a través de las clases y media queries.
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearInterval(interval);
        };
    }, [loadChats, loadAgents]);

    // 🔹 EFECTO: Seleccionar chat automáticamente si viene en la URL (?roomId=...)
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const roomId = searchParams.get("roomId");

        if (roomId && chats.length > 0) {
            const foundChat = chats.find(c => String(c.id) === String(roomId));
            if (foundChat) {
                setSelectedChat({ type: 'room', data: foundChat });
            }
        }
    }, [location.search, chats]);

    const handleSelectChat = (chat) => {
        setSelectedChat(chat);
        // Forzar scroll al top al cambiar de chat, útil en móvil.
        window.scrollTo(0, 0);
    };

    const handleBackToSidebar = () => {
        setSelectedChat(null);
        // Forzar scroll al top al regresar, útil en móvil.
        window.scrollTo(0, 0);
    };

    return (
        <div className="chat-layout">
            {/* Sidebar - visible en desktop, oculto en móvil cuando hay chat seleccionado */}
            <div className={`chat-sidebar-container ${selectedChat ? 'hidden' : 'visible'}`}> {/* Lógica de clases simplificada */}
                <ChatSidebar
                    chats={chats}
                    selectedChat={selectedChat}
                    setSelectedChat={handleSelectChat}
                    reloadChats={loadChats}
                    activeAgents={activeAgents}
                    inactiveAgents={inactiveAgents}
                    loadingAgents={loadingAgents}
                    agentsError={agentsError}
                    isAgent={isAgent}
                    onBack={handleBackToSidebar}
                />
            </div>

            {/* Ventana de chat - visible cuando hay chat seleccionado */}
            <div className={`chat-main-content ${selectedChat ? 'chat-selected' : 'no-chat-selected'}`}>
                {selectedChat ? (
                    selectedChat.data.type === 'GRUPAL' ? (
                        <GroupChatWindow
                            group={selectedChat.data.id}
                            onBack={handleBackToSidebar}
                        />
                    ) : (
                        <ChatWindow
                            chat={selectedChat.data}
                            onBack={handleBackToSidebar}
                        />
                    )
                ) : (
                    <div className="chat-empty">
                        <div className="chat-empty__card">
                            <div className="chat-empty__icon-circle">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                    <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
                                        fill="#3498db" fillOpacity="0.1" stroke="#3498db" strokeWidth="2" />
                                    <path d="M8 10H16M8 14H12" stroke="#3498db" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </div>
                            <h3 className="chat-empty__title">¡Hola, {user?.username}!</h3>
                            <p className="chat-empty__subtitle">
                                {isAgent ? "Selecciona un chat para empezar a conversar" : "Tus conversaciones aparecerán aquí"}
                            </p>
                            <div className="chat-empty__legend">
                                <div className="chat-empty__legend-item">
                                    <div className="chat-empty__legend-dot chat-empty__legend-dot--online"></div>
                                    <span>Online</span>
                                </div>
                                <div className="chat-empty__legend-item">
                                    <div className="chat-empty__legend-dot chat-empty__legend-dot--offline"></div>
                                    <span>Offline</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatLayout;