import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const PrivateRoute = ({ children, allowedRoles = [] }) => {
    const { user, setUser } = useAuth();
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // 🧩 Helper para validar expiración del token
    const isTokenExpired = (token) => {
        if (!token) return true;
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            return Date.now() >= payload.exp * 1000;
        } catch {
            return true;
        }
    };

    // 🧠 Verificar y refrescar tokens (solo una vez)
    useEffect(() => {
        let isMounted = true;

        const verifyToken = async () => {
            const access = localStorage.getItem("access");
            const refresh = localStorage.getItem("refresh");

            if (!access || !refresh) {
                if (isMounted) {
                    setIsAuthenticated(false);
                    setIsChecking(false);
                }
                return;
            }

            try {
                let currentAccess = access;

                if (isTokenExpired(access)) {
                    console.log("🔄 Token expirado, intentando renovar...");
                    const response = await axios.post(
                        "http://localhost:8000/api/token/refresh/",
                        { refresh }
                    );
                    currentAccess = response.data.access;
                    localStorage.setItem("access", currentAccess);
                }

                // Obtener datos del usuario solo si no están cargados
                if (!user) {
                    const res = await axios.get("http://localhost:8000/api/user/me/", {
                        headers: { Authorization: `Bearer ${currentAccess}` },
                    });
                    if (isMounted) {
                        setUser(res.data);
                    }
                }

                if (isMounted) {
                    setIsAuthenticated(true);
                    setIsChecking(false);
                }
            } catch (error) {
                console.warn("⚠️ Error de autenticación:", error);
                localStorage.removeItem("access");
                localStorage.removeItem("refresh");
                if (isMounted) {
                    setIsAuthenticated(false);
                    setIsChecking(false);
                }
            }
        };

        verifyToken();

        return () => {
            isMounted = false;
        };
        // ✅ Solo ejecuta una vez al montar
    }, []);

    // 🕒 Estado de carga
    if (isChecking) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-lg">Verificando sesión...</p>
                </div>
            </div>
        );
    }

    // 🚫 Usuario no autenticado
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // ⏳ Esperando datos del usuario
    if (!user) return null;

    // 🧭 Verificación de roles
    if (allowedRoles.length > 0) {
        const userRole = user.role?.toLowerCase();
        const allowed = allowedRoles.map((r) => r.toLowerCase());

        if (!allowed.includes(userRole)) {
            const redirectRoutes = {
                solicitante: "/usuario",
                agente: "/agente",
                admin: "/admin",
            };
            return <Navigate to={redirectRoutes[userRole] || "/login"} replace />;
        }
    }

    // ✅ Todo correcto
    return children;
};

export default PrivateRoute;
