import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PrivateRoute = ({ children, allowedRoles = [] }) => {
    const { user, loading } = useAuth();

    // ⏳ Mientras carga la sesión
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen text-gray-700">
                <div>Cargando autenticación...</div>
            </div>
        );
    }

    // ❌ no autenticado
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // ❌ No tiene el rol permitido para ESTA ruta específica
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        // Redirigir al usuario a la página principal de SU rol
        switch (user.role) {
            case 'admin':
                return <Navigate to="/admin/dashboard" replace />;
            case 'solicitante':
                return <Navigate to="/usuario/dashboard" replace />;
            default: // Para todos los tipos de agente
                return <Navigate to="/agente/dashboard" replace />;
        }
    }

    // ✔ Autorizado: Renderiza las rutas hijas (si se usa como layout)
    // o los componentes hijos (si se usa como wrapper).
    return children ? children : <Outlet />;
};

export default PrivateRoute;
