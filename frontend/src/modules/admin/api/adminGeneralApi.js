// src/modules/admin/api/adminGeneralApi.js
import API from '../../../api/axiosInstance';

export const adminGeneralApi = {
    /**
     * Obtiene la lista completa de roles.
     */
    async obtenerRoles() {
        const response = await API.get('/admin/roles/');
        // Asumimos que la API devuelve un array de objetos de rol
        return response.data;
    },

    /**
     * Obtiene la lista completa de áreas.
     */
    async obtenerAreas() {
        const response = await API.get('/admin/areas/');
        // Asumimos que la API devuelve un array de objetos de área
        return response.data;
    },
};