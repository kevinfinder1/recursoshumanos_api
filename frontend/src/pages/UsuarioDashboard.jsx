import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import NotificacionesPanel from "../components/NotificacionesPanel";
import { useAuth } from "../context/AuthContext";

const UsuarioDashboard = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTicket, setEditTicket] = useState(null); // Ticket en edición

  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    prioridad: "Media",
    categoria_principal: "Nomina",
    subcategoria: "",
    archivo_adjunto: null,
  });

  const token = localStorage.getItem("access");

  // 🔹 Subcategorías según categoría
  const subcategoriasPorCategoria = {
    Nomina: [
      "Pagos",
      "Descuentos",
      "Bonos",
      "Horas extras",
      "Ascensos",
      "Justificación por permiso médico",
      "Retenciones judiciales",
      "Cambio de cuenta bancaria",
    ],
    Certificados: ["Certificado laboral", "Certificado de trabajo"],
    "Quejas de transporte": ["Retrasos/ausencias", "Mal comportamiento", "Nueva ruta", "Objetos perdidos"],
    "Cambios de EPPs": ["Solicitud de cambio", "Talla incorrecta", "Equipo defectuoso", "Falta de dotación"],
    "Renovacion de TCA": ["Vencimiento", "Reposición por pérdida", "Daño físico"],
  };

  // 🔹 Cargar tickets del usuario
  const fetchTickets = async () => {
    try {
      const { data } = await axios.get("http://localhost:8000/api/user/tickets/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ticketsArray = Array.isArray(data) ? data : data.results || [];
      setTickets(ticketsArray);
    } catch (err) {
      console.error("Error cargando tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchTickets();
  }, [token]);

  // 🔹 Manejo de inputs
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  // 🔹 Crear o actualizar ticket
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formDataToSend = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value) formDataToSend.append(key, value);
    });

    try {
      if (editTicket) {
        // Actualizar
        await axios.put(`http://localhost:8000/api/user/tickets/${editTicket.id}/`, formDataToSend, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        alert("✅ Ticket actualizado correctamente");
      } else {
        // Crear
        await axios.post("http://localhost:8000/api/user/tickets/", formDataToSend, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        alert("✅ Ticket creado correctamente");
      }

      setShowForm(false);
      setEditTicket(null);
      fetchTickets();
    } catch (err) {
      console.error("Error al guardar ticket:", err);
      alert("❌ No se pudo guardar el ticket");
    }
  };

  // 🔹 Eliminar ticket
  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este ticket?")) return;
    try {
      await axios.delete(`http://localhost:8000/api/user/tickets/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("🗑️ Ticket eliminado correctamente");
      fetchTickets();
    } catch (err) {
      alert("❌ No se pudo eliminar el ticket");
      console.error(err);
    }
  };

  // 🔹 Preparar edición
  const handleEdit = (ticket) => {
    setEditTicket(ticket);
    setShowForm(true);
    setFormData({
      titulo: ticket.titulo,
      descripcion: ticket.descripcion,
      prioridad: ticket.prioridad,
      categoria_principal: ticket.categoria_principal,
      subcategoria: ticket.subcategoria || "",
      archivo_adjunto: null,
    });
  };

  const subcategoriasDisponibles = subcategoriasPorCategoria[formData.categoria_principal] || [];

  // 🔹 Temporizador para cada ticket
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      const updatedTimes = {};
      tickets.forEach((t) => {
        if (t.puede_editar) {
          const createdAt = new Date(t.fecha_creacion);
          const secondsPassed = (Date.now() - createdAt.getTime()) / 1000;
          updatedTimes[t.id] = Math.max(0, 300 - secondsPassed);
        } else {
          updatedTimes[t.id] = 0;
        }
      });
      setTimeLeft(updatedTimes);
    }, 1000);
    return () => clearInterval(interval);
  }, [tickets]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="flex">
        {/* Panel principal */}
        <div className="flex-1 p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">🙋 Panel del Usuario</h1>
            <button
              onClick={() => {
                setShowForm(!showForm);
                setEditTicket(null);
                setFormData({
                  titulo: "",
                  descripcion: "",
                  prioridad: "Media",
                  categoria_principal: "Nomina",
                  subcategoria: "",
                  archivo_adjunto: null,
                });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md"
            >
              + Nuevo Ticket
            </button>
          </div>

          {/* Formulario de creación / edición */}
          {showForm && (
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-6 space-y-4">
              <h2 className="text-lg font-semibold mb-2">
                {editTicket ? "✏️ Editar Ticket" : "📝 Crear Ticket"}
              </h2>

              <div>
                <label className="block font-medium">Título</label>
                <input
                  type="text"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block font-medium">Descripción</label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium">Prioridad</label>
                  <select
                    name="prioridad"
                    value={formData.prioridad}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option>Baja</option>
                    <option>Media</option>
                    <option>Alta</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium">Categoría principal</label>
                  <select
                    name="categoria_principal"
                    value={formData.categoria_principal}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    {Object.keys(subcategoriasPorCategoria).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium">Subcategoría</label>
                <select
                  name="subcategoria"
                  value={formData.subcategoria}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Seleccione una subcategoría</option>
                  {subcategoriasDisponibles.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium">Archivo adjunto</label>
                <input
                  type="file"
                  name="archivo_adjunto"
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md"
                >
                  {editTicket ? "Actualizar" : "Crear Ticket"}
                </button>
              </div>
            </form>
          )}

          {/* Tabla de tickets */}
          <div className="bg-white rounded-lg shadow-md overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-200 text-gray-800">
                <tr>
                  <th className="py-3 px-4 text-left">ID</th>
                  <th className="py-3 px-4 text-left">Título</th>
                  <th className="py-3 px-4 text-left">Estado</th>
                  <th className="py-3 px-4 text-left">Agente</th>
                  <th className="py-3 px-4 text-left">Prioridad</th>
                  <th className="py-3 px-4 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length > 0 ? (
                  tickets.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{t.id}</td>
                      <td className="py-2 px-4 font-medium">{t.titulo}</td>
                      <td className="py-2 px-4">{t.estado}</td>
                      <td className="py-2 px-4">{t.agente_username || "—"}</td>
                      <td className="py-2 px-4">{t.prioridad}</td>
                      <td className="py-2 px-4 space-x-2">
                        {/* Botón editar */}
                        {t.puede_editar && (
                          <button
                            onClick={() => handleEdit(t)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs"
                          >
                            Editar
                          </button>
                        )}

                        {/* Botón eliminar */}
                        {t.puede_eliminar && (
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                          >
                            Eliminar
                          </button>
                        )}

                        {/* Temporizador */}
                        {t.puede_editar && (
                          <span className="text-xs text-gray-500 ml-2">
                            ⏱ {Math.floor(timeLeft[t.id] || 0)}s restantes
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-gray-500">
                      Aún no has creado tickets
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel de notificaciones */}
        <div className="w-96 border-l border-gray-200 bg-white p-4">
          <NotificacionesPanel />
        </div>
      </div>
    </div>
  );
};

export default UsuarioDashboard;
