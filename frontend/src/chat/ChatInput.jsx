import React, { useState, useRef } from "react";
import "./Chat.css";
import API from "../api/axiosInstance";
import { Send, Paperclip } from "lucide-react";

const ChatInput = ({ roomId, onSend, isGroup = false, groupName, wsRef }) => {
    const [text, setText] = useState("");
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
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
        }, 1500);
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.size > 10 * 1024 * 1024) {
                alert("El archivo no puede ser mayor a 10MB");
                return;
            }
            setFile(selectedFile);
        }
    };

    const sendMessage = async () => {
        if (!text.trim() && !file) return;

        const formData = new FormData();
        if (text.trim()) formData.append("content", text);
        if (file) formData.append("file", file);

        setIsUploading(true);
        try {
            let endpoint;
            if (isGroup) {
                endpoint = `/chat/group/${groupName}/send/`;
            } else {
                endpoint = `/chat/rooms/${roomId}/send/`;
            }

            const res = await API.post(endpoint, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            console.log("✅ Mensaje enviado:", res?.data);
            setText("");
            setFile(null);
            if (onSend && res?.data?.data) onSend(res.data.data);
        } catch (error) {
            console.error("❌ Error enviando mensaje:", error);
            alert(
                "Error al enviar mensaje: " +
                (error.response?.data?.error || error.message)
            );
        } finally {
            setIsUploading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="chat-input">
            <div className="chat-input__actions">
                <button
                    className="chat-input__file-btn"
                    onClick={triggerFileInput}
                    title="Adjuntar archivo"
                    type="button"
                >
                    <Paperclip size={20} />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="chat-input__file-input"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                />
            </div>

            <div className="chat-input__main">
                <div className="chat-input__text-container">
                    <textarea
                        className="chat-input__text"
                        placeholder="Escribe un mensaje..."
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value);
                            handleTyping();
                        }}
                        onKeyPress={handleKeyPress}
                        rows={1}
                    />
                    {file && (
                        <div className="chat-input__file-preview">
                            <span>{file.name}</span>
                            <button
                                onClick={() => setFile(null)}
                                className="chat-input__remove-file"
                                type="button"
                            >
                                ×
                            </button>
                        </div>
                    )}
                </div>

                <button
                    onClick={sendMessage}
                    disabled={(!text.trim() && !file) || isUploading}
                    className="chat-input__send-btn"
                    type="button"
                >
                    {isUploading ? (
                        <div className="chat-input__spinner"></div>
                    ) : (
                        <Send size={20} />
                    )}
                </button>
            </div>
        </div>
    );
};

export default ChatInput;