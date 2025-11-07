import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Zoom,
} from "@mui/material";
import { Link, useParams, useNavigate } from "react-router-dom";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import api from "../api/axiosInstance";

// 🔸 Listas de categorías
const CATEGORIAS = [
  "Nomina",
  "Certificados",
  "Quejas de transporte",
  "Cambios de EPPs",
  "Renovacion de TCA",
];

const SUBCATEGORIAS = {
  Nomina: [
    "Pagos",
    "Descuentos",
    "Bonos",
    "Horas extras",
    "Ascensos",
    "Justificación por permiso médico",
  ],
  Certificados: ["Certificado laboral", "Certificado de trabajo"],
  "Quejas de transporte": [
    "Retrasos/ausencias",
    "Mal comportamiento",
    "Nueva ruta",
    "Objetos perdidos",
  ],
  "Cambios de EPPs": [
    "Solicitud de cambio",
    "Talla incorrecta",
    "Equipo defectuoso",
    "Falta de dotación",
  ],
  "Renovacion de TCA": ["Vencimiento", "Reposición por pérdida", "Daño físico"],
};

const ESTADOS = ["Abierto", "En Proceso", "Resuelto"];
const PRIORIDADES = ["Baja", "Media", "Alta"];

const TicketDetailPage = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState("");
  const [prioridad, setPrioridad] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [openEstadoDialog, setOpenEstadoDialog] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // 🔹 Reasignación de tickets
  const [openReasignar, setOpenReasignar] = useState(false);
  const [agentes, setAgentes] = useState([]);
  const [agenteDestino, setAgenteDestino] = useState("");

  // 🔥 Colores por estado
  const getEstadoColor = (estado) => {
    switch (estado) {
      case "Abierto":
        return { color: "warning", icon: <PendingActionsIcon /> };
      case "En Proceso":
        return { color: "info", icon: <HourglassBottomIcon /> };
      case "Resuelto":
        return { color: "success", icon: <CheckCircleIcon /> };
      default:
        return { color: "default", icon: null };
    }
  };

  const getEstadosValidos = (actual) => {
    const mapa = {
      Abierto: ["En Proceso", "Resuelto"],
      "En Proceso": ["Resuelto"],
      Resuelto: [],
    };
    return mapa[actual] || [];
  };

  // 🔹 Carga del ticket
  const fetchTicket = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get(`/tickets/${ticketId}/`);
      const data = resp.data;
      setTicket(data);
      setTitulo(data.titulo);
      setDescripcion(data.descripcion);
      setEstado(data.estado);
      setPrioridad(data.prioridad);
      setCategoria(data.categoria_principal || "");
      setSubcategoria(data.subcategoria || "");
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar el ticket.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  const handleFileChange = (e) => setArchivo(e.target.files[0]);
  const toggleEdit = () => setEditMode((prev) => !prev);
  const handleCategoriaChange = (e) => {
    setCategoria(e.target.value);
    setSubcategoria("");
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("titulo", titulo);
      formData.append("descripcion", descripcion);
      formData.append("estado", estado);
      formData.append("prioridad", prioridad);
      formData.append("categoria_principal", categoria);
      formData.append("subcategoria", subcategoria);
      if (archivo) formData.append("archivo_adjunto", archivo);

      await api.put(`/tickets/${ticketId}/`, formData);
      await fetchTicket();
      setEditMode(false);
      setArchivo(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1000);
    } catch (err) {
      console.error(err);
      setError("Error al actualizar el ticket.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/tickets/${ticketId}/`);
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Error al eliminar el ticket.");
    } finally {
      setLoading(false);
      setConfirmDelete(false);
    }
  };

  const handleEstadoChange = async () => {
    if (!nuevoEstado || nuevoEstado === ticket.estado) {
      alert("Selecciona un estado diferente.");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("estado", nuevoEstado);

      await api.patch(`/tickets/${ticket.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await fetchTicket();
      setOpenEstadoDialog(false);
      setNuevoEstado("");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1000);
    } catch (err) {
      console.error(err);
      alert("No se pudo cambiar el estado.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Reasignar ticket
  const fetchAgentes = async () => {
    try {
      const res = await api.get("/users/?role=agente");
      setAgentes(res.data);
    } catch (err) {
      console.error("Error al obtener agentes", err);
    }
  };

  const handleReasignar = async () => {
    if (!agenteDestino) return alert("Selecciona un agente destino");
    try {
      await api.post("/tickets/asignaciones/", {
        ticket: ticket.id,
        agente_destino: agenteDestino,
      });
      alert("Ticket enviado para aceptación (5 min).");
      setOpenReasignar(false);
    } catch (err) {
      console.error("Error al reasignar ticket:", err);
      alert("No se pudo reasignar el ticket");
    }
  };

  // 🔹 Render
  if (loading) return <CircularProgress sx={{ mt: 4 }} />;
  if (error) return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;
  if (!ticket) return null;

  const estadoInfo = getEstadoColor(ticket.estado);

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", mt: 4, p: 2, position: "relative" }}>
      <Zoom in={showSuccess} timeout={500}>
        <Box
          sx={{
            position: "absolute",
            top: 30,
            right: 30,
            backgroundColor: "#4caf50",
            color: "white",
            borderRadius: "50%",
            p: 1.5,
            zIndex: 10,
            boxShadow: 3,
          }}
        >
          <DoneAllIcon fontSize="large" />
        </Box>
      </Zoom>

      <Button component={Link} to="/" variant="outlined" sx={{ mb: 2 }}>
        ← Volver al listado
      </Button>

      {/* 📋 Detalle del ticket */}
      {!editMode && (
        <Paper elevation={4} sx={{ p: 3 }}>
          <Typography variant="h4">{ticket.titulo}</Typography>
          <Typography variant="subtitle1" sx={{ mt: 1 }}>
            Solicitante: {ticket.solicitante_username}
          </Typography>

          <Chip
            icon={estadoInfo.icon}
            label={ticket.estado}
            color={estadoInfo.color}
            sx={{ mt: 2, fontWeight: "bold" }}
          />

          <Typography variant="subtitle2" sx={{ mt: 1 }}>
            Prioridad: {ticket.prioridad}
          </Typography>

          {ticket.categoria_principal && (
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Categoría: {ticket.categoria_principal}
              {ticket.subcategoria && ` → ${ticket.subcategoria}`}
            </Typography>
          )}

          <Typography variant="body1" sx={{ mt: 2, whiteSpace: "pre-line" }}>
            {ticket.descripcion}
          </Typography>

          {ticket.archivo_adjunto && (
            <Button
              sx={{ mt: 2 }}
              variant="contained"
              href={ticket.archivo_adjunto}
              target="_blank"
              rel="noopener noreferrer"
            >
              Descargar archivo adjunto
            </Button>
          )}

          <Box sx={{ mt: 2 }}>
            {(ticket.is_owner || (!ticket.user_is_agent && !ticket.user_is_admin)) && (
              <>
                <IconButton onClick={toggleEdit} color="primary">
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => setConfirmDelete(true)} color="error">
                  <DeleteIcon />
                </IconButton>
              </>
            )}

            {(ticket.user_is_agent || ticket.user_is_admin) && (
              <>
                <Button
                  variant="contained"
                  sx={{
                    ml: 2,
                    backgroundColor:
                      estadoInfo.color === "warning"
                        ? "#f57c00"
                        : estadoInfo.color === "info"
                        ? "#0288d1"
                        : "#2e7d32",
                  }}
                  onClick={() => setOpenEstadoDialog(true)}
                >
                  Cambiar Estado
                </Button>

                <Button
                  variant="contained"
                  sx={{ ml: 2, backgroundColor: "#6a1b9a" }}
                  onClick={() => {
                    fetchAgentes();
                    setOpenReasignar(true);
                  }}
                >
                  Reasignar Ticket
                </Button>
              </>
            )}
          </Box>
        </Paper>
      )}

      {/* 🔹 Modal cambio estado */}
      <Dialog open={openEstadoDialog} onClose={() => setOpenEstadoDialog(false)}>
        <DialogTitle>Cambiar estado del ticket</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Estado actual: <strong>{ticket.estado}</strong>
          </Typography>
          <TextField
            select
            label="Nuevo estado"
            fullWidth
            value={nuevoEstado}
            onChange={(e) => setNuevoEstado(e.target.value)}
            sx={{ mb: 2 }}
          >
            {getEstadosValidos(ticket.estado).map((estado) => (
              <MenuItem key={estado} value={estado}>
                {estado}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEstadoDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleEstadoChange}
            variant="contained"
            color="primary"
            disabled={!nuevoEstado}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🔹 Modal reasignación */}
      <Dialog open={openReasignar} onClose={() => setOpenReasignar(false)}>
        <DialogTitle>Reasignar Ticket</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Selecciona un agente"
            value={agenteDestino}
            onChange={(e) => setAgenteDestino(e.target.value)}
            sx={{ mt: 2 }}
          >
            {agentes.map((agente) => (
              <MenuItem key={agente.id} value={agente.id}>
                {agente.username}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReasignar(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleReasignar}>
            Enviar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TicketDetailPage;
