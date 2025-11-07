import React, { useEffect, useState } from "react";
import axios from "axios";

const HistorialModal = ({ ticket, onClose }) => {
    const [historial, setHistorial] = useState([]);
    const [asignaciones, setAsignaciones] = useState([]);

    const token = localStorage.getItem("access");

    useEffect(() => {
        if (ticket && token) {
            axios
                .get(`http://localhost:8000/api/admin/tickets/${ticket.id}/historial/`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                .then((res) => setHistorial(res.data))
                .catch((err) => console.error("Error cargando historial:", err));

            axios
                .get(
                    `http://localhost:8000/api/admin/tickets/${ticket.id}/asignaciones/`,
                    { headers: { Authorization: `Bearer ${token}` } }
                )
                .then((res) => setAsignaciones(res.data))
                .catch((err) => console.error("Error cargando asignaciones:", err));
        }
    }, [ticket, token]);

    return (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-40">
            <div className="bg-white w-3/4 rounded-xl shadow-xl p-6 overflow-y-auto max-h-[90vh]">
                <h3 className="text-2xl font-bold mb-4">
                    🕓 Historial del Ticket #{ticket.id}
                </h3>

                <h4 className="text-lg font-semibold mt-4 mb-2">Historial de acciones:</h4>
                <ul className="space-y-3">
                    {historial.length > 0 ? (
                        historial.map((h) => (
                            <li key={h.id} className="border-l-4 border-blue-500 pl-3">
                                <p className="text-sm text-gray-600">
                                    <strong>{h.usuario_nombre}</strong> - {h.accion}
                                </p>
                                <p className="text-gray-500 text-xs">
                                    {new Date(h.fecha).toLocaleString()}
                                </p>
                                <p className="text-gray-700">{h.descripcion}</p>
                            </li>
                        ))
                    ) : (
                        <p className="text-gray-500">No hay historial registrado.</p>
                    )}
                </ul>

                <h4 className="text-lg font-semibold mt-6 mb-2">Asignaciones:</h4>
                <ul className="space-y-3">
                    {asignaciones.length > 0 ? (
                        asignaciones.map((a) => (
                            <li
                                key={a.id}
                                className="border-l-4 border-green-500 pl-3 text-sm text-gray-700"
                            >
                                <p>
                                    <strong>{a.agente_origen_nombre}</strong> ➜{" "}
                                    {a.agente_destino_nombre} ({a.estado})
                                </p>
                                <p className="text-gray-500 text-xs">
                                    Enviado el {new Date(a.fecha_envio).toLocaleString()}
                                </p>
                            </li>
                        ))
                    ) : (
                        <p className="text-gray-500">Sin asignaciones registradas.</p>
                    )}
                </ul>

                <button
                    onClick={onClose}
                    className="mt-6 bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                >
                    Cerrar
                </button>
            </div>
        </div>
    );
};

export default HistorialModal;
