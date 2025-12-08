import React from "react";
import { useOutletContext } from "react-router-dom";
import AcceptRejectBox from "../components/AcceptRejectBox";
import "../styles/agente.css";

const PendingAccept = () => {
    const { pendientes, moverTicketDePendienteAAsignado: onAcceptSuccess, fetchAll: onRefresh } = useOutletContext();

    // 1. Garantizar que 'pendientes' siempre sea un array para evitar errores.
    const safePendientes = Array.isArray(pendientes) ? pendientes : [];

    return (
        <div className="pendientes-box">
            {/* 2. Usar la variable segura para el contador y el mapeo. */}
            <h3>Tickets Pendientes de Aceptación ({safePendientes.length})</h3>

            {safePendientes.map((p) => (
                <AcceptRejectBox
                    key={p.id}
                    data={p}
                    onAcceptSuccess={onAcceptSuccess} // 🎯 Pasar la prop correctamente
                    onRefresh={onRefresh}
                />
            ))}
        </div>
    );
};

export default PendingAccept;
