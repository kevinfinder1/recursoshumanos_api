// src/modules/admin/components/dashboard/MetricasCards.jsx
import React from 'react';
import './MetricasCards.css';
import {
    IconClipboardList,
    IconNewSection,
    IconFolderOpen,
    IconSettings,
    IconCircleCheck,
    IconAlarm
} from './MetricIcons'; // Asumimos que los iconos están en un archivo separado para mayor limpieza

const MetricasCards = ({ metricas, cargando }) => {
    if (cargando) {
        return <div className="metricas-cargando">Cargando métricas...</div>;
    }

    if (!metricas) {
        return <div className="metricas-error">No hay datos disponibles</div>;
    }

    const tarjetas = [
        {
            titulo: 'Total Tickets',
            valor: metricas.total_tickets || 0,
            icono: <IconClipboardList />,
            color: 'primario'
        },
        {
            titulo: 'Tickets Hoy',
            valor: metricas.tickets_hoy || 0,
            icono: <IconNewSection />,
            color: 'info'
        },
        {
            titulo: 'Abiertos',
            valor: metricas.tickets_abiertos || 0,
            icono: <IconFolderOpen />,
            color: 'advertencia'
        },
        {
            titulo: 'En Proceso',
            valor: metricas.tickets_en_progreso || 0,
            icono: <IconSettings />,
            color: 'proceso'
        },
        {
            titulo: 'Resueltos',
            valor: metricas.tickets_resueltos || 0,
            icono: <IconCircleCheck />,
            color: 'verde'
        },
        {
            titulo: 'Atrasados',
            valor: metricas.tickets_atrasados || 0, // Este campo puede no existir
            icono: <IconAlarm />,
            color: 'rojo'
        }
    ];

    return (
        <div className="contenedor-metricas">
            {tarjetas.map((tarjeta, index) => (
                <div key={index} className={`tarjeta-metrica tarjeta-${tarjeta.color}`}>
                    <div className="tarjeta-contenido">
                        <div className="tarjeta-icono">{tarjeta.icono}</div>
                        <div className="tarjeta-datos">
                            <h3 className="tarjeta-titulo">{tarjeta.titulo}</h3>
                            <p className="tarjeta-valor">{tarjeta.valor}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MetricasCards;