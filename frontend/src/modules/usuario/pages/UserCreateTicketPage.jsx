// src/modules/usuario/pages/UserCreateTicketPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { createUserTicket } from '../../../api/userTickets';
import UserTicketForm from '../components/UserTicketForm';

export default function UserCreateTicketPage() {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (formValues) => {
        setSubmitting(true);
        setErrorMessage('');
        try {
            const newTicket = await createUserTicket(formValues);
            toast.success(`Ticket #${newTicket.id} creado exitosamente.`);

            // ✅ SOLUCIÓN: Añadir un pequeño retraso antes de redirigir.
            // Esto da tiempo al navegador a procesar el toast y evita que la siguiente
            // petición de red sea abortada durante la navegación.
            setTimeout(() => {
                navigate('/usuario');
            }, 500); // 500 milisegundos de retraso

        } catch (err) {
            const backendMessage =
                err.response?.data?.detail ||
                Object.values(err.response?.data || {}).flat().join(" ") ||
                "Error al crear el ticket.";
            setErrorMessage(backendMessage);
            toast.error(backendMessage);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="up-panel-section">
            <div className="flex justify-between items-center gap-4 mb-6 flex-wrap">
                <h1 className="up-section-title">Crear Nuevo Ticket</h1>
            </div>
            <UserTicketForm
                onSubmit={handleSubmit}
                submitting={submitting}
                errorMessage={errorMessage}
            />
        </div>
    );
}