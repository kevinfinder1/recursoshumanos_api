// src/modules/admin/api/adminUsersApi.js
import API from '../../../api/axiosInstance';

export const adminUsersApi = {
    // Obtener lista de usuarios - ENDPOINT EXISTENTE
    obtenerUsuarios: async (params = {}) => {
        const response = await API.get('/admin/agentes/', { params });
        return response.data;
    },

    // Obtener detalle de un usuario - ENDPOINT EXISTENTE
    obtenerUsuario: async (id) => {
        const response = await API.get(`/admin/agentes/${id}/`);
        return response.data;
    },

    // Crear usuario - ENDPOINT EXISTENTE
    crearUsuario: async (datosUsuario) => {
        // ✅ SOLUCIÓN FINAL: Cuando se usa FormData, se debe establecer el Content-Type a 'undefined'
        // para que el navegador lo configure automáticamente con el 'boundary' correcto.
        const config = {
            headers: { 'Content-Type': undefined }
        };
        const response = await API.post('/admin/agentes/', datosUsuario, config);
        return response.data;
    },

    // Crear área - NUEVO
    crearArea: async (datosArea) => {
        const response = await API.post('/admin/areas/', datosArea); // Esta ruta parece correcta según el patrón
        return response.data;
    },

    // Crear rol (grupo) - NUEVO
    crearRol: async (datosRol) => {
        const response = await API.post('/admin/roles/', datosRol);
        return response.data;
    },

    // Actualizar usuario - ENDPOINT EXISTENTE
    actualizarUsuario: async (id, datosUsuario) => {
        // ✅ SOLUCIÓN: Al igual que en crearUsuario, debemos manejar FormData para la actualización,
        // estableciendo Content-Type a undefined para que el navegador lo gestione.
        const config = {
            headers: { 'Content-Type': undefined }
        };
        // ✅ SOLUCIÓN: Usar PATCH para permitir actualizaciones parciales.
        const response = await API.patch(`/admin/agentes/${id}/`, datosUsuario, config);
        return response.data;
    },

    // Eliminar usuario - ENDPOINT EXISTENTE
    eliminarUsuario: async (id) => {
        const response = await API.delete(`/admin/agentes/${id}/`);
        return response.data;
    },

    // Alternar estado activo/inactivo - ENDPOINT EXISTENTE
    toggleActivo: async (id) => {
        const response = await API.post(`/admin/agentes/${id}/toggle_activo/`);
        return response.data;
    },

    // Validar usuario - ENDPOINT QUE NO EXISTE, LO QUITAMOS
    validarUsuario: async (datosValidacion) => {
        console.warn('Endpoint /admin/agentes/validar_usuario/ no existe');
        return { is_valid: true, errors: {}, suggestions: {} };
    },

    // Verificar disponibilidad - ENDPOINT QUE NO EXISTE, LO QUITAMOS
    verificarDisponibilidad: async (params) => {
        console.warn('Endpoint /admin/agentes/verificar_disponibilidad/ no existe');
        return { username_available: true, email_available: true, suggestions: [] };
    },

    // Obtener opciones de filtro (roles) - CORREGIDO
    obtenerOpcionesFiltro: async () => {
        // Usamos el endpoint de grupos para obtener los roles
        const response = await API.get('/admin/roles/');
        // Log para depuración que solicitaste:
        console.log('Respuesta del backend para /adminpanel/roles/:', response.data);

        // El backend devuelve una respuesta paginada. El array está en `response.data.results`.
        const rolesData = response.data.results || response.data;

        // Transformamos la respuesta para que coincida con el formato esperado { value, label }
        const roles = Array.isArray(rolesData) ? rolesData.map(rol => ({ value: rol.id, label: rol.nombre })) : [];
        // Devolvemos un objeto compatible con lo que esperan los componentes
        return { roles };
    }
};