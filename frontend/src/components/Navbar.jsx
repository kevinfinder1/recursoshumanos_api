import React from "react";
import { useAuth } from "../context/AuthContext";
import NotificacionesPanel from "./NotificacionesPanel";
import { toast } from "react-toastify";

const Navbar = () => {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        toast.info("👋 Sesión cerrada correctamente", {
            position: "bottom-right",
            autoClose: 3000,
            theme: "colored",
        });
    };

    return (
        <nav className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between shadow-md">
            {/* 🏷️ LOGO / TÍTULO */}
            <div className="text-xl font-bold tracking-wide">
                HR Ticketing System
            </div>

            {/* 🔔 SECCIÓN DERECHA */}
            <div className="flex items-center space-x-4">
                {/* 📢 Notificaciones */}
                <NotificacionesPanel />

                {/* 👤 Usuario actual */}
                {user && (
                    <span className="text-sm text-gray-300">
                        <strong>{user.username}</strong> ({user.role})
                    </span>
                )}

                {/* 🔒 Cerrar sesión */}
                <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200"
                >
                    Cerrar sesión
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
