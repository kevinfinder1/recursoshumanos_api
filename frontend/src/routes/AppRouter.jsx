// AppRouter.jsx
import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

import ChatPage from "../pages/ChatPage"; // 👈 AÑADIR ESTA LÍNEA
import LoginPage from "../pages/LoginPage";
import NotFound from "../components/NotFound";

// Módulos Usuario
import UsuarioDashboard from "../modules/usuario/pages/Dashboard";
import UserTicketListPage from "../modules/usuario/pages/UserTicketListPage";
import UserTicketCreatePage from "../modules/usuario/pages/UserTicketCreatePage";
import UserTicketDetailPage from "../modules/usuario/pages/UserTicketDetailPage";
import UserTicketEditPage from "../modules/usuario/pages/UserTicketEditPage";

// Módulo Agente
import AgenteDashboard from "../modules/agente/pages/Dashboard";
import AgentTicketList from "../modules/agente/pages/TicketList";
import AgentCreateTicket from "../modules/agente/pages/CreateTicket";
import AgentPendingAccept from "../modules/agente/pages/PendingAccept";
import AgentTicketDetailPage from "../modules/agente/pages/TicketDetailPage";
import MyCreatedTickets from "../modules/agente/pages/MyCreatedTickets";

// Módulo Admin - NUEVAS IMPORTACIONES
import AdminLayout from "../modules/admin/components/layout/AdminLayout";
import AdminDashboard from "../modules/admin/pages/Dashboard";
import UsersListPage from "../modules/admin/pages/UsersListPage";
import CategoriesListPage from "../modules/admin/pages/CategoriesListPage";
import TicketsListPage from "../modules/admin/pages/TicketsListPage";
import ReportsPage from "../modules/admin/pages/ReportsPage";
import ConfiguracionPage from "../modules/admin/pages/ConfiguracionPage";
import AdminRotacionesPage from "../modules/admin/pages/AdminRotacionesPage";

import PrivateRoute from "./PrivateRoute";

const AppRouter = () => {
    return (
        <Routes>
            {/* Login */}
            <Route path="/login" element={<LoginPage />} />

            {/* ------------------------ */}
            {/*      MÓDULO USUARIO      */}
            {/* ------------------------ */}
            <Route
                path="/usuario/*"
                element={
                    <PrivateRoute allowedRoles={["solicitante"]}><UsuarioDashboard /></PrivateRoute>
                }
            >
                {/* El Outlet en UsuarioDashboard renderizará esto en /usuario/ */}
                {/* Puedes crear un componente simple que muestre las métricas */}
                <Route index element={<UserTicketListPage />} />

                {/* Lista */}
                <Route path="tickets" element={<UserTicketListPage />} />

                {/* Crear */}
                <Route path="tickets/nuevo" element={<UserTicketCreatePage />} />

                {/* Detalle */}
                <Route path="tickets/:id" element={<UserTicketDetailPage />} />

                {/* ⭐ CHAT AQUÍ */}
                <Route path="chat" element={<ChatPage />} />
            </Route>

            {/* ------------------------ */}
            {/*       MÓDULO AGENTE      */}
            {/* ------------------------ */}
            <Route
                path="/agente/*"
                element={
                    <PrivateRoute
                        allowedRoles={[
                            "agente", "agente_nomina", "agente_transporte",
                            "agente_certificados", "agente_epps", "agente_tca",
                            "agente_general", "admin"
                        ]}
                    >
                        <AgenteDashboard />
                    </PrivateRoute>
                }
            >
                {/* Rutas anidadas para el agente */}
                {/* La ruta /agente/ mostrará la lista de tickets por defecto */}
                <Route index element={<AgentTicketList />} />
                <Route path="tickets/nuevo" element={<AgentCreateTicket />} />
                <Route path="tickets/pendientes" element={<AgentPendingAccept />} />
                <Route path="tickets/creados" element={<MyCreatedTickets />} />
                <Route path="tickets" element={<AgentTicketList />} />
                <Route path="tickets/:id" element={<AgentTicketDetailPage />} />

                {/* ⭐ CHAT AQUÍ */}
                <Route path="chat" element={<ChatPage />} />
            </Route>

            {/* ------------------------ */}
            {/*       MÓDULO ADMIN       */}
            {/* ------------------------ */}
            <Route
                path="/admin/*"
                element={
                    <PrivateRoute allowedRoles={["admin"]}>
                        <AdminLayout />
                    </PrivateRoute>
                }
            >
                {/* Redirección al dashboard */}
                <Route index element={<Navigate to="dashboard" replace />} />

                {/* Dashboard */}
                <Route path="dashboard" element={<AdminDashboard />} />

                {/* Gestión de Usuarios */}
                <Route path="usuarios" element={<UsersListPage />} />

                {/* Gestión de Categorías */}
                <Route path="categorias" element={<CategoriesListPage />} />

                {/* Gestión de Rotaciones */}
                <Route path="rotaciones" element={<AdminRotacionesPage />} />

                {/* Gestión de Tickets */}
                <Route path="tickets" element={<TicketsListPage />} />

                {/* Reportes */}
                <Route path="reportes" element={<ReportsPage />} />

                {/* Configuración */}
                <Route path="configuracion" element={<ConfiguracionPage />} />

                {/* Chat */}
                <Route path="chat" element={<ChatPage />} />
            </Route>

            {/* Redirect root */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Not found */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

export default AppRouter;