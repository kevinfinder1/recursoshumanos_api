import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import UsuarioDashboard from "./pages/UsuarioDashboard";
import AgenteDashboard from "./pages/AgenteDashboard";
import PrivateRoute from "./routes/PrivateRoute";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Componente ProtectedRoute
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  const token = localStorage.getItem("access");

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  const { user, isAuthenticated } = useAuth();

  // 🔄 Redirigir según el rol del usuario
  const getDashboardPath = () => {
    if (!user) return "/login";
    switch (user.role?.toLowerCase()) {
      case "admin":
        return "/admin";
      case "agente":
        return "/agente";
      case "solicitante":
      case "usuario":
        return "/usuario";
      default:
        return "/login";
    }
  };

  return (
    <>
      <Routes>
        {/* 🟢 LOGIN */}
        <Route
          path="/login"
          element={
            isAuthenticated && user ? (
              <Navigate to={getDashboardPath()} replace />
            ) : (
              <LoginPage />
            )
          }
        />

        {/* 🟡 RUTAS PRIVADAS */}
        <Route
          path="/usuario"
          element={
            <ProtectedRoute>
              <PrivateRoute allowedRoles={["solicitante", "usuario"]}>
                <UsuarioDashboard />
              </PrivateRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/agente"
          element={
            <ProtectedRoute>
              <PrivateRoute allowedRoles={["agente"]}>
                <AgenteDashboard />
              </PrivateRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <PrivateRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </PrivateRoute>
            </ProtectedRoute>
          }
        />

        {/* 🔁 Redirección por defecto */}
        <Route path="/" element={<Navigate to={getDashboardPath()} replace />} />

        {/* 🔒 Captura rutas inexistentes */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <ToastContainer position="bottom-right" autoClose={2500} theme="colored" />
    </>
  );
}

export default App;
