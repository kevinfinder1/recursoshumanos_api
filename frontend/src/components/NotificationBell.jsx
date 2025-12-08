// src/components/NotificationBell.jsx
import React from "react";
import { Bell } from "lucide-react";
import { useNotificationsContext } from "../context/NotificationsContext";

const NotificationBell = ({ onClick }) => {
    const { unreadCount } = useNotificationsContext();

    return (
        <button
            type="button"
            onClick={onClick}
            className="relative inline-flex items-center justify-center p-2 rounded-full hover:bg-gray-100 transition"
        >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px]">
                    {unreadCount}
                </span>
            )}
        </button>
    );
};

export default NotificationBell;
