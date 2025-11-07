import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import NotificacionesPanel from "../components/NotificacionesPanel";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

const AgenteDashboard = () => {
  const { user } = useAuth();
  const token = localStorage.getItem("access");

  // Estado principal
  const [tickets, setTickets] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Creación
  const [nuevoTicket, setNuevoTicket] = useState({
    titulo: "",
    descripcion: "",
    prioridad: "Media",
    agente_destino: "",
  });

  // Detalle/modal
  const [detallesTicket, setDetallesTicket] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [mostrarModalDetalles, setMostrarModalDetalles] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState("");

  // Chat
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [escribiendo, setEscribiendo] = useState(null);

  // Reasignación
  const [mostrarModalReasignar, setMostrarModalReasignar] = useState(false);
  const [nuevoAgenteId, setNuevoAgenteId] = useState("");

  // WebSockets
  const [isWsNotifConnected, setIsWsNotifConnected] = useState(false);
  const wsNotifRef = useRef(null);
  const wsChatRef = useRef(null);

  // Utilidades
  const mensajesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Funciones de fetch separadas para evitar dependencias circulares
  const fetchTickets = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(
        "http://localhost:8000/api/agent/tickets/",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTickets(Array.isArray(data) ? data : data.results || []);
    } catch (e) {
      console.error("Error al cargar tickets:", e);
      toast.error("Error al cargar tickets");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchMensajes = useCallback(async (ticketId) => {
    if (!token || !ticketId) return;
    try {
      const { data } = await axios.get(
        `http://localhost:8000/api/agent/tickets/${ticketId}/mensajes/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMensajes(data.mensajes || []);
    } catch (err) {
      console.error("Error al actualizar mensajes:", err);
    }
  }, [token]);

  const fetchAgentes = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(
        "http://localhost:8000/api/agent/agentes_disponibles/",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAgentes(data.agentes || []);
    } catch (e) {
      console.error("No se pudieron cargar agentes:", e);
    }
  }, [token]);

  // WebSocket de notificaciones
  useEffect(() => {
    if (!token) return;

    const url = `ws://localhost:8000/ws/notifications/?token=${token}`;
    const sock = new WebSocket(url);
    wsNotifRef.current = sock;

    sock.onopen = () => {
      setIsWsNotifConnected(true);
      sock.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
    };

    sock.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const payload = data.type ? data : data.content || {};

        if ((payload.type || "") === "notification") {
          const msg = payload.message || "Nueva notificación";
          toast.success(msg, { duration: 3500 });

          if (payload.accion === "ticket_eliminado") {
            setTickets((prev) =>
              prev.filter((t) => String(t.id) !== String(payload.ticket_id))
            );
          } else {
            fetchTickets();
          }

          // Actualizar mensajes si el modal está abierto
          if (
            detallesTicket &&
            String(detallesTicket.id) === String(payload.ticket_id)
          ) {
            fetchMensajes(detallesTicket.id);
          }
        }
      } catch (err) {
        console.error("WS notif parse error:", err);
      }
    };

    sock.onerror = (err) => {
      console.error("WebSocket error:", err);
      setIsWsNotifConnected(false);
    };

    sock.onclose = () => {
      console.log("WebSocket cerrado");
      setIsWsNotifConnected(false);
    };

    return () => {
      if (sock.readyState === WebSocket.OPEN) {
        sock.close(1000, "unmount");
      }
    };
  }, [token, detallesTicket, fetchTickets, fetchMensajes]);

  // Cargar datos iniciales
  useEffect(() => {
    if (token) {
      fetchTickets();
      fetchAgentes();
    }
  }, [token, fetchTickets, fetchAgentes]);

  // WebSocket de chat
  const openChatSocket = useCallback((ticketId) => {
    if (!token) return;

    // Cerrar socket anterior si existe
    if (wsChatRef.current) {
      if (wsChatRef.current.readyState === WebSocket.OPEN) {
        wsChatRef.current.close(1000, "switch ticket");
      }
      wsChatRef.current = null;
    }

    const url = `ws://localhost:8000/ws/tickets/${ticketId}/?token=${token}`;
    const sock = new WebSocket(url);
    wsChatRef.current = sock;

    sock.onopen = () => {
      console.log(`Chat WebSocket conectado para ticket ${ticketId}`);
    };

    sock.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.type === "typing") {
          setEscribiendo(data.autor || "alguien");
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setEscribiendo(null), 1800);
          return;
        }

        if (data.type === "chat_message") {
          const autor =
            data.autor_username || data.autor || data.message?.autor_username || "Desconocido";
          const contenido = data.message?.contenido || data.contenido || "";
          const fecha =
            data.message?.fecha_envio || data.fecha_envio || new Date().toISOString();

          setMensajes((prev) => [
            ...prev,
            {
              autor,
              autor_username: autor,
              contenido,
              fecha_envio: fecha,
            },
          ]);
        }
      } catch (err) {
        console.error("Error parseando mensaje de chat:", err);
      }
    };

    sock.onerror = (err) => {
      console.error("Error en chat WebSocket:", err);
    };

    sock.onclose = () => {
      console.log("Chat WebSocket cerrado");
    };
  }, [token]);

  // Crear ticket
  const handleCrearTicket = async (e) => {
    e.preventDefault();
    const { titulo, descripcion, prioridad, agente_destino } = nuevoTicket;

    if (!titulo || !descripcion || !agente_destino) {
      toast.error("Completa todos los campos");
      return;
    }

    try {
      await axios.post(
        "http://localhost:8000/api/agent/tickets/",
        { titulo, descripcion, prioridad, agente: agente_destino },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Ticket creado");
      setNuevoTicket({
        titulo: "",
        descripcion: "",
        prioridad: "Media",
        agente_destino: "",
      });
      fetchTickets();
    } catch (e) {
      console.error("Error al crear ticket:", e);
      toast.error("No se pudo crear el ticket");
    }
  };

  // Ver ticket
  const handleVerTicket = async (id) => {
    try {
      const [tRes, hRes, mRes] = await Promise.all([
        axios.get(`http://localhost:8000/api/agent/tickets/${id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`http://localhost:8000/api/agent/tickets/${id}/historial/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`http://localhost:8000/api/agent/tickets/${id}/mensajes/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setDetallesTicket(tRes.data);
      setHistorial(hRes.data || []);
      setMensajes(mRes.data?.mensajes || []);
      setNuevoEstado(tRes.data?.estado || "");
      setMostrarModalDetalles(true);
      openChatSocket(id);
    } catch (e) {
      console.error("Error al abrir ticket:", e);
      toast.error("No se pudo abrir el ticket");
    }
  };

  // Enviar mensaje
  const handleEnviarMensaje = () => {
    const text = (nuevoMensaje || "").trim();
    if (!text || !wsChatRef.current || wsChatRef.current.readyState !== WebSocket.OPEN) {
      if (!text) toast.error("Escribe un mensaje");
      else toast.error("WebSocket no conectado");
      return;
    }

    try {
      wsChatRef.current.send(JSON.stringify({ contenido: text }));
      setNuevoMensaje("");
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      toast.error("Error al enviar mensaje");
    }
  };

  // Typing indicator
  const handleTyping = () => {
    if (!wsChatRef.current || wsChatRef.current.readyState !== WebSocket.OPEN) return;
    try {
      wsChatRef.current.send(
        JSON.stringify({ type: "typing", autor: user?.username || "usuario" })
      );
    } catch (err) {
      console.error("Error al enviar typing:", err);
    }
  };

  // Scroll automático
  const scrollToBottom = () => {
    mensajesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensajes]);

  // Cambiar estado
  const handleCambiarEstado = async () => {
    if (!detallesTicket?.id) return;
    try {
      await axios.post(
        `http://localhost:8000/api/agent/tickets/${detallesTicket.id}/cambiar_estado/`,
        { estado: nuevoEstado },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Estado actualizado");
      setMostrarModalDetalles(false);
      fetchTickets();
    } catch (e) {
      console.error("Error al cambiar estado:", e);
      toast.error("No se pudo cambiar el estado");
    }
  };

  // Reasignar
  const abrirReasignar = () => {
    setNuevoAgenteId("");
    setMostrarModalReasignar(true);
  };

  const confirmarReasignar = async () => {
    if (!detallesTicket?.id || !nuevoAgenteId) {
      toast.error("Selecciona un agente");
      return;
    }
    try {
      await axios.post(
        `http://localhost:8000/api/agent/tickets/${detallesTicket.id}/reasignar_ticket/`,
        { nuevo_agente: nuevoAgenteId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Ticket reasignado");
      setMostrarModalReasignar(false);
      fetchTickets();
    } catch (e) {
      console.error("Error al reasignar:", e);
      toast.error("No se pudo reasignar");
    }
  };

  // Eliminar
  const handleEliminarTicket = async (id) => {
    const result = await Swal.fire({
      title: "¿Eliminar ticket?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(
        `http://localhost:8000/api/agent/tickets/${id}/eliminar_ticket/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Ticket eliminado");
      setTickets((prev) => prev.filter((t) => String(t.id) !== String(id)));
      if (detallesTicket?.id === id) {
        setMostrarModalDetalles(false);
      }
    } catch (e) {
      console.error("Error al eliminar:", e);
      toast.error("No se pudo eliminar");
    }
  };

  // Limpiar WebSocket de chat al cerrar modal
  useEffect(() => {
    if (!mostrarModalDetalles && wsChatRef.current) {
      if (wsChatRef.current.readyState === WebSocket.OPEN) {
        wsChatRef.current.close(1000, "modal closed");
      }
      wsChatRef.current = null;
    }
  }, [mostrarModalDetalles]);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <Navbar />

      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold" }}>
          👨‍💼 Panel del Agente — {user?.username}
        </h1>
        <div style={{ marginTop: "10px", padding: "10px", background: "#f0f0f0", borderRadius: "5px" }}>
          Estado WebSocket: {isWsNotifConnected ? "✅ Conectado" : "❌ Desconectado"}
        </div>
      </div>

      <hr />

      <h2 style={{ fontSize: "22px", marginTop: "20px" }}>➕ Crear Ticket</h2>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Título: </label>
          <input
            type="text"
            value={nuevoTicket.titulo}
            onChange={(e) =>
              setNuevoTicket({ ...nuevoTicket, titulo: e.target.value })
            }
            style={{ width: "100%", padding: "8px", fontSize: "14px" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Descripción: </label>
          <textarea
            rows={3}
            value={nuevoTicket.descripcion}
            onChange={(e) =>
              setNuevoTicket({ ...nuevoTicket, descripcion: e.target.value })
            }
            style={{ width: "100%", padding: "8px", fontSize: "14px" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Prioridad: </label>
          <select
            value={nuevoTicket.prioridad}
            onChange={(e) =>
              setNuevoTicket({ ...nuevoTicket, prioridad: e.target.value })
            }
            style={{ width: "100%", padding: "8px", fontSize: "14px" }}
          >
            <option>Baja</option>
            <option>Media</option>
            <option>Alta</option>
          </select>
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Asignar a: </label>
          <select
            value={nuevoTicket.agente_destino}
            onChange={(e) =>
              setNuevoTicket({ ...nuevoTicket, agente_destino: e.target.value })
            }
            style={{ width: "100%", padding: "8px", fontSize: "14px" }}
          >
            <option value="">-- Selecciona agente --</option>
            {agentes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.username} {a.carga_trabajo ? `(${a.carga_trabajo})` : ""}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleCrearTicket}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          Crear
        </button>
      </div>

      <hr />

      <h2 style={{ fontSize: "22px", marginTop: "20px" }}>🎟️ Mis Tickets</h2>
      {loading ? (
        <p>Cargando...</p>
      ) : tickets.length === 0 ? (
        <p>No hay tickets.</p>
      ) : (
        <table border="1" cellPadding="8" cellSpacing="0" style={{ width: "100%", marginTop: "10px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0" }}>
              <th>ID</th>
              <th>Título</th>
              <th>Estado</th>
              <th>Prioridad</th>
              <th>Solicitante</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.titulo}</td>
                <td>{t.estado}</td>
                <td>{t.prioridad}</td>
                <td>{t.solicitante_username || t.solicitante || "-"}</td>
                <td>
                  <button
                    onClick={() => handleVerTicket(t.id)}
                    style={{ marginRight: "5px", padding: "5px 10px", cursor: "pointer" }}
                  >
                    Ver
                  </button>
                  {String(t.solicitante) === String(user?.id) && (
                    <button
                      onClick={() => handleEliminarTicket(t.id)}
                      style={{ padding: "5px 10px", cursor: "pointer", backgroundColor: "#f44336", color: "white", border: "none" }}
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal Detalles */}
      {mostrarModalDetalles && detallesTicket && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "white",
            border: "2px solid #333",
            padding: "20px",
            zIndex: 1000,
            maxWidth: "800px",
            width: "90%",
            maxHeight: "80vh",
            overflowY: "auto",
            boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
            <h3 style={{ margin: 0 }}>
              Ticket #{detallesTicket.id} — {detallesTicket.titulo}
            </h3>
            <button
              onClick={() => setMostrarModalDetalles(false)}
              style={{
                padding: "5px 10px",
                cursor: "pointer",
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "3px"
              }}
            >
              ✕
            </button>
          </div>

          <p><b>Descripción:</b> {detallesTicket.descripcion}</p>
          <p><b>Estado actual:</b> {detallesTicket.estado}</p>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "inline-block", marginRight: "10px" }}>Cambiar estado: </label>
            <select
              value={nuevoEstado}
              onChange={(e) => setNuevoEstado(e.target.value)}
              style={{ padding: "5px", marginRight: "10px" }}
            >
              <option value="Pendiente">Pendiente</option>
              <option value="En Proceso">En Proceso</option>
              <option value="Resuelto">Resuelto</option>
            </select>
            <button
              onClick={handleCambiarEstado}
              style={{ padding: "5px 15px", cursor: "pointer" }}
            >
              Guardar
            </button>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <button
              onClick={abrirReasignar}
              style={{ padding: "5px 15px", cursor: "pointer", marginRight: "10px" }}
            >
              Reasignar
            </button>
            {String(detallesTicket.solicitante) === String(user?.id) && (
              <button
                onClick={() => handleEliminarTicket(detallesTicket.id)}
                style={{ padding: "5px 15px", cursor: "pointer", backgroundColor: "#f44336", color: "white", border: "none" }}
              >
                Eliminar
              </button>
            )}
          </div>

          <hr />
          <h4>Historial</h4>
          {historial.length === 0 ? (
            <p>Sin historial</p>
          ) : (
            <ul>
              {historial.map((h, i) => (
                <li key={i}>
                  {h.fecha} — {h.usuario_username || h.usuario} — {h.accion} — {h.descripcion}
                </li>
              ))}
            </ul>
          )}

          <hr />
          <h4>Chat</h4>
          <div
            style={{
              border: "1px solid #ddd",
              padding: "10px",
              height: "250px",
              overflowY: "auto",
              backgroundColor: "#fafafa",
              marginBottom: "10px"
            }}
          >
            {mensajes.length === 0 ? (
              <p>No hay mensajes.</p>
            ) : (
              mensajes.map((m, idx) => {
                const autor =
                  m.autor_username ||
                  m.autor ||
                  m?.message?.autor_username ||
                  "Desconocido";
                const contenido = m.contenido || m?.message?.contenido || "";
                const fecha = m.fecha_envio || m?.message?.fecha_envio || new Date().toISOString();
                const yo = String(autor) === String(user?.username);

                return (
                  <div
                    key={idx}
                    style={{
                      textAlign: yo ? "right" : "left",
                      margin: "8px 0",
                      padding: "8px",
                      backgroundColor: yo ? "#e3f2fd" : "#f5f5f5",
                      borderRadius: "5px"
                    }}
                  >
                    <div>
                      <b>{yo ? "Tú" : autor}</b>{" "}
                      <small>{new Date(fecha).toLocaleString()}</small>
                    </div>
                    <div>{contenido}</div>
                  </div>
                );
              })
            )}
            {escribiendo && (
              <div style={{ fontStyle: "italic", color: "#666", marginTop: "8px" }}>
                ✍️ {escribiendo} está escribiendo...
              </div>
            )}
            <div ref={mensajesEndRef} />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              placeholder="Escribe un mensaje..."
              value={nuevoMensaje}
              onChange={(e) => {
                setNuevoMensaje(e.target.value);
                handleTyping();
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleEnviarMensaje();
                }
              }}
              style={{ flex: 1, padding: "8px" }}
            />
            <button
              onClick={handleEnviarMensaje}
              style={{ padding: "8px 20px", cursor: "pointer" }}
            >
              Enviar
            </button>
          </div>
        </div>
      )}

      {/* Modal Reasignar */}
      {mostrarModalReasignar && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "white",
            border: "2px solid #333",
            padding: "20px",
            zIndex: 1001,
            boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
          }}
        >
          <h3>Reasignar Ticket #{detallesTicket?.id}</h3>
          <div style={{ marginBottom: "15px" }}>
            <select
              value={nuevoAgenteId}
              onChange={(e) => setNuevoAgenteId(e.target.value)}
              style={{ width: "100%", padding: "8px" }}
            >
              <option value="">-- Selecciona agente --</option>
              {agentes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.username} {a.carga_trabajo ? `(${a.carga_trabajo})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={confirmarReasignar}
              style={{ flex: 1, padding: "8px", cursor: "pointer" }}
            >
              Reasignar
            </button>
            <button
              onClick={() => setMostrarModalReasignar(false)}
              style={{ flex: 1, padding: "8px", cursor: "pointer" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Fondo oscuro para modales */}
      {(mostrarModalDetalles || mostrarModalReasignar) && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 999
          }}
          onClick={() => {
            setMostrarModalDetalles(false);
            setMostrarModalReasignar(false);
          }}
        />
      )}

      <hr style={{ marginTop: "30px" }} />
      <div>
        <NotificacionesPanel />
      </div>
    </div>
  );
};

export default AgenteDashboard;