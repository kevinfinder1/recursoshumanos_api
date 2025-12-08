// src/chat/ChatLayout.jsx
import React, { useState, useEffect } from "react";
import ChatSidebar from "./ChatSidebar";
import ChatWindow from "./ChatWindow";
import GroupChatWindow from "./GroupChatWindow";
import API from "../api/axiosInstance";
import useActiveAgents from "../hooks/useActiveAgents";
import { useAuth } from "../context/AuthContext";
import "./Chat.css";

const ChatLayout = () => {
    const [selectedChat, setSelectedChat] = useState(null);
    const [chats, setChats] = useState([]);
    const { user } = useAuth();

    // Solo los agentes o admins pueden ver la lista de otros agentes
    const isAgentOrAdmin =
        user && (user.role === "admin" || user.role?.startsWith("agente"));

    const {
        activeAgents,
        inactiveAgents,
        loading: loadingAgents,
        error: agentsError
    } = isAgentOrAdmin ? useActiveAgents(15000) : { activeAgents: [], inactiveAgents: [], loading: false, error: null };

    useEffect(() => {
        loadChats();
        const interval = setInterval(() => {
            loadChats();
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    // También recargar cuando se selecciona un chat diferente
    useEffect(() => {
        if (selectedChat) {
            loadChats();
        }
    }, [selectedChat]);

    const loadChats = async () => {
        try {
            const res = await API.get("/chat/rooms/");
            const chatsData = res.data.results || res.data || [];
            setChats(chatsData);
        } catch (error) {
            console.error("Error cargando chats:", error);
        }
    };

    return (
        <div className="chat-layout">
            <ChatSidebar
                chats={chats}
                selectedChat={selectedChat}
                setSelectedChat={setSelectedChat}
                activeAgents={activeAgents}
                inactiveAgents={inactiveAgents}
                loadingAgents={loadingAgents}
                agentsError={agentsError}
                isAgent={isAgentOrAdmin}
                reloadChats={loadChats}
            />

            {selectedChat ? (
                selectedChat.type === "group" ? (
                    <GroupChatWindow group={selectedChat.group_name} />
                ) : (
                    <ChatWindow chat={selectedChat} />
                )
            ) : (
                <div className="chat-empty">
                    <div className="chat-empty__card">
                        <div className="chat-empty__icon-circle">
                            {/* puedes dejar tu svg aquí */}
                            <svg
                                className="w-12 h-12 text-blue-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                            </svg>
                        </div>
                        <h3 className="chat-empty__title">Selecciona un chat</h3>
                        <p className="chat-empty__subtitle">
                            Elige una conversación en la barra lateral para empezar a
                            chatear.
                        </p>
                        <div className="chat-empty__legend">
                            <div className="chat-empty__legend-item">
                                <div
                                    className="chat-empty__legend-dot"
                                    style={{ backgroundColor: "#00ff9d", boxShadow: "0 0 8px #00ff9d" }}
                                />
                                <span>Activo</span>
                            </div>
                            <div className="chat-empty__legend-item">
                                <div
                                    className="chat-empty__legend-dot"
                                    style={{ backgroundColor: "#ff003c" }}
                                />
                                <span>Seleccionado</span>
                            </div>
                            <div className="chat-empty__legend-item">
                                <div
                                    className="chat-empty__legend-dot"
                                    style={{ backgroundColor: "#00a8ff" }}
                                />
                                <span>Grupo</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatLayout;
