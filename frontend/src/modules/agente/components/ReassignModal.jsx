import React, { useState } from "react";
import API from "../../../api/axiosInstance";
import toast from "react-hot-toast";
import "../styles/agente.css";


const ReassignModal = ({ ticketId, agentes, onClose, onSuccess }) => {
    const [agenteDestino, setAgenteDestino] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false); // 🎯 1. Añadir estado de carga

    const confirmar = async () => {
        if (!agenteDestino) {
            toast.error("Selecciona un agente");
            return;
        }

        setIsSubmitting(true); // 🎯 2. Activar estado de carga

        try {
            await API.post(`/agent/tickets/${ticketId}/reasignar/`, {
                agente_destino: agenteDestino,
                tiempo_aceptacion: 300,
            });

            toast.success("🔄 Ticket enviado para aceptación");
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "No se pudo reasignar");
        } finally {
            setIsSubmitting(false); // 🎯 3. Desactivar estado de carga (siempre)
        }
    };

    return (
        <div className="modal">
            <div className="modal-window small">

                <div className="modal-header">
                    <h3>🔄 Reasignar Ticket</h3>
                    <button onClick={onClose} className="btn-close">✕</button>
                </div>

                <div className="modal-body">
                    <p>El agente tendrá 5 minutos para aceptar.</p>

                    <label>Seleccionar nuevo agente:</label>
                    <select
                        value={agenteDestino}
                        onChange={(e) => setAgenteDestino(e.target.value)}
                        disabled={isSubmitting} // 🎯 4. Deshabilitar mientras se envía
                    >
                        <option value="">-- Seleccionar --</option>
                        {agentes.map((ag) => (
                            <option key={ag.id} value={ag.id}>
                                {ag.username} (Carga: {ag.carga_total})
                            </option>
                        ))}
                    </select>

                    <div className="modal-actions">
                        <button
                            className="btn-primary"
                            onClick={confirmar}
                            disabled={isSubmitting || !agenteDestino} // 🎯 5. Deshabilitar botón
                        >
                            {isSubmitting ? "Reasignando..." : "Reasignar"}
                        </button>
                        <button className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
                            Cancelar
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ReassignModal;
