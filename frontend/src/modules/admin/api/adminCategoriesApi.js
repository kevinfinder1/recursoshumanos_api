// src/modules/admin/api/adminCategoriesApi.js
import API from '../../../api/axiosInstance';

export const adminCategoriesApi = {
    // Obtener lista de categorías - ENDPOINT EXISTENTE
    obtenerCategorias: async () => {
        const response = await API.get('/admin/categorias/');
        return response.data;
    },

    // Obtener detalle de una categoría - ENDPOINT EXISTENTE
    obtenerCategoria: async (id) => {
        const response = await API.get(`/admin/categorias/${id}/`);
        return response.data;
    },

    // Crear categoría - ENDPOINT EXISTENTE
    crearCategoria: async (datosCategoria) => {
        const response = await API.post('/admin/categorias/', datosCategoria);
        return response.data;
    },

    // Actualizar categoría - ENDPOINT EXISTENTE
    actualizarCategoria: async (id, datosCategoria) => {
        const response = await API.patch(`/admin/categorias/${id}/`, datosCategoria);
        return response.data;
    },

    // Eliminar categoría - ENDPOINT EXISTENTE
    eliminarCategoria: async (id) => {
        const response = await API.delete(`/admin/categorias/${id}/`);
        return response.data;
    },

    // Obtener estadísticas de categorías - ENDPOINT QUE NO EXISTE, LO QUITAMOS
    obtenerEstadisticas: async () => {
        console.warn('Endpoint /admin/categorias/estadisticas/ no existe');
        return {
            total_categorias: 0,
            categorias_activas: 0,
            categorias_inactivas: 0
        };
    }
};