// src/api/notifications.js
import axios from "axios";

const API_BASE = "http://192.168.50.68:8000/api";

const authHeaders = () => {
    const token = localStorage.getItem("access");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchNotifications = async () => {
    const { data } = await axios.get(`${API_BASE}/notifications/`, {
        headers: authHeaders(),
    });
    return data;
};

export const markNotificationRead = async (id) => {
    const { data } = await axios.post(
        `${API_BASE}/notifications/${id}/mark_read/`,
        {},
        { headers: authHeaders() }
    );
    return data;
};

export const deleteNotification = async (id) => {
    const { data } = await axios.delete(
        `${API_BASE}/notifications/${id}/`,
        { headers: authHeaders() }
    );
    return data;
};

export const markAllRead = async () => {
    const { data } = await axios.post(
        `${API_BASE}/notifications/mark_all_read/`,
        {},
        { headers: authHeaders() }
    );
    return data;
};

export const clearAllNotifications = async () => {
    const { data } = await axios.post(
        `${API_BASE}/notifications/clear_all/`,
        {},
        { headers: authHeaders() }
    );
    return data;
};
