// src/modules/admin/components/tickets/TicketsFilters.jsx
import React, { useState, useEffect } from 'react';
import './TicketsFilters.css';

const TicketsFilters = ({
    filtrosAplicados,
    onFiltrosChange,
    opcionesFiltro
}) => {
    const [filtrosLocales, setFiltrosLocales] = useState({
        search: '',
        estado: '',
        categoria: '',
        prioridad: '',
        agente: '',
        orden: '-fecha_creacion'
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
            estado: '',
            categoria: '',
            prioridad: '',
            agente: '',
            orden: '-fecha_creacion'
        };
        setFiltrosLocales(filtrosLimpiados);
        onFiltrosChange(filtrosLimpiados);
    };

    return (
        <div className="contenedor-filtros-tickets">
            <div className="filtros-superiores">
                {/* Búsqueda */}
                <div className="filtro-grupo">
                    <label>Buscar:</label>
                    <input
                        type="text"
                        placeholder="Buscar por título, descripción..."
                        value={filtrosLocales.search || ''}
                        onChange={(e) => manejarCambioFiltro('search', e.target.value)}
                        className="input-busqueda"
                    />
                </div>

                {/* Filtro por estado */}
                <div className="filtro-grupo">
                    <label>Estado:</label>
                    <select
                        value={filtrosLocales.estado || ''}
                        onChange={(e) => manejarCambioFiltro('estado', e.target.value)}
                        className="select-filtro"
                    >
                        <option value="">Todos los estados</option>
                        {opcionesFiltro?.estados?.map((estado) => (
                            <option key={estado} value={estado}>{estado}</option>
                        ))}
                    </select>
                </div>

                <div className="filtro-grupo">
                    <label>Categoría:</label>
                    <select
                        value={filtrosLocales.categoria || ''}
                        onChange={(e) => manejarCambioFiltro('categoria', e.target.value)}
                        className="select-filtro"
                    >
                        <option value="">Todas las categorías</option>
                        {opcionesFiltro?.categorias?.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                        ))}
                    </select>
                </div>

                {/* Filtro por prioridad */}
                <div className="filtro-grupo">
                    <label>Prioridad:</label>
                    <select
                        value={filtrosLocales.prioridad || ''}
                        onChange={(e) => manejarCambioFiltro('prioridad', e.target.value)}
                        className="select-filtro"
                    >
                        <option value="">Todas las prioridades</option>
                        {opcionesFiltro?.prioridades?.map((prio) => (
                            <option key={prio.id} value={prio.id}>{prio.nombre}</option>
                        ))}
                    </select>
                </div>

                {/* Filtro por Agente */}
                <div className="filtro-grupo">
                    <label>Agente:</label>
                    <select
                        value={filtrosLocales.agente || ''}
                        onChange={(e) => manejarCambioFiltro('agente', e.target.value)}
                        className="select-filtro"
                    >
                        <option value="">Todos los agentes</option>
                        {opcionesFiltro?.agentes?.map((agente) => (
                            <option key={agente.id} value={agente.id}>{agente.username}</option>
                        ))}
                    </select>
                </div>

                {/* Ordenamiento */}
                <div className="filtro-grupo">
                    <label>Ordenar por:</label>
                    <select
                        value={filtrosLocales.orden || '-fecha_creacion'}
                        onChange={(e) => manejarCambioFiltro('orden', e.target.value)}
                        className="select-filtro"
                    >
                        <option value="-fecha_creacion">Más recientes</option>
                        <option value="fecha_creacion">Más antiguos</option>
                        <option value="-dias_abierto">Más días abierto</option>
                        <option value="dias_abierto">Menos días abierto</option>
                    </select>
                </div>

                {/* Botón limpiar */}
                <button onClick={limpiarFiltros} className="btn-limpiar-filtros">
                    Limpiar
                </button>
            </div>
        </div>
    );
};

export default TicketsFilters;