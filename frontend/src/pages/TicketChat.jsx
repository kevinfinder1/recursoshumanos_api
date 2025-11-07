// src/pages/TicketChat.jsx
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

const WS_BASE = "ws://localhost:8000/ws/tickets/";

const TicketChat = ({ ticketId, user }) => {
    const [mensajes, setMensajes] = useState([]);
    const [nuevoMensaje, setNuevoMensaje] = useState("");
    const socketRef = useRef(null);

    useEffect(() => {
        if (!ticketId) return;
        const ws = new WebSocket(`${WS_BASE}${ticketId}/`);
        socketRef.current = ws;

        ws.onopen = () => console.log("💬 Conectado al chat del ticket", ticketId);
        ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                setMensajes((prev) => [...prev, data]);
            } catch (err) {
                console.error("Error parsing message:", err);
            }
        };
        ws.onerror = (err) => console.error("❌ Error WebSocket:", err);
        ws.onclose = () => console.log("🔌 Chat desconectado");

        return () => ws.close();
    }, [ticketId]);

    const enviarMensaje = (e) => {
        e.preventDefault();
        const texto = nuevoMensaje.trim();
        if (!texto) return;
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ contenido: texto }));
            setNuevoMensaje("");
        } else {
            toast.error("El chat no está conectado.");
        }
    };

    return (
        <div className="border rounded-md p-3 bg-gray-50">
            <div className="h-56 overflow-y-auto space-y-2 mb-3">
                {mensajes.length > 0 ? (
                    mensajes.map((m, i) => (
                        <div
                            key={i}
                            className={`flex ${m.autor === user.username ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[80%] p-2 rounded-lg text-sm ${m.autor === user.username
                                    ? "bg-green-100 text-gray-800"
                                    : "bg-gray-200 text-gray-800"
                                    }`}
                            >
                                <strong>{m.autor}:</strong> {m.contenido}
                                <div className="text-xs text-gray-500">
                                    {m.fecha_envio || ""}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 text-sm">Sin mensajes aún.</p>
                )}
            </div>

            <form onSubmit={enviarMensaje} className="flex">
                <input
                    type="text"
                    value={nuevoMensaje}
                    onChange={(e) => setNuevoMensaje(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 border px-3 py-2 rounded-l"
                />
                <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 rounded-r hover:bg-blue-700"
                >
                    Enviar
                </button>
            </form>
        </div>
    );
};

export default TicketChat;
