import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth debe ser usado dentro de un AuthProvider");
    }
    return context;
};

// API BASE SIN /api (muy importante)
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.50.68:8000";

/* Almacenamiento seguro */
const secureStorage = {
    set: (key, value) => {
        try {
            sessionStorage.setItem(key, value);
        } catch {
            localStorage.setItem(`secure_${key}`, value);
        }
    },
    get: (key) => {
        try {
            return (
                sessionStorage.getItem(key) ||
                localStorage.getItem(`secure_${key}`)
            );
        } catch {
            return localStorage.getItem(`secure_${key}`);
        }
    },
    remove: (key) => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(`secure_${key}`);
    },
};

/* -----------------------------------------
   🔑 Auth Provider
------------------------------------------ */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(secureStorage.get("access")); // 🎯 1. Estado para el token
    const navigate = useNavigate();

    /* -----------------------------------------
       🚀 Interceptores globales
    ------------------------------------------ */
    useEffect(() => {
        const reqInterceptor = axios.interceptors.request.use(
            (config) => {
                const token = secureStorage.get("access");
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        const resInterceptor = axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error.response?.status === 401) {
                    console.warn("⚠ Token expirado → refrescando...");
                    const newToken = await refreshAccessToken();
                    if (!newToken) {
                        logout();
                    }
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.request.eject(reqInterceptor);
            axios.interceptors.response.eject(resInterceptor);
        };
    }, []);

    /* -----------------------------------------
       ⏳ Validar expiración de token
    ------------------------------------------ */
    const isTokenExpired = (token) => {
        if (!token) return true;

        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            const buffer = 5 * 60 * 1000; // 5 minutos antes
            return Date.now() >= payload.exp * 1000 - buffer;
        } catch {
            return true;
        }
    };

    /* -----------------------------------------
       🔄 Refresh Token
    ------------------------------------------ */
    const refreshAccessToken = async () => {
        const refresh = secureStorage.get("refresh");
        if (!refresh) return null;

        try {
            const { data } = await axios.post(`${API_BASE_URL}/api/token/refresh/`, { refresh });
            secureStorage.set("access", data.access);
            setToken(data.access); // 🎯 2. Actualizar el estado del token
            return data.access;
        } catch (error) {
            return null;
        }
    };

    /* -----------------------------------------
       👤 Obtener datos del usuario logueado
    ------------------------------------------ */
    const fetchUser = async () => {
        try {
            const { data } = await axios.get(`${API_BASE_URL}/api/user/me/`);
            return data;
        } catch {
            return null;
        }
    };

    /* -----------------------------------------
       🚀 Inicializar sesión automáticamente
    ------------------------------------------ */
    useEffect(() => {
        const init = async () => {
            const access = secureStorage.get("access");
            const refresh = secureStorage.get("refresh");

            if (!access || !refresh) {
                setLoading(false);
                return;
            }

            let tokenToUse = access;

            if (isTokenExpired(access)) {
                tokenToUse = await refreshAccessToken();
                if (!tokenToUse) {
                    setLoading(false);
                    return;
                }
            }

            const userData = await fetchUser();
            if (userData) {
                setUser(userData);
                setToken(tokenToUse); // 🎯 3. Sincronizar el token en el estado
            }

            setLoading(false);
        };

        init();
    }, []);

    /* -----------------------------------------
       🔐 Login
    ------------------------------------------ */
    const login = async (username, password) => {
        try {
            const { data } = await axios.post(`${API_BASE_URL}/api/token/`, {
                username: username.trim(),
                password,
            });

            secureStorage.set("access", data.access);
            secureStorage.set("refresh", data.refresh);
            setToken(data.access); // 🎯 4. Actualizar el estado del token al hacer login

            const userData = await fetchUser();
            if (!userData) return false;

            setUser(userData);
            return true;
        } catch (error) {
            return false;
        }
    };

    /* -----------------------------------------
       🚪 Logout
    ------------------------------------------ */
    const logout = () => {
        secureStorage.remove("access");
        secureStorage.remove("refresh");
        setUser(null);
        setToken(null); // 🎯 5. Limpiar el estado del token al hacer logout
        navigate("/login", { replace: true });
    };

    /* -----------------------------------------
       🔐 Permisos por rol
    ------------------------------------------ */
    const hasPermission = (required = []) => {
        if (!user) return false;
        if (required.length === 0) return true;

        return required.includes(user.role);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                login,
                logout,
                isAuthenticated: !!user,
                token, // 🎯 6. Exponer el token en el contexto
                loading,
                hasPermission,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
