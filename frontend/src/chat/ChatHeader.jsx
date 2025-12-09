import React from 'react';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import './Chat.css';

const ChatHeader = ({ chat, onBack }) => {
    const isTicketChat = chat.type === 'TICKET';
    const isGroupChat = chat.type === 'GROUP';

    let chatName = '';
    let chatStatus = '';
    let avatarSrc = '';

    if (isTicketChat) {
        chatName = `Ticket #${chat.ticket_id}`;
        chatStatus = chat.ticket_estado;
        const solicitante = chat.participants?.find(p => p.role === 'solicitante');
        avatarSrc = `https://ui-avatars.com/api/?name=${solicitante?.username || 'T'}&background=cb4459db&color=ffffff`;
    } else if (isGroupChat) {
        chatName = `Grupo - ${chat.name}`;
        chatStatus = 'Chat grupal';
        avatarSrc = `https://ui-avatars.com/api/?name=${chat.name}&background=cb4459&color=ffffff`;
    } else {
        const otherUser = chat.participants?.find(p => p.id !== JSON.parse(localStorage.getItem("user"))?.id);
        chatName = otherUser?.username || 'Chat directo';
        chatStatus = 'En línea';
        avatarSrc = `https://ui-avatars.com/api/?name=${chatName}&background=cb4459&color=ffffff`;
    }

    return (
        <div className="chat-header">
            {/* Botón para móvil - volver al sidebar */}
            {onBack && (
                <button
                    className="chat-header__back-button"
                    onClick={onBack}
                    aria-label="Volver a chats"
                    title="Volver a chats"
                >
                    <ArrowLeft size={24} />
                </button>
            )}

            {/* Avatar */}
            <div className="chat-header__avatar-container">
                <img src={avatarSrc} alt={chatName} className="chat-header__avatar" />
                <span className={`chat-header__status-dot ${chatStatus === 'En Proceso' || chatStatus === 'En línea' ? 'chat-header__status-dot--online' : 'chat-header__status-dot--offline'}`}></span>
            </div>

            {/* Información del chat */}
            <div className="chat-header__info">
                <h2 className="chat-header__name">{chatName}</h2>
                <p className={`chat-header__status ${chatStatus === 'En Proceso' || chatStatus === 'En línea' ? 'chat-header__status--online' : 'chat-header__status--offline'}`}>
                    {chatStatus}
                </p>
            </div>

            {/* Botón de opciones (si se necesita en el futuro) */}
            <div className="chat-header__actions">
                {/* <button className="chat-header__options-button"><MoreVertical size={20} /></button> */}
            </div>
        </div>
    );
};

export default ChatHeader;