// src/modules/admin/pages/ConfiguracionPage.jsx
import React, { useState } from 'react';
import './ConfiguracionPage.css';

// --- Iconos SVG Profesionales ---
const IconoConfig = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19.14,12.94a2,2,0,0,1,0-1.88l1.48-1.11a2,2,0,0,0,.53-2.43l-1-1.73a2,2,0,0,0-2.28-.87l-1.74.69a2,2,0,0,1-2.13-.28l-1.11-1.48a2,2,0,0,0-2.43-.53l-1.73,1a2,2,0,0,0-.87,2.28l.69,1.74a2,2,0,0,1-.28,2.13l-1.48,1.11a2,2,0,0,0-.53,2.43l1,1.73a2,2,0,0,0,2.28.87l1.74-.69a2,2,0,0,1,2.13.28l1.11,1.48a2,2,0,0,0,2.43.53l1.73-1a2,2,0,0,0,.87-2.28Z" /><circle cx="12" cy="12" r="3" /></svg>;
const IconoMensajes = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
const IconoNotificaciones = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
const IconoGuardar = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>;
const IconoHerramientas = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>;

const Spinner = () => <div className="spinner"></div>;

const ConfiguracionPage = () => {
    const [configuracion, setConfiguracion] = useState({
        nombre_empresa: 'Mi Empresa',
        limite_adjuntos_mb: 10,
        mensaje_auto_respuesta: 'Hemos recibido tu ticket. Un agente te responderá pronto.',
        color_primario: '#3498db',
        horario_laboral: 'Lunes a Viernes - 08:00 a 17:00',
        notificaciones_sla: true,
        notificaciones_nuevos_tickets: true,
        notificaciones_cambios_estado: true
    });

    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState('');

    const manejarCambio = (campo, valor) => {
        setConfiguracion(prev => ({
            ...prev,
            [campo]: valor
        }));
    };

    const manejarGuardar = async () => {
        setGuardando(true);
        setMensaje('');

        // Simular guardado en API
        setTimeout(() => {
            setGuardando(false);
            setMensaje('Configuración guardada exitosamente');
            setTimeout(() => setMensaje(''), 3000);
        }, 1000);
    };

    const secciones = [
        {
            id: 'general',
            titulo: 'Configuración General',
            icono: <IconoConfig />,
            campos: [
                {
                    id: 'nombre_empresa',
                    tipo: 'text',
                    etiqueta: 'Nombre de la Empresa',
                    descripcion: 'Nombre que se mostrará en el sistema'
                },
                {
                    id: 'limite_adjuntos_mb',
                    tipo: 'number',
                    etiqueta: 'Límite de Archivos Adjuntos (MB)',
                    descripcion: 'Tamaño máximo permitido para archivos adjuntos'
                },
                {
                    id: 'horario_laboral',
                    tipo: 'text',
                    etiqueta: 'Horario Laboral',
                    descripcion: 'Horario de atención al cliente'
                },
                {
                    id: 'color_primario',
                    tipo: 'color',
                    etiqueta: 'Color Primario',
                    descripcion: 'Color principal del sistema'
                }
            ]
        },
        {
            id: 'mensajes',
            titulo: 'Mensajes Automáticos',
            icono: <IconoMensajes />,
            campos: [
                {
                    id: 'mensaje_auto_respuesta',
                    tipo: 'textarea',
                    etiqueta: 'Mensaje de Auto-Respuesta',
                    descripcion: 'Mensaje que reciben los usuarios al crear un ticket'
                }
            ]
        },
        {
            id: 'notificaciones',
            titulo: 'Sistema de Notificaciones',
            icono: <IconoNotificaciones />,
            campos: [
                {
                    id: 'notificaciones_sla',
                    tipo: 'checkbox',
                    etiqueta: 'Notificaciones de SLA',
                    descripcion: 'Alertas por incumplimiento de SLA'
                },
                {
                    id: 'notificaciones_nuevos_tickets',
                    tipo: 'checkbox',
                    etiqueta: 'Notificaciones de Nuevos Tickets',
                    descripcion: 'Notificar sobre nuevos tickets asignados'
                },
                {
                    id: 'notificaciones_cambios_estado',
                    tipo: 'checkbox',
                    etiqueta: 'Notificaciones de Cambios de Estado',
                    descripcion: 'Notificar cambios de estado en tickets'
                }
            ]
        }
    ];

    return (
        <div className="pagina-configuracion">
            <div className="pagina-header">
                <div>
                    <h1>Configuración del Sistema</h1>
                    <p className="pagina-subtitulo">
                        Configura los parámetros generales del sistema
                    </p>
                </div>

                <button
                    onClick={manejarGuardar}
                    disabled={guardando}
                    className="btn-guardar-config"
                >
                    {guardando ? (
                        <><Spinner /> Guardando...</>
                    ) : (
                        <><IconoGuardar /> Guardar Configuración</>
                    )}
                </button>
            </div>

            {mensaje && (
                <div className="mensaje-exito">
                    {mensaje}
                </div>
            )}

            <div className="secciones-configuracion">
                {secciones.map((seccion) => (
                    <div key={seccion.id} className="seccion-configuracion">
                        <div className="seccion-header">
                            <span className="seccion-icono">{seccion.icono}</span>
                            <h3>{seccion.titulo}</h3>
                        </div>

                        <div className="seccion-campos">
                            {seccion.campos.map((campo) => (
                                <div key={campo.id} className="campo-configuracion">
                                    <label htmlFor={campo.id}>{campo.etiqueta}</label>

                                    {campo.tipo === 'textarea' ? (
                                        <textarea
                                            id={campo.id}
                                            value={configuracion[campo.id]}
                                            onChange={(e) => manejarCambio(campo.id, e.target.value)}
                                            rows="4"
                                            className="input-configuracion textarea-config"
                                        />
                                    ) : campo.tipo === 'checkbox' ? (
                                        <div className="checkbox-container">
                                            <input
                                                id={campo.id}
                                                type="checkbox"
                                                checked={configuracion[campo.id]}
                                                onChange={(e) => manejarCambio(campo.id, e.target.checked)}
                                                className="checkbox-config"
                                            />
                                            <label htmlFor={campo.id} className="checkbox-label">
                                                {configuracion[campo.id] ? 'Activado' : 'Desactivado'}
                                            </label>
                                        </div>
                                    ) : (
                                        <input
                                            id={campo.id}
                                            type={campo.tipo}
                                            value={configuracion[campo.id]}
                                            onChange={(e) => manejarCambio(campo.id, e.target.value)}
                                            className="input-configuracion"
                                            min={campo.tipo === 'number' ? 1 : undefined}
                                        />
                                    )}

                                    {campo.descripcion && (
                                        <p className="descripcion-campo">{campo.descripcion}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Panel de acciones rápidas */}
            <div className="panel-acciones-rapidas">
                <div className="seccion-header">
                    <span className="seccion-icono"><IconoHerramientas /></span><h3>Acciones Rápidas</h3>
                </div>
                <div className="acciones-grid">
                    <button className="btn-accion-rapida">
                        Actualizar Cache
                    </button>
                    <button className="btn-accion-rapida">
                        Regenerar Estadísticas
                    </button>
                    <button className="btn-accion-rapida">
                        Limpiar Logs Antiguos
                    </button>
                    <button className="btn-accion-rapida">
                        Ver Logs del Sistema
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfiguracionPage;