// frontend/src/modules/admin/components/rotaciones/RotacionCreateModal.jsx
import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaExchangeAlt } from 'react-icons/fa';
import API from '../../../../api/axiosInstance';
import './RotacionCreateModal.css';

const RotacionCreateModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        agente: '',
        rol_destino: '',
        fecha_inicio: '',
        agente_reemplazo: ''
    });

    const [agentes, setAgentes] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Cargar listas de agentes y roles al abrir el modal
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resAgentes, resRoles] = await Promise.all([
                    API.get('/admin/agentes/'), // Asumiendo que este endpoint devuelve usuarios tipo agente
                    API.get('/admin/roles/')
                ]);
                setAgentes(resAgentes.data.results || resAgentes.data);
                setRoles(resRoles.data.results || resRoles.data);
            } catch (err) {
                console.error("Error cargando datos:", err);
                setError("No se pudieron cargar las listas de agentes o roles.");
            }
        };
        fetchData();
    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        // Validación simple frontend
        if (formData.agente === formData.agente_reemplazo) {
            setError("El agente saliente y el reemplazo no pueden ser la misma persona.");
            setLoading(false);
            return;
        }

        try {
            await API.post('/admin/rotaciones/', formData);
            onSuccess(); // Recargar la tabla padre
            onClose();   // Cerrar modal
        } catch (err) {
            console.error("Error creando rotación:", err);
            // Mostrar error del backend si existe
            const msg = err.response?.data?.detail ||
                JSON.stringify(err.response?.data) ||
                "Error al guardar la rotación.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content rotacion-modal">
                <div className="modal-header">
                    <h3><FaExchangeAlt /> Programar Nueva Rotación</h3>
                    <button className="btn-close" onClick={onClose}><FaTimes /></button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    {error && <div className="alert-error">{error}</div>}

                    <div className="form-group">
                        <label>Agente a Rotar (Saliente)</label>
                        <select
                            name="agente"
                            value={formData.agente}
                            onChange={handleChange}
                            required
                        >
                            <option value="">-- Seleccionar Agente --</option>
                            {agentes.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.username} ({a.first_name} {a.last_name})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Nuevo Rol Destino</label>
                            <select
                                name="rol_destino"
                                value={formData.rol_destino}
                                onChange={handleChange}
                                required
                            >
                                <option value="">-- Seleccionar Rol --</option>
                                {roles.map(r => (
                                    <option key={r.id} value={r.id}>{r.nombre_visible}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Fecha de Inicio (00:00 AM)</label>
                            <input
                                type="date"
                                name="fecha_inicio"
                                value={formData.fecha_inicio}
                                onChange={handleChange}
                                required
                                min={new Date().toISOString().split('T')[0]} // No permitir fechas pasadas
                            />
                        </div>
                    </div>

                    <div className="form-group highlight-group">
                        <label>Agente de Relevo (Entrante)</label>
                        <p className="help-text">
                            ⚠️ Obligatorio: Este usuario recibirá automáticamente los tickets abiertos del agente saliente.
                        </p>
                        <select
                            name="agente_reemplazo"
                            value={formData.agente_reemplazo}
                            onChange={handleChange}
                            required
                            className={formData.agente === formData.agente_reemplazo && formData.agente ? 'error-border' : ''}
                        >
                            <option value="">-- Seleccionar Relevo --</option>
                            {agentes
                                .filter(a => a.id.toString() !== formData.agente) // Excluir al agente seleccionado arriba
                                .map(a => (
                                    <option key={a.id} value={a.id}>
                                        {a.username} ({a.first_name} {a.last_name})
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn-save" disabled={loading}>
                            {loading ? 'Guardando...' : <><FaSave /> Programar Rotación</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RotacionCreateModal;
