// src/modules/admin/pages/Dashboard.jsx
import React from 'react';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import DashboardFiltros from '../components/dashboard/DashboardFiltros';
import MetricasCards from '../components/dashboard/MetricasCards';
import './Dashboard.css';

const IconoEstrella = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="icono-estrella"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;

const Dashboard = () => {
    const {
        metricas,
        cargando,
        error,
        rangoSeleccionado,
        cambiarRango,
        recargarDatos
    } = useAdminDashboard();

    if (error) {
        return (
            <div className="dashboard-error">
                <p>{error}</p>
                <button onClick={recargarDatos} className="btn-reintentar">
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="pagina-dashboard">
            <div className="dashboard-header">
                <h1>Dashboard de Administración</h1>
                <p>Resumen general del sistema</p>
            </div>

            <DashboardFiltros
                rangoSeleccionado={rangoSeleccionado}
                cambiarRango={cambiarRango}
            />

            <section className="seccion-metricas">
                <h2>Métricas Principales</h2>
                <MetricasCards
                    metricas={metricas}
                    cargando={cargando}
                />
            </section>

            {metricas && (
                <section className="seccion-estadisticas">
                    <h2>Estadísticas Adicionales</h2>
                    <div className="tarjetas-estadisticas">
                        <div className="tarjeta-estadistica">
                            <h3>Rating Promedio</h3>
                            <p className="valor-estadistica">
                                {metricas.promedio_rating || 0} <IconoEstrella />
                            </p>
                        </div>
                        <div className="tarjeta-estadistica">
                            <h3>Tiempo Resolución Promedio</h3>
                            <p className="valor-estadistica">{metricas.tiempo_promedio_resolucion || 0} horas</p>
                        </div>
                        <div className="tarjeta-estadistica">
                            <h3>Efectividad Global</h3>
                            <p className="valor-estadistica">{metricas.efectividad_global || 0}%</p>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default Dashboard;