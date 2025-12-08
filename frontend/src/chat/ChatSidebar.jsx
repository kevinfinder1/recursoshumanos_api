// src/chat/ChatSidebar.jsx
import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
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
}) => {
    const { user } = useAuth();

    const handleSelectAgent = async (agent) => {
        try {
            const response = await API.post("/chat/directo/iniciar/", {
                target_user_id: agent.id,
            });
            const directChatRoom = response.data;
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

    return (
        <div className="chat-sidebar">
            <div className="chat-sidebar__header">
                <div className="chat-sidebar__header-top">
                    <h2 className="chat-sidebar__title">Message Center</h2>
                    <button
                        onClick={reloadChats}
                        className="chat-sidebar__refresh-btn"
                    >
                        Refresh
                    </button>
                </div>
                <p className="chat-sidebar__subtitle">
                    {isAgent ? "Active agents and ticket chats" : "Your conversations"}
                </p>
            </div>

            <div className="chat-sidebar__body">
                {isAgent && (
                    <>
                        {/* Agentes activos */}
                        <div>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 8,
                                }}
                            >
                                <h3 className="chat-sidebar__section-title">
                                    Active Agents
                                </h3>
                                {loadingAgents && (
                                    <div className="chat-sidebar__spinner" />
                                )}
                            </div>

                            {agentsError && (
                                <p style={{ fontSize: "0.75rem", color: "#ff003c" }}>
                                    {agentsError}
                                </p>
                            )}

                            {activeAgents.length === 0 && !loadingAgents && !agentsError && (
                                <p className="chat-list__empty">
                                    No active agents at the moment.
                                </p>
                            )}

                            <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {activeAgents.map((agent) => (
                                    <li
                                        key={agent.id ?? agent.username}
                                        className="agent-item"
                                        onClick={() => handleSelectAgent(agent)}
                                    >
                                        <span className="agent-item__dot agent-item__dot--online" />
                                        <AgentInfo agent={agent} />
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Agentes inactivos */}
                        {inactiveAgents.length > 0 && (
                            <CollapsibleSection title={`Offline (${inactiveAgents.length})`}>
                                <ul
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 8,
                                        marginTop: 8,
                                    }}
                                >
                                    {inactiveAgents.map((agent) => (
                                        <li
                                            key={agent.id ?? agent.username}
                                            className="agent-item"
                                            style={{ cursor: "default" }}
                                        >
                                            <span className="agent-item__dot agent-item__dot--offline" />
                                            <AgentInfo agent={agent} />
                                        </li>
                                    ))}
                                </ul>
                            </CollapsibleSection>
                        )}

                        {/* Group chat */}
                        <div>
                            <h3 className="chat-sidebar__section-title">Group Chat</h3>
                            <div
                                className={
                                    "group-chat-item " +
                                    (selectedChat?.type === "group"
                                        ? "group-chat-item--selected"
                                        : "")
                                }
                                onClick={() =>
                                    setSelectedChat({
                                        type: "group",
                                        group_name: "HR",
                                    })
                                }
                            >
                                <p className="group-chat-item__title">
                                    HR – Group Chat
                                </p>
                                <p className="group-chat-item__subtitle">
                                    Conversation between agents
                                </p>
                            </div>
                        </div>

                        <div className="chat-sidebar__separator" />
                    </>
                )}

                {/* Lista de chats */}
                <div>
                    <h3 className="chat-sidebar__section-title">
                        {isAgent ? "All Chats" : "Your Conversations"}
                    </h3>

                    {chats.length === 0 && (
                        <p className="chat-list__empty">No active chats.</p>
                    )}

                    {chats.map((chat) => {
                        if (chat.type === 'TICKET') {
                            const solicitante = chat.participants.find(p => p.role === 'solicitante');
                            const lastMsg = chat.messages && chat.messages.length ? chat.messages[chat.messages.length - 1] : null;

                            return (
                                <div
                                    key={chat.id}
                                    className={
                                        "chat-item " +
                                        (selectedChat?.id === chat.id
                                            ? "chat-item--selected"
                                            : "")
                                    }
                                    onClick={() => setSelectedChat(chat)}
                                >
                                    <div className="chat-item__header">
                                        <p className="chat-item__title">
                                            Ticket #{chat.ticket_id}
                                        </p>
                                        <span
                                            className={
                                                "chat-item__badge " +
                                                (chat.ticket_estado === "En Proceso"
                                                    ? "chat-item__badge--process"
                                                    : "chat-item__badge--default")
                                            }
                                        >
                                            {chat.ticket_estado}
                                        </span>
                                    </div>
                                    <p className="chat-item__subtitle">
                                        Requester: {solicitante ? solicitante.username : 'N/A'}
                                    </p>
                                    <p className="chat-item__last-message">
                                        {lastMsg
                                            ? `${lastMsg.sender_name}: ${lastMsg.content || 'Attachment'}`
                                            : "No messages yet..."}
                                    </p>
                                </div>
                            );
                        }

                        if (chat.type === 'DIRECTO') {
                            const otherUser = chat.participants.find(p => p.id !== user.id);
                            const lastMsg = chat.messages && chat.messages.length ? chat.messages[chat.messages.length - 1] : null;

                            return (
                                <div
                                    key={chat.id}
                                    className={
                                        "chat-item " +
                                        (selectedChat?.id === chat.id
                                            ? "chat-item--selected"
                                            : "")
                                    }
                                    onClick={() => setSelectedChat(chat)}
                                >
                                    <div className="chat-item__header">
                                        <p className="chat-item__title">
                                            {otherUser ? otherUser.username : 'Chat directo'}
                                        </p>
                                        <span className="chat-item__badge chat-item__badge--direct">
                                            Directo
                                        </span>
                                    </div>
                                    <p className="chat-item__last-message">
                                        {lastMsg
                                            ? `${lastMsg.sender_name}: ${lastMsg.content || 'Attachment'}`
                                            : "No messages yet..."}
                                    </p>
                                </div>
                            );
                        }

                        return null;
                    })}
                </div>
            </div>
        </div>
    );
};

export default ChatSidebar;

const AgentInfo = ({ agent }) => (
    <div style={{ display: "flex", flexDirection: "column" }}>
        <span className="agent-item__name">
            {agent.first_name && agent.last_name
                ? `${agent.first_name} ${agent.last_name}`
                : agent.username}
        </span>
        <div className="agent-item__meta">
            <span>
                {agent.role.replace('agente_', '')}
            </span>
            <span>•</span>
            <span>
                Load: {agent.disponibilidad} ({agent.carga_trabajo})
            </span>
        </div>
    </div>
);

const CollapsibleSection = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="collapsible">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="collapsible__btn"
            >
                <span>{title}</span>
                <ChevronDown
                    className="w-4 h-4"
                    style={{
                        transition: "transform 0.15s ease",
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                />
            </button>
            {isOpen && <div style={{ marginTop: 4 }}>{children}</div>}
        </div>
    );
};
