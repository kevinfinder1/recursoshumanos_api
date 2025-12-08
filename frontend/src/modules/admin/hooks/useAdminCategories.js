// src/modules/admin/hooks/useAdminCategories.js
import { useState, useEffect } from 'react';
import { adminCategoriesApi } from '../api/adminCategoriesApi';

export const useAdminCategories = () => {
    const [categorias, setCategorias] = useState([]);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);
    const [estadisticas, setEstadisticas] = useState({
        total_categorias: 0,
        categorias_activas: 0,
        categorias_inactivas: 0
    });

    // Obtener lista de categorías
    const obtenerCategorias = async () => {
        try {
            setCargando(true);
            setError(null);

            const data = await adminCategoriesApi.obtenerCategorias();
            setCategorias(data);

            // Calcular estadísticas desde los datos
            const stats = {
                total_categorias: data.length,
                categorias_activas: data.filter(cat => cat.activo).length,
                categorias_inactivas: data.filter(cat => !cat.activo).length
            };
            setEstadisticas(stats);
        } catch (err) {
            setError('Error al cargar las categorías');
            console.error('Error categorías:', err);
        } finally {
            setCargando(false);
        }
    };

    // Crear categoría
    const crearCategoria = async (datosCategoria) => {
        try {
            setError(null);
            const nuevaCategoria = await adminCategoriesApi.crearCategoria(datosCategoria);
            await obtenerCategorias(); // Esto recalculará las estadísticas
            return { exito: true, categoria: nuevaCategoria };
        } catch (err) {
            const mensajeError = err.response?.data || 'Error al crear la categoría';
            setError(mensajeError);
            return { exito: false, error: mensajeError };
        }
    };

    // Actualizar categoría
    const actualizarCategoria = async (id, datosCategoria) => {
        try {
            setError(null);
            const categoriaActualizada = await adminCategoriesApi.actualizarCategoria(id, datosCategoria);
            await obtenerCategorias(); // Esto recalculará las estadísticas
            return { exito: true, categoria: categoriaActualizada };
        } catch (err) {
            const mensajeError = err.response?.data || 'Error al actualizar la categoría';
            setError(mensajeError);
            return { exito: false, error: mensajeError };
        }
    };

    // Eliminar categoría
    const eliminarCategoria = async (id) => {
        try {
            setError(null);
            await adminCategoriesApi.eliminarCategoria(id);
            await obtenerCategorias(); // Esto recalculará las estadísticas
            return { exito: true };
        } catch (err) {
            const mensajeError = err.response?.data?.error || 'Error al eliminar la categoría';
            setError(mensajeError);
            return { exito: false, error: mensajeError };
        }
    };

    // Toggle estado activo/inactivo
    const toggleEstadoCategoria = async (id, estadoActual) => {
        try {
            setError(null);
            const datosActualizacion = { activo: !estadoActual };
            await adminCategoriesApi.actualizarCategoria(id, datosActualizacion);
            await obtenerCategorias(); // Esto recalculará las estadísticas
            return { exito: true };
        } catch (err) {
            const mensajeError = err.response?.data || 'Error al cambiar el estado';
            setError(mensajeError);
            return { exito: false, error: mensajeError };
        }
    };

    useEffect(() => {
        obtenerCategorias();
    }, []);

    return {
        categorias,
        categoriaSeleccionada,
        setCategoriaSeleccionada,
        cargando,
        error,
        estadisticas,
        obtenerCategorias,
        crearCategoria,
        actualizarCategoria,
        eliminarCategoria,
        toggleEstadoCategoria
    };
};