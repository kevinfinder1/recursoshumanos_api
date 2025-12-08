// src/modules/admin/components/dashboard/DashboardFiltros.jsx
import React from 'react';
import './DashboardFiltros.css';

const DashboardFiltros = ({ rangoSeleccionado, cambiarRango }) => {
    const opcionesRango = [
        { valor: 'dia', etiqueta: 'Hoy' },
        { valor: '7dias', etiqueta: 'Últimos 7 días' },
        { valor: '30dias', etiqueta: 'Últimos 30 días' },
        { valor: 'mes', etiqueta: 'Este mes' },
        { valor: 'total', etiqueta: 'Todo el tiempo' }
    ];

    return (
        <div className="contenedor-filtros">
            <h3>Filtrar por:</h3>
            <div className="filtros-rango">
                {opcionesRango.map((opcion) => (
                    <button
                        key={opcion.valor}
                        className={`btn-filtro ${rangoSeleccionado === opcion.valor ? 'filtro-activo' : ''}`}
                        onClick={() => cambiarRango(opcion.valor)}
                    >
                        {opcion.etiqueta}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default DashboardFiltros;