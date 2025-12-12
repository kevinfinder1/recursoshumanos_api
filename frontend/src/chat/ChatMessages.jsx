import React, { useEffect, useRef, useState, useCallback } from "react";
import "./Chat.css";
import FilePreview from "./FilePreview";
import API from "../api/axiosInstance";
import { MoreVertical, Check, X, Edit2, Trash2, Download, ChevronUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Hoy";
    if (date.toDateString() === yesterday.toDateString()) return "Ayer";

    return date.toLocaleDateString("es-EC", {
        day: "numeric",
        month: "short",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined
    });
};

const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("es-EC", {
        hour: "2-digit",
        minute: "2-digit",
    });
};

const ChatMessages = ({ messages, setMessages, onImageClick, roomId }) => {
    const bottomRef = useRef(null);
    const containerRef = useRef(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editingText, setEditingText] = useState("");
    const [openMenuId, setOpenMenuId] = useState(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [page, setPage] = useState(1);
    const [initialLoad, setInitialLoad] = useState(true);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const { user: currentUser } = useAuth();

    const loadMessages = useCallback(async (pageNum = 1, isInitial = false) => {
        if (!roomId) return;
        if (loadingMore && !isInitial) return;

        setLoadingMore(true);
        try {
            const limit = 20;
            const offset = (pageNum - 1) * limit;

            const res = await API.get(`/chat/rooms/${roomId}/messages/?limit=${limit}&offset=${offset}`);
            const newMessages = res.data.results || res.data || [];

            const container = containerRef.current;
            const oldScrollHeight = container?.scrollHeight;
            const oldScrollTop = container?.scrollTop;

            setMessages(prev => isInitial ? newMessages : [...newMessages, ...prev]);

            setHasMoreMessages(newMessages.length === limit);

            if (isInitial) {
                setInitialLoad(false);
                setTimeout(() => {
                    if (bottomRef.current) {
                        bottomRef.current.scrollIntoView({ behavior: "auto" });
                    }
                }, 100);
            } else if (container) {
                // Mantener la posición del scroll después de cargar más mensajes
                setTimeout(() => {
                    const newScrollHeight = container.scrollHeight;
                    container.scrollTop = newScrollHeight - oldScrollHeight + oldScrollTop;
                }, 50);
            }
        } catch (error) {
            console.error("❌ Error cargando mensajes:", error);
        } finally {
            setLoadingMore(false);
        }
    }, [roomId, setMessages, loadingMore]);

    // Carga inicial y reseteo al cambiar de chat
    useEffect(() => {
        if (roomId) {
            setMessages([]);
            setPage(1);
            setHasMoreMessages(true);
            setInitialLoad(true);
            loadMessages(1, true);
        }
    }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Scroll al fondo para nuevos mensajes
    useEffect(() => {
        // Solo hacer scroll si no estamos en una carga inicial y el usuario está cerca del final
        const container = containerRef.current;
        if (!initialLoad && container) {
            const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 150;
            if (isScrolledToBottom) {
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            }
        }
    }, [messages, initialLoad]);

    // Cerrar menú al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (openMenuId && !e.target.closest('.message-options-container')) {
                setOpenMenuId(null);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [openMenuId]);

    // Scroll handler para paginación y botón de scroll
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            // Cargar más mensajes
            if (container.scrollTop < 100 && hasMoreMessages && !loadingMore) {
                const nextPage = page + 1;
                setPage(nextPage);
                loadMessages(nextPage);
            }
            // Mostrar/ocultar botón de ir al final
            const isNearBottom = container.scrollHeight - container.clientHeight - container.scrollTop < 500;
            setShowScrollButton(!isNearBottom);
        };

        container.addEventListener('scroll', handleScroll);
        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, [hasMoreMessages, loadingMore, page, loadMessages]);

    const isOwn = (msg) => {
        const senderId = typeof msg.sender === "object" && msg.sender !== null
            ? msg.sender.id
            : msg.sender;
        const currentId = currentUser?.id;
        return String(senderId) === String(currentId);
    };

    const handleEdit = (msg) => {
        setEditingMessageId(msg.id);
        setOpenMenuId(null);
        setEditingText(msg.content || "");
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditingText("");
    };

    const handleSaveEdit = async (messageId) => {
        if (!editingText.trim()) {
            alert("El mensaje no puede estar vacío");
            return;
        }

        setIsSavingEdit(true);
        try {
            const response = await API.patch(`/chat/messages/${messageId}/`, {
                content: editingText
            });

            // Actualizar el mensaje en el estado local con la respuesta del servidor
            setMessages(prev => prev.map(m =>
                m.id === messageId ? response.data : m
            ));

            handleCancelEdit();
        } catch (error) {
            console.error("Error al editar el mensaje:", error);
            alert("No se pudo editar el mensaje: " + (error.response?.data?.error || error.message));
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleDelete = (messageId) => {
        setMessageToDelete(messageId);
        setOpenMenuId(null); // Cerrar el menú de opciones
    };

    const cancelDelete = () => {
        setMessageToDelete(null);
    };

    const confirmDelete = async () => {
        if (!messageToDelete) return;

        // Usar el ID del estado messageToDelete
        setIsDeleting(true);
        try {
            await API.delete(`/chat/messages/${messageToDelete}/`);

            // Actualizar el estado local para reflejar la eliminación
            setMessages(prev => prev.map(m =>
                m.id === messageToDelete
                    ? { ...m, is_deleted: true, content: "Este mensaje fue eliminado.", message_type: 'text' }
                    : m
            ));

            setMessageToDelete(null); // Cerrar el modal
        } catch (error) {
            console.error("Error al eliminar el mensaje:", error);
            alert("No se pudo eliminar el mensaje: " + (error.response?.data?.error || error.response?.data?.detail || error.message));
            setMessageToDelete(null); // Cerrar el modal también en caso de error
        } finally {
            setIsDeleting(false);
        }
    };

    const toggleMenu = (messageId, e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        setOpenMenuId(prev => (prev === messageId ? null : messageId));
    };

    const scrollToBottom = () => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    const MessageOptions = ({ msg }) => {
        if (msg.is_deleted && msg.message_type !== "file") return null;

        // 🔹 Verificar si han pasado menos de 5 minutos
        const canModify = () => {
            const msgDate = new Date(msg.timestamp);
            const now = new Date();
            const diffMinutes = (now - msgDate) / (1000 * 60);
            return diffMinutes <= 5;
        };

        return (
            <div className="message-options-container">
                <button
                    className="message-options-button"
                    onClick={(e) => toggleMenu(msg.id, e)}
                >
                    <MoreVertical size={16} />
                </button>

                {openMenuId === msg.id && (
                    <div className="message-options-dropdown">
                        {isOwn(msg) && !msg.is_deleted && canModify() && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEdit(msg); }}
                                    className="message-option"
                                    disabled={msg.message_type !== 'text'}
                                    title={msg.message_type !== 'text' ? 'Solo se pueden editar mensajes de texto' : 'Editar mensaje'}
                                >
                                    <Edit2 size={14} />
                                    <span>Editar</span>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }} // Inicia el proceso de borrado
                                    className="message-option delete"
                                >
                                    <Trash2 size={14} />
                                    <span>Eliminar</span>
                                </button>
                            </>
                        )}

                        {(msg.message_type === "image" || msg.message_type === "file") && msg.file_url && (
                            <a
                                href={msg.file_url}
                                download
                                className="message-option download"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                }}
                            >
                                <Download size={14} />
                                <span>Descargar</span>
                            </a>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="chat-messages" ref={containerRef}>
            {/* Modal de confirmación de borrado */}
            {messageToDelete && (
                <div className="confirmation-modal-overlay">
                    <div className="confirmation-modal">
                        <h3 className="confirmation-modal__title">Eliminar Mensaje</h3>
                        <p className="confirmation-modal__text">
                            ¿Estás seguro de que quieres eliminar este mensaje? Esta acción no se puede deshacer.
                        </p>
                        <div className="confirmation-modal__actions">
                            <button
                                onClick={cancelDelete}
                                className="confirmation-modal__btn confirmation-modal__btn--cancel"
                                disabled={isDeleting}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="confirmation-modal__btn confirmation-modal__btn--confirm"
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Indicador de carga de mensajes anteriores */}
            {loadingMore && (
                <div className="messages-loading">
                    <div className="messages-loading__spinner"></div>
                    <span>Cargando...</span>
                </div>
            )}

            {messages.map((msg, index) => {
                const prevMsg = messages[index - 1];
                const showDate = index === 0 ||
                    new Date(prevMsg.timestamp).toDateString() !== new Date(msg.timestamp).toDateString();

                const showSender = index === 0 ||
                    prevMsg.sender !== msg.sender ||
                    (msg.sender && new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() > 300000);

                return (
                    <React.Fragment key={msg.id || `msg-${index}`}>
                        {showDate && (
                            <div className="chat-messages__date">
                                {formatDate(msg.timestamp)}
                            </div>
                        )}

                        <div className={`message-row ${isOwn(msg) ? "message-row--own" : ""}`}>
                            {!isOwn(msg) && (
                                <div className="message-avatar-container">
                                    {showSender && (
                                        <img
                                            src={`https://ui-avatars.com/api/?name=${msg.sender_name}&background=random&color=fff`}
                                            alt={msg.sender_name}
                                            className="message-avatar"
                                        />
                                    )}
                                </div>
                            )}

                            <div className="message-content">
                                {!isOwn(msg) && showSender && (
                                    <p className="message-sender">
                                        {msg.sender_name}
                                    </p>
                                )}

                                <div
                                    className={`message-bubble ${isOwn(msg) ? "message-bubble--own" : "message-bubble--other"}`}>
                                    {editingMessageId === msg.id ? (
                                        <div className="message-edit-container">
                                            <textarea
                                                value={editingText}
                                                onChange={(e) => setEditingText(e.target.value)}
                                                rows={3}
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Escape') {
                                                        handleCancelEdit();
                                                    }
                                                }}
                                            />
                                            <div className="message-edit-actions">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleSaveEdit(msg.id); }}
                                                    className="btn-save"
                                                    disabled={!editingText.trim() || isSavingEdit}
                                                >
                                                    {isSavingEdit ? '...' : <Check size={16} />}
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                                                    className="btn-cancel"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {msg.is_deleted ? (
                                                <p className="message-deleted">
                                                    <i>Este mensaje fue eliminado</i>
                                                </p>
                                            ) : msg.message_type === "image" ? (
                                                <div className="message-image-container">
                                                    <img
                                                        src={msg.file_url}
                                                        alt="Imagen"
                                                        className="message-image"
                                                        onClick={() => onImageClick(msg.file_url)}
                                                    />
                                                    <MessageOptions msg={msg} />
                                                </div>
                                            ) : msg.message_type === "file" ? (
                                                <div className="message-file-container">
                                                    <FilePreview file={msg} />
                                                    <MessageOptions msg={msg} />
                                                </div>
                                            ) : (
                                                <div className="message-text-container">
                                                    <p className="message-text">{msg.content}</p>
                                                    {isOwn(msg) && <MessageOptions msg={msg} />}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className={`message-meta ${isOwn(msg) ? "message-meta--own" : ""}`}>
                                    {msg.is_edited && !msg.is_deleted && (
                                        <span className="message-edited-tag">(editado)</span>
                                    )}
                                    {formatTime(msg.timestamp)}
                                    {isOwn(msg) && !msg.is_deleted && (
                                        <span className="message-status">
                                            {msg.is_read ? "✓✓" : "✓"}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </React.Fragment>
                );
            })}

            {/* Botón para ir al final */}
            {showScrollButton && (
                <button
                    className="scroll-to-bottom-btn"
                    onClick={scrollToBottom}
                    title="Ir al último mensaje"
                >
                    <ChevronUp size={20} style={{ transform: 'rotate(180deg)' }} />
                </button>
            )}
            <div ref={bottomRef} />
        </div>
    );
};

export default ChatMessages;