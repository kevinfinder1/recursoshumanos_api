// src/pages/solicitante/UserTicketEditPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil } from "lucide-react";
import { toast } from "react-hot-toast";
import UserTicketForm from "../components/UserTicketForm";
import { updateUserTicket } from "../../../api/userTickets";
import { useUserTicketDetail } from "../hooks/useUserTickets";
import "../styles/userPanel.css";

export default function UserTicketEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { ticket, loading, error } = useUserTicketDetail(id);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (ticket && !ticket.puede_editar) {
            toast.error(
                "Ya no puedes editar este ticket. El tiempo de edición expiró o cambió de estado."
            );
            navigate(`/usuario/tickets/${id}`);
        }
    }, [ticket, id, navigate]);

    const handleSubmit = async (formValues) => {
        if (!ticket?.puede_editar) {
            toast.error("No puedes editar este ticket. El backend no lo permite.");
            return;
        }

        setSubmitting(true);
        try {
            await updateUserTicket(id, formValues);
            toast.success("Ticket actualizado correctamente.");
            navigate(`/usuario/tickets/${id}`);
        } catch (err) {
            console.error(err);
            const backendMessage =
                err.response?.data?.detail ||
                Object.values(err.response?.data || {}).flat().join(" ") ||
                "Error al actualizar el ticket.";
            toast.error(backendMessage);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <p className="text-muted">Cargando ticket...</p>;
    if (error || !ticket) return <div className="up-error-box">{error || "Ticket no encontrado."}</div>;

    // Renderiza el formulario solo si hay un ticket y se puede editar
    return (
        <div className="up-panel-section">
            <div className="flex items-center gap-3 mb-6">
                <Pencil className="w-6 h-6 text-red-400" />
                <h1 className="up-section-title">Editar Ticket #{ticket.id}</h1>
            </div>

            <UserTicketForm
                initialValues={{
                    titulo: ticket.titulo,
                    descripcion: ticket.descripcion,
                    prioridad: ticket.prioridad,
                    categoria_principal: ticket.categoria_principal,
                    subcategoria: ticket.subcategoria,
                }}
                onSubmit={handleSubmit}
                submitting={submitting}
                mode="edit"
            />
        </div>
    );
}
