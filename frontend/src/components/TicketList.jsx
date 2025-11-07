import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";

function TicketList({ tickets }) {
  const list = Array.isArray(tickets)
    ? tickets
    : Array.isArray(tickets?.results)
      ? tickets.results
      : [];

  if (list.length === 0) {
    return <Typography>No hay tickets disponibles.</Typography>;
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 2,
      }}
    >
      {list.map((ticket) => (
        <Card
          key={ticket.id}
          sx={{
            borderRadius: 3,
            boxShadow: 2,
            backgroundColor:
              ticket.estado === "Cerrado" ? "#f3f4f6" : "#e0f2fe",
          }}
        >
          <CardContent>
            <Typography variant="h6" fontWeight={600}>
              {ticket.titulo}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {ticket.descripcion}
            </Typography>
            <Typography sx={{ mt: 1, fontSize: 14 }}>
              <strong>Categoría:</strong> {ticket.categoria_principal}
            </Typography>
            <Typography sx={{ fontSize: 14 }}>
              <strong>Estado:</strong> {ticket.estado}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

export default TicketList;
