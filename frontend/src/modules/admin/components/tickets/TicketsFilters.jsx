import React, { useState, useEffect, useRef, useCallback } from 'react';
import './TicketsFilters.css';

const defaultFiltros = {
    search: '',
    estado: '',
    categoria: '',
    prioridad: '',
    agente: '',
    orden: '-fecha_creacion'
};

const TicketsFilters = ({
    filtrosAplicados,
    onFiltrosChange,
    opcionesFiltro = {}
}) => {
    // ✅ Inicializar con los filtros aplicados o defaults
    const [filtrosLocales, setFiltrosLocales] = useState(() => ({
        ...defaultFiltros,
        ...(filtrosAplicados || {})
    }));

    // Refs para control
    const timeoutRef = useRef(null);
    const isInitialMount = useRef(true);
    const ignoreNextExternalUpdate = useRef(false);

    // ✅ Sincronizar solo cuando filtrosAplicados cambia EXTERNAMENTE
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        // Si acabamos de hacer un cambio local, ignoramos esta actualización
        if (ignoreNextExternalUpdate.current) {
            ignoreNextExternalUpdate.current = false;
            return;
        }

        // Solo actualizar si hay diferencias REALES
        const nuevosFiltrosExternos = { ...defaultFiltros, ...(filtrosAplicados || {}) };
        const currentLocalStr = JSON.stringify(filtrosLocales);
        const newExternalStr = JSON.stringify(nuevosFiltrosExternos);

        if (currentLocalStr !== newExternalStr) {
            console.log("📥 Sincronizando filtros desde props (padre):", nuevosFiltrosExternos);
            setFiltrosLocales(nuevosFiltrosExternos);
        }
    }, [filtrosAplicados]);

    // ✅ Debounce solo para search
    const aplicarBusquedaConDebounce = useCallback((nuevosFiltros) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            console.log("⏰ Debounce ejecutado, enviando filtros al padre"); // ✅ LOG CLAVE
            onFiltrosChange(nuevosFiltros);
            ignoreNextExternalUpdate.current = true;
        }, 600);
    }, [onFiltrosChange]);

    const manejarCambioFiltro = (campo, valor) => {
        const nuevosFiltros = {
            ...filtrosLocales,
            [campo]: valor
        };

        console.log(`🔧 Filtro cambiado localmente: ${campo} = ${valor}`);
        setFiltrosLocales(nuevosFiltros);

        if (campo !== 'search') {
            // Para filtros NO search: aplicar inmediatamente
            console.log("🚀 Ejecutando onFiltrosChange con:", nuevosFiltros);
            onFiltrosChange(nuevosFiltros);
            ignoreNextExternalUpdate.current = true;
        } else {
            // Para search: aplicar con debounce
            aplicarBusquedaConDebounce(nuevosFiltros);
        }
    };

    const limpiarFiltros = () => {
        const filtrosLimpios = { ...defaultFiltros };
        setFiltrosLocales(filtrosLimpios);
        onFiltrosChange(filtrosLimpios);
        ignoreNextExternalUpdate.current = true;
    };

    // Limpiar timeout al desmontar
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // ✅ Función para cambios rápidos en search (sin debounce)
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            onFiltrosChange(filtrosLocales);
            ignoreNextExternalUpdate.current = true;
        }
    };

    // Extraer opciones de props
    const {
        estados = [],
        prioridades = [],
        categorias = [],
        agentes = []
    } = opcionesFiltro;

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
                        onKeyDown={handleSearchKeyDown}
                        className="input-busqueda"
                    />
                </div>

                {/* Ordenar por */}
                <div className="filtro-grupo">
                    <label>Ordenar:</label>
                    <select
                        value={filtrosLocales.orden || '-fecha_creacion'}
                        onChange={(e) => manejarCambioFiltro('orden', e.target.value)}
                        className="select-filtro"
                    >
                        <option value="-fecha_creacion">Más recientes</option>
                        <option value="fecha_creacion">Más antiguos</option>
                        <option value="-prioridad">Mayor Prioridad</option>
                        <option value="prioridad">Menor Prioridad</option>
                        <option value="estado">Estado</option>
                    </select>
                </div>
            </div>

            <div className="filtros-inferiores">
                {/* Estado */}
                <div className="filtro-grupo">
                    <label>Estado:</label>
                    <select
                        value={filtrosLocales.estado || ''}
                        onChange={(e) => manejarCambioFiltro('estado', e.target.value)}
                        className="select-filtro"
                    >
                        <option value="">Todos los estados</option>
                        {estados.map((estado) => (
                            <option key={estado.value} value={estado.value}>
                                {estado.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Prioridad */}
                <div className="filtro-grupo">
                    <label>Prioridad:</label>
                    <select
                        value={filtrosLocales.prioridad || ''}
                        onChange={(e) => manejarCambioFiltro('prioridad', e.target.value)}
                        className="select-filtro"
                    >
                        <option value="">Todas</option>
                        {prioridades.map((p) => (
                            <option key={p.value} value={p.value}>
                                {p.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Categoría */}
                <div className="filtro-grupo">
                    <label>Categoría:</label>
                    <select
                        value={filtrosLocales.categoria || ''}
                        onChange={(e) => manejarCambioFiltro('categoria', e.target.value)}
                        className="select-filtro"
                    >
                        <option value="">Todas</option>
                        {categorias.map((c) => (
                            <option key={c.value} value={c.value}>
                                {c.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Agente */}
                <div className="filtro-grupo">
                    <label>Agente:</label>
                    <select
                        value={filtrosLocales.agente || ''}
                        onChange={(e) => manejarCambioFiltro('agente', e.target.value)}
                        className="select-filtro"
                    >
                        <option value="">Todos</option>
                        {agentes.map((a) => (
                            <option key={a.value} value={a.value}>
                                {a.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filtro-grupo boton-limpiar-wrapper">
                    <button className="btn-limpiar-filtros" onClick={limpiarFiltros}>
                        Limpiar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TicketsFilters;