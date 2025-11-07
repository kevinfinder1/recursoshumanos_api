import React, { useEffect } from "react";
import { Bell } from "lucide-react";

/**
 * Componente Toast simple y elegante.
 * Se muestra en la esquina inferior derecha por unos segundos.
 */
const NotificationToast = ({ message, type = "info", onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => onClose?.(), 4500);
        return () => clearTimeout(timer);
    }, [onClose]);

    const colors = {
        info: "bg-indigo-600 text-white border-indigo-700",
        success: "bg-green-600 text-white border-green-700",
        warning: "bg-yellow-500 text-white border-yellow-600",
        error: "bg-red-600 text-white border-red-700",
    };

    const style = colors[type] || colors.info;

    return (
        <div
            className={`fixed bottom-5 right-5 z-[9999] border shadow-lg rounded-lg px-4 py-3 flex items-center gap-3 animate-slide-in ${style}`}
            role="alert"
        >
            <Bell className="w-5 h-5" />
            <p className="text-sm font-medium">{message}</p>
        </div>
    );
};

export default NotificationToast;
