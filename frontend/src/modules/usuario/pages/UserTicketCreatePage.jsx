// src/pages/solicitante/UserTicketCreatePage.jsx
import React, { useState } from "react";
import { PlusCircle } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { toast } from "react-hot-toast";
import UserTicketForm from "../components/UserTicketForm";
import { createUserTicket } from "../../../api/userTickets";
import "../styles/userPanel.css";

export default function UserTicketCreatePage() {
    const navigate = useNavigate();
    const { reload } = useOutletContext();
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (formValues) => {
        setSubmitting(true);
        try {
            const created = await createUserTicket(formValues);
            toast.success("Ticket creado con éxito.");
            if (reload) {
                reload();
            }
            navigate(`/usuario/tickets/${created.id}`);
        } catch (err) {
            console.error(err);
            const backendMessage =
                err.response?.data?.detail ||
                Object.values(err.response?.data || {}).flat().join(" ") ||
                "Error al crear el ticket.";
            toast.error(backendMessage);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="up-panel-section">
            <div className="flex items-center gap-3 mb-6">
                <PlusCircle className="w-6 h-6 text-red-400" />
                <h1 className="up-section-title">Nuevo Ticket</h1>
            </div>

            <UserTicketForm
                onSubmit={handleSubmit}
                submitting={submitting}
            />
        </div>
    );
}
