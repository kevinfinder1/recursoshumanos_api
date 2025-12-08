import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { editarTicket } from "../../../api/ticketsApi";
import "../styles/agente.css";

const EditTicketModal = ({ ticket, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        titulo: "",
        descripcion: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Precargar el formulario con los datos del ticket cuando el modal se abre
    useEffect(() => {
        if (ticket) {
            setFormData({
                titulo: ticket.titulo,
                descripcion: ticket.descripcion,
            });
        }
    }, [ticket]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // El backend espera el payload completo para un PUT
        const payload = { ...ticket, ...formData };

        toast.promise(
            editarTicket(ticket.id, payload),
            {
                loading: "Guardando cambios...",
                success: (response) => {
                    onSuccess(response.data); // Pasar el ticket actualizado al padre
                    onClose(); // Cerrar el modal
                    return "Ticket actualizado exitosamente.";
                },
                error: "No se pudieron guardar los cambios.",
            }
        ).finally(() => setIsSubmitting(false));
    };

    return (
        <div className="modal">
            <div className="modal-window">
                <div className="modal-header">
                    <h3>✏️ Editar Ticket</h3>
                    <button onClick={onClose} className="btn-close" disabled={isSubmitting}>✕</button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    <label>Título</label>
                    <input
                        name="titulo"
                        value={formData.titulo}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        required
                    />

                    <label>Descripción</label>
                    <textarea
                        name="descripcion"
                        value={formData.descripcion}
                        onChange={handleChange}
                        rows="5"
                        disabled={isSubmitting}
                        required
                    />

                    <div className="modal-actions">
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                        </button>
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTicketModal;