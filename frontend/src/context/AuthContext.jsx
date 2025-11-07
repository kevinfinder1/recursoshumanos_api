import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // ✅ importa esto

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate(); // ✅ instancia de navegación

    const isTokenExpired = (token) => {
        if (!token) return true;
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            return Date.now() >= payload.exp * 1000;
        } catch {
            return true;
        }
    };

    const refreshAccessToken = async () => {
        const refresh = localStorage.getItem("refresh");
        if (!refresh) return null;
        try {
            const response = await axios.post("http://localhost:8000/api/token/refresh/", { refresh });
            const newAccess = response.data.access;
            localStorage.setItem("access", newAccess);
            console.log("🔄 Token renovado correctamente");
            return newAccess;
        } catch (err) {
            console.warn("⚠️ Error al refrescar token:", err);
            logout();
            return null;
        }
    };

    const fetchUserByAccess = async (accessToken) => {
        const endpoints = [
            "http://localhost:8000/api/user/me/",
            "http://localhost:8000/api/users/me/",
            "http://localhost:8000/api/users/current/",
            "http://localhost:8000/api/auth/user/"
        ];

        for (const url of endpoints) {
            try {
                const res = await axios.get(url, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (res?.data) return res.data;
            } catch (err) {
                if (err?.response?.status !== 404) {
                    console.warn(`⚠️ Error al consultar ${url}:`, err);
                }
            }
        }
        return null;
    };

    useEffect(() => {
        const initAuth = async () => {
            const access = localStorage.getItem("access");
            const refresh = localStorage.getItem("refresh");

            if (!access || !refresh) {
                console.log("🚫 No hay tokens almacenados");
                setUser(null);
                setLoading(false);
                return;
            }

            let currentAccess = access;

            if (isTokenExpired(access)) {
                console.log("⏳ Token expirado, intentando renovar...");
                currentAccess = await refreshAccessToken();
                if (!currentAccess) {
                    setUser(null);
                    setLoading(false);
                    return;
                }
            }

            try {
                const userData = await fetchUserByAccess(currentAccess);
                if (!userData) {
                    console.warn("⚠️ No se encontró endpoint válido para obtener el usuario");
                    logout();
                    setLoading(false);
                    return;
                }
                setUser(userData);
                localStorage.setItem("user", JSON.stringify(userData));
                console.log("✅ Usuario restaurado:", userData.username);
            } catch (err) {
                console.warn("⚠️ Error al cargar usuario:", err);
                logout();
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async (username, password) => {
        try {
            const response = await axios.post("http://localhost:8000/api/token/", {
                username,
                password,
            });

            const { access, refresh } = response.data;
            localStorage.setItem("access", access);
            localStorage.setItem("refresh", refresh);

            const userData = await fetchUserByAccess(access);
            if (!userData) {
                console.warn("⚠️ No se pudo obtener datos de usuario tras login");
                return false;
            }

            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));

            console.log("✅ Sesión iniciada como:", userData.username);
            return true;
        } catch (err) {
            console.error("❌ Error de login:", err);
            return false;
        }
    };

    // 🔴 Logout mejorado
    const logout = () => {
        console.log("🚪 Cerrando sesión...");
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("user");
        setUser(null);
        navigate("/login", { replace: true }); // ✅ redirige al login inmediatamente
    };

    const value = {
        user,
        setUser,
        login,
        logout,
        isAuthenticated: !!user,
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-100 text-gray-700">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800 mx-auto mb-3"></div>
                    <p>Verificando sesión...</p>
                </div>
            </div>
        );
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
