// src/chat/ChatMessages.jsx
import React, { useEffect, useRef } from "react";
import "./Chat.css";
import FilePreview from "./FilePreview";

const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("es-EC", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
};

const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("es-EC", {
        hour: "2-digit",
        minute: "2-digit",
    });
};

const ChatMessages = ({ messages, onImageClick }) => {
    const bottomRef = useRef(null);
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const isOwn = (msg) => msg.sender === currentUser.id;

    return (
        <div className="chat-messages">
            {messages.map((msg, index) => {
                const prevMsg = messages[index - 1];
                const showName =
                    index === 0 ||
                    prevMsg.sender !== msg.sender;

                const showDate =
                    index === 0 ||
                    new Date(prevMsg.timestamp).toDateString() !==
                    new Date(msg.timestamp).toDateString();

                return (
                    <div key={msg.id || `msg-${index}`}>
                        {showDate && (
                            <div className="chat-messages__date">
                                {formatDate(msg.timestamp)}
                            </div>
                        )}

                        <div
                            className={
                                "message-row " + (isOwn(msg) ? "message-row--own" : "")
                            }
                        >
                            {!isOwn(msg) && (
                                <img
                                    src={`https://ui-avatars.com/api/?background=random&name=${msg.sender_name}`}
                                    alt={msg.sender_name}
                                    className="message-avatar"
                                />
                            )}

                            <div className="message-wrapper">
                                {!isOwn(msg) && showName && (
                                    <p className="message-sender">
                                        {msg.sender_name}
                                    </p>
                                )}

                                <div
                                    className={
                                        "message-bubble " +
                                        (isOwn(msg)
                                            ? "message-bubble--own"
                                            : "message-bubble--other")
                                    }
                                >
                                    {msg.message_type === "image" ? (
                                        <div style={{ position: "relative" }}>
                                            <img
                                                src={msg.file_url}
                                                alt="Imagen"
                                                className="message-image"
                                                onClick={() => onImageClick(msg.file_url)}
                                            />
                                            <a
                                                href={msg.file_url}
                                                download
                                                className="message-image-download"
                                            >
                                                Descargar
                                            </a>
                                        </div>
                                    ) : msg.message_type === "file" ? (
                                        <FilePreview file={msg} />
                                    ) : (
                                        <p>{msg.content}</p>
                                    )}
                                </div>

                                <div
                                    className={
                                        "message-meta " +
                                        (isOwn(msg) ? "message-meta--own" : "")
                                    }
                                >
                                    {formatTime(msg.timestamp)}
                                    {isOwn(msg) && (
                                        <span style={{ marginLeft: 4 }}>
                                            ✔✔ Visto
                                        </span>
                                    )}
                                </div>
                            </div>

                            {isOwn(msg) && (
                                <div style={{ width: 32, height: 32 }} />
                            )}
                        </div>
                    </div>
                );
            })}

            <div ref={bottomRef} />
        </div>
    );
};

export default ChatMessages;