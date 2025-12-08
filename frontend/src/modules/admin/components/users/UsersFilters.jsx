// src/modules/admin/components/users/UsersFilters.jsx
import React, { useState, useEffect } from 'react';
import './UsersFilters.css';
// ✅ CORRECCIÓN: El componente debe recibir 'opciones' y usarlas.
const UsersFilters = ({ filtrosAplicados, onFiltrosChange, opciones }) => {
    const { roles = [], areas = [] } = opciones || {};
    const [filtrosLocales, setFiltrosLocales] = useState({
        search: '',
        rol: '', // ✅ SOLUCIÓN: Cambiar 'role' a 'rol' para que coincida con el backend
        estado: '',
        orden: '-date_joined'
    });

    useEffect(() => {
        setFiltrosLocales(filtrosAplicados);
    }, [filtrosAplicados]);

    const manejarCambioFiltro = (campo, valor) => {
        const nuevosFiltros = {
            ...filtrosLocales,
            [campo]: valor
        };
        setFiltrosLocales(nuevosFiltros);
        onFiltrosChange(nuevosFiltros);
    };

    const limpiarFiltros = () => {
        const filtrosLimpiados = {
            search: '',
            rol: '', // ✅ SOLUCIÓN: Cambiar 'role' a 'rol'
            estado: '',
            orden: '-date_joined'
        };
        setFiltrosLocales(filtrosLimpiados);
        onFiltrosChange(filtrosLimpiados);
    };

    return (
        <div className="contenedor-filtros-usuarios">
            <div className="filtros-superiores">
                {/* Búsqueda */}
                <div className="filtro-grupo">
                    <label>Buscar:</label>
                    <input
                        type="text"
                        placeholder="Buscar por nombre, usuario o email..."
                        value={filtrosLocales.search || ''}
                        onChange={(e) => manejarCambioFiltro('search', e.target.value)}
                        className="input-busqueda"
                    />
                </div>

                {/* Filtro por rol */}
                <div className="filtro-grupo">
                    <label>Rol:</label>
                    <select
                        value={filtrosLocales.rol || ''}
                        onChange={(e) => manejarCambioFiltro('rol', e.target.value)}
                        className="select-filtro"
                    >
                        <option value="">Todos los roles</option>
                        {roles.map((rol) => (
                            <option key={rol.value} value={rol.value}>
                                {rol.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Filtro por estado */}
                <div className="filtro-grupo">
                    <label>Estado:</label>
                    <select
                        value={filtrosLocales.estado || ''}
                        onChange={(e) => manejarCambioFiltro('estado', e.target.value)}
                        className="select-filtro"
                    >
                        <option value="">Todos</option>
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                    </select>
                </div>

                {/* Ordenamiento */}
                <div className="filtro-grupo">
                    <label>Ordenar por:</label>
                    <select
                        value={filtrosLocales.orden || '-date_joined'}
                        onChange={(e) => manejarCambioFiltro('orden', e.target.value)}
                        className="select-filtro"
                    >
                        <option value="-date_joined">Más recientes</option>
                        <option value="date_joined">Más antiguos</option>
                    </select>
                </div>

                {/* Botón limpiar */}
                <button onClick={limpiarFiltros} className="btn-limpiar-filtros">
                    Limpiar Filtros
                </button>
            </div>
        </div>
    );
};

export default UsersFilters;