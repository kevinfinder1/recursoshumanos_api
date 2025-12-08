import React, { useState } from "react";
import API from "../../../api/axiosInstance";
import toast from "react-hot-toast";
import "../styles/agente.css";

const AcceptRejectBox = ({ data, onAcceptSuccess, onRefresh }) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const aceptar = async () => {
        setIsProcessing(true);
        try {
            // El backend ahora devuelve el ticket actualizado al aceptar
            const response = await API.post(`/agent/tickets/${data.id}/aceptar_reasignacion/`);
            toast.success("Ticket aceptado");
            // Llamar a la nueva función con el ticket aceptado
            if (onAcceptSuccess) onAcceptSuccess(response.data.ticket);
        } catch (err) {
            toast.error(err.response?.data?.error || "Error al aceptar");
        } finally {
            setIsProcessing(false);
        }
    };

    const rechazar = async () => {
        setIsProcessing(true);
        try {
            await API.post(`/agent/tickets/${data.id}/rechazar_reasignacion/`);
            toast.success("Rechazado");
            // Al rechazar, sí necesitamos un refresh completo
            if (onRefresh) onRefresh();
        } catch (err) {
            toast.error(err.response?.data?.error || "Error al rechazar");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="pendiente-item">
            <div>
                <strong>#{data.id} - {data.titulo}</strong>
                {/* 🎯 CORRECCIÓN: El nombre del agente origen no está en el ticket.
                    Mostramos un texto genérico. Para mostrar el nombre, necesitaríamos
                    combinar los datos de 'tickets' y 'asignaciones' en el hook.
                */}
                <p>Reasignado por otro agente.</p>
            </div>

            <div className="acciones">
                <button className="btn-success" onClick={aceptar} disabled={isProcessing}>
                    {isProcessing ? "..." : "Aceptar"}
                </button>
                <button className="btn-danger" onClick={rechazar} disabled={isProcessing}>
                    {isProcessing ? "..." : "Rechazar"}
                </button>
            </div>
        </div>
    );
};

export default AcceptRejectBox;
