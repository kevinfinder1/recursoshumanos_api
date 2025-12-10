import React, { useState } from "react";
import { ChevronDown, ChevronLeft, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axiosInstance";
import "./Chat.css";

const ChatSidebar = ({
    chats,
    selectedChat,
    setSelectedChat,
    reloadChats,
    activeAgents = [],
    inactiveAgents = [],
    loadingAgents,
    agentsError,
    isAgent,
    onBack
}) => {
    const { user } = useAuth();
    const [collapsedSections, setCollapsedSections] = useState({});

    const handleSelectAgent = async (agent) => {
        try {
            const response = await API.post("/chat/directo/iniciar/", {
                target_user_id: agent.id,
            });
            const directChatRoom = { type: 'room', data: response.data };
            setSelectedChat(directChatRoom);
            reloadChats();
        } catch (error) {
            console.error("❌ Error iniciando chat:", error);
            alert(
                "Error al iniciar chat: " +
                (error.response?.data?.error || error.message)
            );
        }
    };

    const getChatAvatar = (chat) => {
        if (chat.type === 'TICKET') {
            const solicitante = chat.participants?.find(p => p.role === 'solicitante');
            return `https://ui-avatars.com/api/?name=${solicitante?.username || 'T'}&background=3498db&color=ffffff`;
        } else if (chat.type === 'DIRECTO') {
            const otherUser = chat.participants?.find(p => p.id !== user?.id);
            return `https://ui-avatars.com/api/?name=${otherUser?.username || 'D'}&background=27ae60&color=ffffff`;
        } else if (chat.type === 'GRUPAL') {
            return `https://ui-avatars.com/api/?name=${chat.name || 'G'}&background=95a5a6&color=ffffff`;
        }
        return `https://ui-avatars.com/api/?name=C&background=95a5a6&color=ffffff`;
    };

    const getChatTitle = (chat) => {
        if (chat.type === 'TICKET') {
            return `Ticket #${chat.ticket_id}`;
        } else if (chat.type === 'DIRECTO') {
            const otherUser = chat.participants?.find(p => p.id !== user?.id);
            return otherUser?.username || 'Chat directo';
        } else if (chat.type === 'GRUPAL') {
            return chat.name || 'Chat Grupal';
        }
        return 'Chat';
    };

    const getLastMessage = (chat) => {
        if (chat.messages?.length > 0) {
            const lastMsg = chat.messages[chat.messages.length - 1];
            if (lastMsg.message_type === 'image') {
                return '📷 Imagen';
            } else if (lastMsg.message_type === 'file') {
                return '📎 Archivo';
            }
            return lastMsg.content?.substring(0, 50) + (lastMsg.content?.length > 50 ? '...' : '') || '...';
        }
        return 'No hay mensajes...';
    };

    const getLastMessageTime = (chat) => {
        if (chat.messages?.length > 0) {
            const lastMsg = chat.messages[chat.messages.length - 1];
            const date = new Date(lastMsg.timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / (1000 * 60));

            if (diffMins < 60) return `${diffMins}m`;
            if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
            return `${Math.floor(diffMins / 1440)}d`;
        }
        return '';
    };

    const toggleSection = (section) => {
        setCollapsedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    return (
        <div className="chat-sidebar">
            <div className="chat-sidebar__header">
                <div className="chat-sidebar__header-top">
                    <div className="chat-sidebar__header-left">
                        {window.innerWidth <= 768 && (
                            <button
                                className="chat-header__back-button"
                                onClick={onBack}
                            >
                                <ChevronLeft size={24} />
                            </button>
                        )}
                        <h2 className="chat-sidebar__title">Chats</h2>
                    </div>
                    <button
                        onClick={reloadChats}
                        className="chat-sidebar__refresh-btn"
                        title="Actualizar chats"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
                <p className="chat-sidebar__subtitle">
                    {isAgent ? "Agentes y tickets activos" : "Tus conversaciones"}
                </p>
            </div>

            <div className="chat-sidebar__body">
                {isAgent && (
                    <>
                        {/* Agentes activos */}
                        <div className="chat-sidebar__section">
                            <div className="chat-sidebar__section-header">
                                <h3 className="chat-sidebar__section-title">
                                    Agentes Activos ({activeAgents.length})
                                </h3>
                                <button
                                    className="chat-sidebar__collapse-btn"
                                    onClick={() => toggleSection('agents')}
                                >
                                    <ChevronDown
                                        className={`chat-sidebar__collapse-icon ${collapsedSections.agents ? 'collapsed' : ''}`}
                                    />
                                </button>
                            </div>

                            {!collapsedSections.agents && (
                                <>
                                    {loadingAgents && (
                                        <div className="chat-sidebar__loading">
                                            <div className="chat-sidebar__spinner"></div>
                                        </div>
                                    )}

                                    {agentsError && (
                                        <p className="chat-sidebar__error">{agentsError}</p>
                                    )}

                                    {activeAgents.length === 0 && !loadingAgents && !agentsError && (
                                        <p className="chat-list__empty">No hay agentes activos</p>
                                    )}

                                    <div className="agents-list">
                                        {activeAgents.map((agent) => (
                                            <div
                                                key={agent.id ?? agent.username}
                                                className="agent-item"
                                                onClick={() => handleSelectAgent(agent)}
                                            >
                                                <div className="agent-item__avatar">
                                                    <img
                                                        src={`https://ui-avatars.com/api/?name=${agent.username}&background=27ae60&color=ffffff`}
                                                        alt={agent.username}
                                                    />
                                                    <span className="agent-item__dot agent-item__dot--online"></span>
                                                </div>
                                                <div className="agent-item__info">
                                                    <span className="agent-item__name">
                                                        {agent.first_name && agent.last_name
                                                            ? `${agent.first_name} ${agent.last_name}`
                                                            : agent.username}
                                                    </span>
                                                    <div className="agent-item__meta">
                                                        <span className="agent-item__role">
                                                            {agent.role ? agent.role.replace('agente_', '') : 'Agente'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="chat-sidebar__separator"></div>
                    </>
                )}

                {/* Lista de chats (incluye Chat Grupal para agentes) */}
                <div className="chat-sidebar__section">
                    <div className="chat-sidebar__section-header">
                        <h3 className="chat-sidebar__section-title">
                            {isAgent ? "Todos los Chats" : "Conversaciones"}
                        </h3>
                        <span className="chat-sidebar__count">
                            {/* Solo contar chats dinámicos, no el chat grupal */}
                            {chats.length}
                        </span>
                    </div>

                    <div className="chat-list">
                        {/* Mensaje cuando no hay chats dinámicos */}
                        {chats.length === 0 ? (
                            <p className="chat-list__empty">
                                {isAgent ? "No hay chats activos" : "No tienes conversaciones"}
                            </p>
                        ) : (
                            /* Chats dinámicos */
                            chats.map((chat) => {
                                const isSelected = selectedChat?.type === 'room' && selectedChat.data.id === chat.id;

                                return (
                                    <div
                                        key={chat.id}
                                        className={`chat-item ${isSelected ? "chat-item--selected" : ""}`}
                                        onClick={() => {
                                            setSelectedChat({ type: 'room', data: chat });
                                        }}
                                    >
                                        <div className="chat-item__avatar">
                                            <img src={getChatAvatar(chat)} alt={getChatTitle(chat)} />
                                            {(chat.type === 'TICKET' && chat.ticket_estado === 'En Proceso') ||
                                                (chat.type === 'DIRECTO') ? (
                                                <span className="chat-item__status chat-item__status--online"></span>
                                            ) : (
                                                <span className="chat-item__status chat-item__status--offline"></span>
                                            )}
                                        </div>
                                        <div className="chat-item__info">
                                            <div className="chat-item__header">
                                                <h4 className="chat-item__title">{getChatTitle(chat)}</h4>
                                                <span className="chat-item__time">{getLastMessageTime(chat)}</span>
                                            </div>
                                            <div className="chat-item__preview">
                                                <p className="chat-item__last-message">{getLastMessage(chat)}</p>
                                                {chat.unread_count > 0 && (
                                                    <span className="chat-item__badge">{chat.unread_count}</span>
                                                )}
                                            </div>
                                            <div className="chat-item__footer">
                                                {chat.type === 'TICKET' && (
                                                    <span className={`chat-item__type chat-item__type--${chat.ticket_estado === 'En Proceso' ? 'process' : 'default'}`}>
                                                        {chat.ticket_estado}
                                                    </span>
                                                )}
                                                {chat.type === 'DIRECTO' && (
                                                    <span className="chat-item__type chat-item__type--direct">Directo</span>
                                                )}
                                                {chat.type === 'GRUPAL' && (
                                                    <span className="chat-item__type chat-item__type--default">Grupal</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatSidebar;