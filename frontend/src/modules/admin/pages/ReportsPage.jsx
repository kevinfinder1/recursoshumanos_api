// src/modules/admin/pages/ReportsPage.jsx
import React, { useState, useEffect } from 'react';
import API from '../../../api/axiosInstance';
import './ReportsPage.css';

// --- Iconos SVG ---
const IconoExcel = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const IconoPDF = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15v-2.5A1.5 1.5 0 0 1 10.5 11h1A1.5 1.5 0 0 1 13 12.5V15a1.5 1.5 0 0 1-1.5 1.5h-1A1.5 1.5 0 0 1 9 15z"></path><path d="M17 15v-4h-2"></path></svg>;

const ReportsPage = () => {
    const [generando, setGenerando] = useState(false);
    const [error, setError] = useState('');
    const [categorias, setCategorias] = useState([]);
    const [agentes, setAgentes] = useState([]);
    const [parametros, setParametros] = useState({
        fecha_inicio: '',
        fecha_fin: '',
        categoria: '',
        agente: '',
        rango: '30dias'
    });

    useEffect(() => {
        // Cargar las opciones para los filtros al montar el componente
        const cargarOpcionesFiltro = async () => {
            try {
                const [resCategorias, resAgentes] = await Promise.all([
                    API.get('/adminpanel/categorias/'),
                    API.get('/adminpanel/agentes/?page_size=100') // Pedir hasta 100 agentes
                ]);
                setCategorias(resCategorias.data.results || resCategorias.data);
                setAgentes(resAgentes.data.results || resAgentes.data);
            } catch (err) {
                console.error("Error al cargar opciones de filtro:", err);
            }
        };
        cargarOpcionesFiltro();
    }, []);

    const tiposReporte = [
        {
            id: 'dashboard',
            nombre: 'Reporte General del Dashboard',
            descripcion: 'Métricas clave y KPIs del estado general del sistema.',
            formatos: ['excel', 'pdf']
        },
        {
            id: 'tickets',
            nombre: 'Reporte de Tickets',
            descripcion: 'Listado completo de tickets con todos los detalles',
            formatos: ['excel', 'pdf']
        },
        {
            id: 'usuarios',
            nombre: 'Reporte de Usuarios',
            descripcion: 'Información de usuarios y agentes del sistema',
            formatos: ['excel', 'pdf']
        },
        {
            id: 'rendimiento',
            nombre: 'Reporte de Rendimiento',
            descripcion: 'Métricas de rendimiento de agentes y SLA',
            formatos: ['excel', 'pdf']
        },
        {
            id: 'categorias',
            nombre: 'Reporte por Categorías',
            descripcion: 'Análisis de tickets por categorías',
            formatos: ['excel']
        }
    ];

    const manejarCambioParametro = (campo, valor) => {
        setParametros(prev => ({
            ...prev,
            [campo]: valor
        }));
    };

    const manejarGenerarReporte = async (tipo, formato) => {
        const implementados = ['dashboard', 'tickets', 'usuarios', 'rendimiento', 'categorias'];
        if (!implementados.includes(tipo)) {
            alert('Este tipo de reporte aún no está implementado.');
            return;
        }

        setGenerando(true);
        setError('');

        // Construir los parámetros y el endpoint dinámicamente
        const endpoint = `/adminpanel/reportes/${tipo}/`;
        const params = {
            ...parametros, // Incluye rango, fechas, categoria, agente
            formato: formato,
        };

        // El reporte de dashboard solo usa 'rango', los demás usan el resto de filtros
        if (tipo === 'dashboard') {
            delete params.fecha_inicio;
            delete params.fecha_fin;
        }

        try {
            const response = await API.get(endpoint, {
                params,
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            const contentDisposition = response.headers['content-disposition'];
            let filename = `reporte_${tipo}_${parametros.rango}.${formato}`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch && filenameMatch.length > 1) {
                    filename = filenameMatch[1];
                }
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            setError('Error al generar el reporte. Verifique que el backend esté funcionando.');
        } finally {
            setGenerando(false);
        }
    };

    const hoy = new Date().toISOString().split('T')[0];
    const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return (
        <div className="pagina-reportes">
            <div className="pagina-header">
                <div>
                    <h1>Reportes y Analytics</h1>
                    <p className="pagina-subtitulo">
                        Genera reportes detallados del sistema
                    </p>
                </div>
            </div>

            {error && (
                <div className="mensaje-error">
                    {error}
                </div>
            )}

            {/* Panel de parámetros */}
            <div className="panel-parametros">
                <h3>Parámetros del Reporte</h3>
                <div className="parametros-grid">
                    <div className="parametro-grupo">
                        <label>Rango de Fechas:</label>
                        <select
                            value={parametros.rango}
                            onChange={(e) => manejarCambioParametro('rango', e.target.value)}
                            className="select-parametro"
                        >
                            <option value="7dias">Últimos 7 días</option>
                            <option value="30dias">Últimos 30 días</option>
                            <option value="mes">Este mes</option>
                            <option value="personalizado">Personalizado</option>
                        </select>
                    </div>

                    {parametros.rango === 'personalizado' && (
                        <>
                            <div className="parametro-grupo">
                                <label>Fecha Inicio:</label>
                                <input
                                    type="date"
                                    value={parametros.fecha_inicio}
                                    onChange={(e) => manejarCambioParametro('fecha_inicio', e.target.value)}
                                    max={hoy}
                                    className="input-parametro"
                                />
                            </div>
                            <div className="parametro-grupo">
                                <label>Fecha Fin:</label>
                                <input
                                    type="date"
                                    value={parametros.fecha_fin}
                                    onChange={(e) => manejarCambioParametro('fecha_fin', e.target.value)}
                                    max={hoy}
                                    className="input-parametro"
                                />
                            </div>
                        </>
                    )}

                    <div className="parametro-grupo">
                        <label>Categoría:</label>
                        <select
                            value={parametros.categoria}
                            onChange={(e) => manejarCambioParametro('categoria', e.target.value)}
                            className="select-parametro"
                        >
                            <option value="">-- Todas --</option>
                            {categorias.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="parametro-grupo">
                        <label>Agente:</label>
                        <select
                            value={parametros.agente}
                            onChange={(e) => manejarCambioParametro('agente', e.target.value)}
                            className="select-parametro"
                        >
                            <option value="">-- Todos --</option>
                            {agentes.map(agente => (
                                <option key={agente.id} value={agente.id}>{agente.nombre_completo || agente.username}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Lista de reportes disponibles */}
            <div className="lista-reportes">
                <h3>Reportes Disponibles</h3>
                <div className="grid-reportes">
                    {tiposReporte.map((reporte) => (
                        <div key={reporte.id} className="tarjeta-reporte">
                            <div className="reporte-info">
                                <h4>{reporte.nombre}</h4>
                                <p>{reporte.descripcion}</p>
                            </div>

                            <div className="reporte-acciones">
                                {reporte.formatos.includes('excel') && (
                                    <button
                                        onClick={() => manejarGenerarReporte(reporte.id, 'xlsx')}
                                        disabled={generando || !['dashboard', 'tickets', 'usuarios', 'rendimiento', 'categorias'].includes(reporte.id)}
                                        className="btn-reporte btn-excel"
                                    >
                                        <IconoExcel /> {['dashboard', 'tickets', 'usuarios', 'rendimiento', 'categorias'].includes(reporte.id) ? 'Excel' : 'Excel (Próximamente)'}
                                    </button>
                                )}

                                {reporte.formatos.includes('pdf') && (
                                    <button
                                        onClick={() => manejarGenerarReporte(reporte.id, 'pdf')}
                                        disabled={generando || !['dashboard', 'tickets', 'usuarios', 'rendimiento', 'categorias'].includes(reporte.id)}
                                        className="btn-reporte btn-pdf" >
                                        <IconoPDF /> {['dashboard', 'tickets', 'usuarios', 'rendimiento', 'categorias'].includes(reporte.id) ? 'PDF' : 'PDF (Próximamente)'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Información adicional */}
            <div className="info-reportes">
                <h3> Métricas Disponibles en los Reportes</h3>
                <div className="metricas-lista">
                    <div className="metrica-item">
                        <strong>Tickets:</strong> Totales, por estado, por categoría, por prioridad
                    </div>
                    <div className="metrica-item">
                        <strong>Tiempos:</strong> Resolución promedio, tiempo primera respuesta, SLA
                    </div>
                    <div className="metrica-item">
                        <strong>Agentes:</strong> Carga de trabajo, efectividad, rating promedio
                    </div>
                    <div className="metrica-item">
                        <strong>Usuarios:</strong> Actividad, tickets creados, satisfacción
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;