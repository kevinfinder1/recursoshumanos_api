// frontend/src/modules/admin/pages/AdminRotacionesPage.jsx
import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaCheckCircle, FaClock, FaExchangeAlt } from 'react-icons/fa';
import API from '../../../api/axiosInstance';
import RotacionCreateModal from '../components/rotaciones/RotacionCreateModal';
import './AdminRotacionesPage.css';

const AdminRotacionesPage = () => {
    const [rotaciones, setRotaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const fetchRotaciones = async () => {
        setLoading(true);
        try {
            const response = await API.get('/admin/rotaciones/');
            setRotaciones(response.data.results || response.data);
        } catch (error) {
            console.error("Error cargando rotaciones:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRotaciones();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("¿Estás seguro de eliminar esta rotación programada?")) {
            try {
                await API.delete(`/admin/rotaciones/${id}/`);
                fetchRotaciones();
            } catch (error) {
                console.error("Error eliminando:", error);
                alert("No se pudo eliminar la rotación.");
            }
        }
    };

    return (
        <div className="admin-page-container">
            <div className="admin-page-header">
                <div>
                    <h2><FaExchangeAlt /> Gestión de Rotaciones</h2>
                    <p className="subtitle">Programa cambios de rol automáticos y relevos de personal.</p>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    <FaPlus /> Nueva Rotación
                </button>
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="loading-state">Cargando rotaciones...</div>
                ) : rotaciones.length === 0 ? (
                    <div className="empty-state">
                        <p>No hay rotaciones programadas.</p>
                    </div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Estado</th>
                                <th>Fecha Inicio</th>
                                <th>Agente (Saliente)</th>
                                <th>Nuevo Rol</th>
                                <th>Relevo (Entrante)</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rotaciones.map((rot) => (
                                <tr key={rot.id} className={rot.ejecutada ? 'row-ejecutada' : ''}>
                                    <td>
                                        {rot.ejecutada ? (
                                            <span className="badge badge-success"><FaCheckCircle /> Ejecutada</span>
                                        ) : (
                                            <span className="badge badge-pending"><FaClock /> Pendiente</span>
                                        )}
                                    </td>
                                    <td className="font-mono">{rot.fecha_inicio}</td>
                                    <td className="font-bold">{rot.agente_nombre}</td>
                                    <td>
                                        <span className="rol-tag">{rot.rol_destino_nombre}</span>
                                    </td>
                                    <td>
                                        <span className="relevo-tag">
                                            ➡ {rot.agente_reemplazo_nombre}
                                        </span>
                                    </td>
                                    <td>
                                        {!rot.ejecutada && (
                                            <button
                                                className="btn-icon btn-delete"
                                                onClick={() => handleDelete(rot.id)}
                                                title="Cancelar rotación"
                                            >
                                                <FaTrash />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <RotacionCreateModal
                    onClose={() => setShowModal(false)}
                    onSuccess={fetchRotaciones}
                />
            )}
        </div>
    );
};

export default AdminRotacionesPage;
