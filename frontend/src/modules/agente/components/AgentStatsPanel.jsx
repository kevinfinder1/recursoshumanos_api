import React from "react";
import { AlertCircle, Clock, ListChecks, CheckCircle2, Ticket } from "lucide-react";
import "../styles/agente.css";

const AgentStatsPanel = ({ stats = {}, wsConnected }) => {
    // Se calcula el total sumando las otras métricas.
    // Esto hace que el componente sea más robusto si el backend no envía 'total'.
    const totalCalculado =
        (stats.abiertos || 0) +
        (stats.pendientesAceptacion || 0) +
        (stats.enProceso || 0) +
        (stats.resueltos || 0);

    return (
        <div className="stats-panel">
            <div className="stat">
                <div className="stat-header">
                    <Ticket size={28} className="opacity-60" />
                    <h2>{stats.total || totalCalculado}</h2>
                </div>
                <span>Total</span>
            </div>

            <div className="stat rojo">
                <div className="stat-header">
                    <AlertCircle size={28} />
                    <h2>{stats.abiertos || 0}</h2>
                </div>
                <span>Abiertos</span>
            </div>

            <div className="stat amarillo">
                <div className="stat-header">
                    <Clock size={28} />
                    <h2>{stats.pendientesAceptacion || 0}</h2>
                </div>
                <span>Pendientes</span>
            </div>

            <div className="stat verde">
                <div className="stat-header">
                    <ListChecks size={28} />
                    <h2>{stats.enProceso || 0}</h2>
                </div>
                <span>En Proceso</span>
            </div>

            <div className="stat azul">
                <div className="stat-header">
                    <CheckCircle2 size={28} />
                    <h2>{stats.resueltos || 0}</h2>
                </div>
                <span>Resueltos</span>
            </div>
        </div>
    );
};

export default AgentStatsPanel;
