import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import NotificacionesPanel from "../components/NotificacionesPanel";
import { useAuth } from "../context/AuthContext"; // ✅ se cambia por el hook correcto

const AdminDashboard = () => {
  const { user } = useAuth(); // ✅ se usa el hook
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem("access");

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get("http://localhost:8000/api/admin/tickets/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const ticketsArray = Array.isArray(data) ? data : data.results || [];
        setTickets(ticketsArray);
      } catch (err) {
        console.error("Error cargando tickets:", err);
        setError("No se pudieron cargar los tickets.");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchTickets();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="flex">
        {/* Dashboard principal */}
        <div className="flex-1 p-8">
          <h1 className="text-2xl font-bold mb-6">📊 Panel de Administración</h1>

          {user && (
            <p className="mb-4 text-gray-600">
              Bienvenido, <span className="font-semibold">{user.username}</span>
            </p>
          )}

          {loading ? (
            <p className="text-gray-600">Cargando...</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-200 text-gray-800">
                  <tr>
                    <th className="py-3 px-4 text-left">ID</th>
                    <th className="py-3 px-4 text-left">Título</th>
                    <th className="py-3 px-4 text-left">Solicitante</th>
                    <th className="py-3 px-4 text-left">Agente</th>
                    <th className="py-3 px-4 text-left">Estado</th>
                    <th className="py-3 px-4 text-left">Prioridad</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.length > 0 ? (
                    tickets.map((t) => (
                      <tr key={t.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4">{t.id}</td>
                        <td className="py-2 px-4 font-medium">{t.titulo}</td>
                        <td className="py-2 px-4">{t.solicitante_username}</td>
                        <td className="py-2 px-4">{t.agente_username || "—"}</td>
                        <td className="py-2 px-4">{t.estado}</td>
                        <td className="py-2 px-4">{t.prioridad}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-6 text-gray-500">
                        No hay tickets registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Panel de notificaciones */}
        <div className="w-96 border-l border-gray-200 bg-white p-4">
          <NotificacionesPanel token={token} />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
