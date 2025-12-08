import React from "react";
import { Outlet } from "react-router-dom";
import AgentStatsPanel from "../components/AgentStatsPanel";
import useAgentTickets from "../hooks/useAgentTickets"; // Este hook ya tiene polling
import "../styles/agente.css";

const AgenteDashboard = () => {
    // El hook useAgentTickets ya tiene la lógica de polling para auto-actualizarse
    const agentData = useAgentTickets();
    const { loading, stats, ticketsAsignados, misTicketsCreados, pendientes, agentes, fetchAll, moverTicketDePendienteAAsignado, quitarTicketDeAsignados } = agentData;

    return (
        <div className="agente-dashboard">
            <AgentStatsPanel stats={stats} />

            <main className="dashboard-content">
                <Outlet context={agentData} />
            </main>
        </div>
    );
};

export default AgenteDashboard;