// src/api/notifications.js
import API from "./axiosInstance";

// axiosInstance ya tiene baseURL = http://<host>/api y el interceptor que
// añade Authorization desde sessionStorage/localStorage (secure_access).

export const fetchNotifications = async () => {
    console.log("📡 Fetching notifications...");
    try {
        const { data } = await API.get("/notifications/");
        console.log("✅ Notificaciones recibidas:", data);
        console.log(`   Total: ${Array.isArray(data) ? data.length : 'no es array'}`);
        if (Array.isArray(data) && data.length > 0) {
            console.log("   Primeras 3:", data.slice(0, 3));
        }
        return data;
    } catch (err) {
        console.error("❌ Error fetching notifications:", err);
        throw err;
    }
};

export const markNotificationRead = async (id) => {
    if (!id) throw new Error("ID de notificación inválido");
    const { data } = await API.post(`/notifications/${id}/mark_read/`);
    return data;
};

export const deleteNotification = async (id) => {
    if (!id) throw new Error("ID de notificación inválido");
    const { data } = await API.delete(`/notifications/${id}/`);
    return data;
};

export const markAllRead = async () => {
    const { data } = await API.post(`/notifications/mark_all_read/`);
    return data;
};

export const clearAllNotifications = async () => {
    const { data } = await API.post(`/notifications/clear_all/`);
    return data;
};
