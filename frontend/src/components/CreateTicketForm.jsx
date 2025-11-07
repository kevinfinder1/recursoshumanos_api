import React, { useState } from "react";
import {
  TextField,
  MenuItem,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import api from "../api/axiosInstance";

// 🔹 Categorías y subcategorías
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

const CreateTicketForm = ({ onTicketCreated }) => {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState("Media");
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("titulo", titulo);
      formData.append("descripcion", descripcion);
      formData.append("prioridad", prioridad);
      formData.append("categoria_principal", categoria);
      formData.append("subcategoria", subcategoria);
      if (archivo) formData.append("archivo_adjunto", archivo);

      await api.post("/tickets/", formData);
      setSuccess(true);

      // Resetear campos
      setTitulo("");
      setDescripcion("");
      setCategoria("");
      setSubcategoria("");
      setArchivo(null);
      setPrioridad("Media");

      if (onTicketCreated) onTicketCreated();
    } catch (err) {
      console.error(err);
      setError("Error al crear el ticket. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        maxWidth: 600,
        mx: "auto",
        mt: 4,
        p: 3,
        backgroundColor: "white",
        borderRadius: 3,
        boxShadow: 4,
        overflow: "visible", // 🔹 permite desplegar los menús
        position: "relative",
      }}
    >
      <Typography variant="h5" mb={2} fontWeight="bold" color="primary">
        Crear nuevo ticket
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ✅ Ticket creado correctamente
        </Alert>
      )}

      <TextField
        label="Título"
        fullWidth
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        margin="normal"
        required
      />

      <TextField
        label="Descripción"
        fullWidth
        multiline
        rows={4}
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        margin="normal"
        required
      />

      {/* 🔹 Categoría principal */}
      <TextField
        select
        label="Categoría principal"
        fullWidth
        value={categoria}
        onChange={(e) => {
          setCategoria(e.target.value);
          setSubcategoria("");
        }}
        margin="normal"
        required
        SelectProps={{
          MenuProps: {
            disablePortal: true,
            PaperProps: {
              sx: {
                borderRadius: 2,
                boxShadow: 4,
                mt: 1,
              },
            },
          },
        }}
      >
        {CATEGORIAS.map((cat) => (
          <MenuItem key={cat} value={cat}>
            {cat}
          </MenuItem>
        ))}
      </TextField>

      {/* 🔹 Subcategoría */}
      <TextField
        select
        label="Subcategoría"
        fullWidth
        value={subcategoria}
        onChange={(e) => setSubcategoria(e.target.value)}
        margin="normal"
        required
        disabled={!categoria}
        SelectProps={{
          MenuProps: {
            disablePortal: true,
            PaperProps: {
              sx: {
                borderRadius: 2,
                boxShadow: 4,
                mt: 1,
              },
            },
          },
        }}
      >
        {categoria &&
          SUBCATEGORIAS[categoria]?.map((sub) => (
            <MenuItem key={sub} value={sub}>
              {sub}
            </MenuItem>
          ))}
      </TextField>

      {/* 🔹 Prioridad */}
      <TextField
        select
        label="Prioridad"
        fullWidth
        value={prioridad}
        onChange={(e) => setPrioridad(e.target.value)}
        margin="normal"
        required
        SelectProps={{
          MenuProps: {
            disablePortal: true,
            PaperProps: {
              sx: {
                borderRadius: 2,
                boxShadow: 4,
                mt: 1,
              },
            },
          },
        }}
      >
        {["Baja", "Media", "Alta"].map((p) => (
          <MenuItem key={p} value={p}>
            {p}
          </MenuItem>
        ))}
      </TextField>

      <Button
        variant="outlined"
        component="label"
        sx={{
          mt: 2,
          borderRadius: 2,
          textTransform: "none",
        }}
      >
        Adjuntar archivo
        <input
          hidden
          type="file"
          onChange={(e) => setArchivo(e.target.files[0])}
        />
      </Button>

      <Button
        type="submit"
        variant="contained"
        fullWidth
        sx={{
          mt: 3,
          borderRadius: 2,
          py: 1.2,
          fontWeight: "bold",
          background: "linear-gradient(90deg, #4f46e5, #3b82f6)",
          "&:hover": { background: "linear-gradient(90deg, #4338ca, #2563eb)" },
        }}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : "Crear Ticket"}
      </Button>
    </Box>
  );
};

export default CreateTicketForm;
