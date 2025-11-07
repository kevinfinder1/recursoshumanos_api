import React, { useEffect, useState } from "react";
import axios from "axios";

const AsignarAgenteModal = ({ ticket, onClose }) => {
    const [agentes, setAgentes] = useState([]);
    const [agenteSeleccionado, setAgenteSeleccionado] = useState(null);
    const token = localStorage.getItem("access");

    useEffect(() => {
        axios
            .get("http://localhost:8000/api/users/", {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                const soloAgentes = res.data.filter((u) =>
                    u.role.startsWith("agente")
                );
                setAgentes(soloAgentes);
            })
            .catch((err) => console.error("Error cargando agentes:", err));
    }, [token]);

    const asignar = () => {
        if (!agenteSeleccionado) return;

        axios
            .patch(
                `http://localhost:8000/api/admin/tickets/${ticket.id}/asignar_agente/`,
                { agente_id: agenteSeleccionado },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            .then(() => {
                alert("✅ Ticket asignado correctamente");
                onClose();
            })
            .catch((err) => {
                console.error("Error asignando agente:", err);
                alert("❌ Error al asignar agente");
            });
    };

    return (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-40">
            <div className="bg-white p-6 rounded-xl shadow-xl w-1/3">
                <h3 className="text-xl font-bold mb-4">
                    Asignar agente al ticket #{ticket.id}
                </h3>

                <select
                    className="border w-full p-2 rounded-md"
                    onChange={(e) => setAgenteSeleccionado(e.target.value)}
                >
                    <option value="">-- Selecciona un agente --</option>
                    {agentes.map((a) => (
                        <option key={a.id} value={a.id}>
                            {a.username} ({a.role})
                        </option>
                    ))}
                </select>

                <div className="flex justify-end gap-3 mt-5">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={asignar}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                        Asignar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AsignarAgenteModal;
