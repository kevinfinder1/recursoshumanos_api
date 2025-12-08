// ChatInput.jsx - CORREGIDO
import React, { useState, useRef } from "react";
import "./Chat.css";
import API from "../api/axiosInstance";

const ChatInput = ({
    roomId,
    onSend,
    isGroup = false,
    groupName,
    wsRef,
}) => {
    const [text, setText] = useState("");
    const [file, setFile] = useState(null);
    const typingTimeout = useRef(null);

    const handleTyping = () => {
        if (wsRef?.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "typing" }));
        }

        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            if (wsRef?.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: "stop_typing" }));
            }
        }, 1200);
    };

    const sendMessage = async () => {
        if (!text && !file) return;

        const form = new FormData();
        form.append("content", text);
        if (file) form.append("file", file);

        try {
            let res;

            if (isGroup) {
                res = await API.post(`/chat/group/${groupName}/send/`, form, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            } else {
                res = await API.post(`/chat/rooms/${roomId}/send/`, form, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            }

            console.log("✅ Mensaje enviado:", res?.data);
            setText(""); // Limpiar texto
            setFile(null); // Limpiar archivo
            if (onSend && res?.data) onSend(res.data);
        } catch (error) {
            console.error("❌ Error enviando mensaje:", error);
            alert(
                "Error al enviar mensaje: " +
                (error.response?.data?.error || error.message)
            );
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="chat-input">
            {/* File Input */}
            <div className="chat-input__file-wrapper">
                <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="chat-input__file-input"
                    id="file-upload"
                />
                <label htmlFor="file-upload" className="chat-input__file-label">
                    <svg className="chat-input__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span>Attach</span>
                </label>
                {file && (
                    <div className="chat-input__file-name">
                        {file.name}
                    </div>
                )}
            </div>

            {/* Text Input */}
            <input
                className="chat-input__text"
                placeholder="Type a message..."
                value={text}
                onChange={(e) => {
                    setText(e.target.value);
                    handleTyping();
                }}
                onKeyPress={handleKeyPress}
            />

            {/* Send Button */}
            <button
                onClick={sendMessage}
                disabled={!text.trim() && !file}
                className="chat-input__send-btn"
            >
                <svg className="chat-input__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Send</span>
            </button>
        </div>
    );
};

export default ChatInput;
