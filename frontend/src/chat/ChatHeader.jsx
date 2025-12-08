import React, { useEffect, useState } from "react";
import useActiveAgents from "../hooks/useActiveAgents";
import "./Chat.css";

const ChatHeader = ({ chat }) => {
    const { agents } = useActiveAgents();
    const [isOnline, setIsOnline] = useState(false);

    const otherParticipant = chat.participants.find(
        (p) => p.id !== JSON.parse(localStorage.getItem("user"))?.id
    );

    useEffect(() => {
        if (!otherParticipant) return;

        const online = agents.some(
            (ag) => ag.id === otherParticipant.id || ag.username === otherParticipant.username
        );

        setIsOnline(online);
    }, [agents, otherParticipant]);

    return (
        <div className="chat-header">
            <img
                src={`https://ui-avatars.com/api/?background=random&name=${otherParticipant?.username}`}
                className="chat-header__avatar"
                alt="avatar"
            />

            <div>
                <h2 className="chat-header__name">
                    {otherParticipant?.username}
                </h2>
                <p
                    className={
                        "chat-header__status " +
                        (isOnline
                            ? "chat-header__status--online"
                            : "chat-header__status--offline")
                    }
                >
                    {isOnline ? "En línea" : "Desconectado"}
                </p>
            </div>
        </div>
    );
};

export default ChatHeader;
