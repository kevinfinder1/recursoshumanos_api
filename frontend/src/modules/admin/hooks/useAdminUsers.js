// src/modules/admin/hooks/useAdminUsers.js
import { useState, useEffect } from 'react';
import { adminUsersApi } from '../api/adminUsersApi';

export const useAdminUsers = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);
    const [filtros, setFiltros] = useState({});
    const [paginacion, setPaginacion] = useState({});

    // Obtener lista de usuarios
    const obtenerUsuarios = async (params = {}) => {
        try {
            setCargando(true);
            setError(null);

            const respuesta = await adminUsersApi.obtenerUsuarios(params);

            if (respuesta.results) {
                setUsuarios(respuesta.results);
                setPaginacion(respuesta.pagination || {});
            } else {
                setUsuarios(respuesta);
            }

            setFiltros(respuesta.filtros_aplicados || {});
        } catch (err) {
            setError('Error al cargar los usuarios');
            console.error('Error usuarios:', err);
        } finally {
            setCargando(false);
        }
    };

    // Crear usuario
    const crearUsuario = async (datosUsuario) => {
        try {
            setError(null);
            const nuevoUsuario = await adminUsersApi.crearUsuario(datosUsuario);
            await obtenerUsuarios(); // Recargar lista
            return { exito: true, usuario: nuevoUsuario };
        } catch (err) {
            const mensajeError = err.response?.data || 'Error al crear el usuario';
            setError(mensajeError);
            // Relanzar el error para que el componente modal pueda manejarlo
            throw err;
        }
    };

    // Actualizar usuario
    const actualizarUsuario = async (id, datosUsuario) => {
        try {
            setError(null);
            const usuarioActualizado = await adminUsersApi.actualizarUsuario(id, datosUsuario);
            await obtenerUsuarios(); // Recargar lista
            return { exito: true, usuario: usuarioActualizado };
        } catch (err) {
            const mensajeError = err.response?.data || 'Error al actualizar el usuario';
            setError(mensajeError);
            // Relanzar el error para que el componente modal pueda manejarlo
            throw err;
        }
    };

    // Eliminar usuario
    const eliminarUsuario = async (id) => {
        try {
            setError(null);
            await adminUsersApi.eliminarUsuario(id);
            await obtenerUsuarios(); // Recargar lista
            return { exito: true };
        } catch (err) {
            const mensajeError = err.response?.data?.error || 'Error al eliminar el usuario';
            setError(mensajeError);
            return { exito: false, error: mensajeError };
        }
    };

    // Alternar estado activo/inactivo
    const toggleEstadoUsuario = async (id) => {
        try {
            setError(null);
            const resultado = await adminUsersApi.toggleActivo(id);
            await obtenerUsuarios(); // Recargar lista
            return { exito: true, data: resultado };
        } catch (err) {
            const mensajeError = err.response?.data?.error || 'Error al cambiar el estado';
            setError(mensajeError);
            return { exito: false, error: mensajeError };
        }
    };

    // Aplicar filtros
    const aplicarFiltros = (nuevosFiltros) => {
        obtenerUsuarios(nuevosFiltros);
    };

    // Cambiar página
    const cambiarPagina = (pagina) => {
        obtenerUsuarios({ ...filtros, page: pagina });
    };

    useEffect(() => {
        obtenerUsuarios();
    }, []);

    return {
        usuarios,
        usuarioSeleccionado,
        setUsuarioSeleccionado,
        cargando,
        error,
        filtros,
        paginacion,
        obtenerUsuarios,
        crearUsuario,
        actualizarUsuario,
        eliminarUsuario,
        toggleEstadoUsuario,
        aplicarFiltros,
        cambiarPagina
    };
};