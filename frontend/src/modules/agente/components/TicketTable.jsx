import React from "react";
import "../styles/agente.css";

const TicketTable = ({ tickets, onOpen }) => {
    return (
        <table className="ticket-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Título</th>
                    <th>Estado</th>
                    <th>Prioridad</th>
                    <th>Solicitante</th>
                    <th>Agente</th>
                    <th></th>
                </tr>
            </thead>

            <tbody>
                {tickets.map((t) => (
                    <tr key={t.id}>
                        <td>#{t.id}</td>
                        <td>{t.titulo}</td>
                        <td><span className={`estado ${t.estado.replace(" ", "")}`}>{t.estado}</span></td>
                        <td><span className={`prioridad ${t.prioridad}`}>{t.prioridad}</span></td>
                        <td>{t.solicitante_info?.username || 'N/A'}</td>
                        <td>{t.agente_info?.username || 'N/A'}</td>

                        <td>
                            <button className="btn-secondary small" onClick={() => onOpen(t.id)}>
                                Ver
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default TicketTable;
