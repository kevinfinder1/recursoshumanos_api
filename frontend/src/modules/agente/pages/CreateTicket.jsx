import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import API from "../../../api/axiosInstance";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import "../styles/agente.css";

const CreateTicket = () => {
    const { agentes, fetchAll: onCreate } = useOutletContext();
    const { user } = useAuth(); // Obtenemos el usuario actual

    const [form, setForm] = useState({
        titulo: "",
        descripcion: "",
        prioridad: "Media",
        agente_destino: "",
    });
    // Aunque el componente padre ya lo asegura, es buena práctica proteger el componente.
    const safeAgentes = Array.isArray(agentes) ? agentes : [];
    // Filtramos la lista para excluir al usuario actual
    const agentesFiltrados = safeAgentes.filter(ag => ag.id !== user?.id);

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!form.titulo || !form.descripcion || !form.agente_destino) {
            toast.error("Completa todos los campos");
            setLoading(false);
            return;
        }

        try {
            console.log("📤 Enviando ticket...");

            const payload = {
                titulo: form.titulo.trim(),
                descripcion: form.descripcion.trim(),
                prioridad: form.prioridad,
                agente_destino: parseInt(form.agente_destino)
            };

            console.log("📦 Payload:", payload);

            // 🎯 CAMBIA ESTA LÍNEA - usa el NUEVO endpoint
            const response = await API.post("/agent/tickets/crear-rapido/", payload);

            console.log("✅ Ticket creado exitosamente:", response.data);
            toast.success("🎉 Ticket creado exitosamente");

            setForm({
                titulo: "",
                descripcion: "",
                prioridad: "Media",
                agente_destino: "",
            });

            // 🎯 PASAR EL TICKET NUEVO A LA FUNCIÓN ONCREATE
            if (onCreate && response.data.ticket) {
                onCreate(response.data.ticket);
            }

        } catch (err) {
            console.error("❌ Error creando ticket:", err);

            if (err.response?.data) {
                const errorData = err.response.data;
                console.error("📋 Error del backend:", errorData);

                if (errorData.error) {
                    toast.error(errorData.error);
                } else {
                    toast.error("Error al crear el ticket");
                }
            } else {
                toast.error("Error de conexión");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="crear-ticket-card">
            <h3>📝 Crear Ticket</h3>

            {agentesFiltrados.length === 0 && (
                <div className="warning-message">
                    ⚠️ No hay otros agentes disponibles para asignar
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <label>Título *</label>
                <input
                    name="titulo"
                    value={form.titulo}
                    onChange={handleChange}
                    placeholder="Ej: Solicitud de permisos"
                    disabled={loading}
                    required
                />

                <label>Descripción *</label>
                <textarea
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleChange}
                    rows="4"
                    placeholder="Describe detalladamente el problema o solicitud"
                    disabled={loading}
                    required
                />

                <label>Prioridad *</label>
                <select
                    name="prioridad"
                    value={form.prioridad}
                    onChange={handleChange}
                    disabled={loading}
                    required
                >
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                </select>

                <label>Asignar a: *</label>
                <select
                    name="agente_destino"
                    value={form.agente_destino}
                    onChange={handleChange}
                    disabled={loading || agentesFiltrados.length === 0}
                    required
                >
                    <option value="">-- Seleccione agente --</option>
                    {agentesFiltrados.map((ag) => (
                        <option
                            key={ag.id}
                            value={ag.id}
                            title={`Email: ${ag.email || 'N/A'} | Carga: ${ag.carga_trabajo || 'N/A'}`}
                        >
                            {ag.username}
                        </option>
                    ))}
                </select>

                <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading || agentesFiltrados.length === 0}
                >
                    {loading ? "Creando..." : "Crear Ticket"}
                </button>
            </form>
        </div>
    );
};

export default CreateTicket;