// src/modules/admin/components/categories/CategoryModal.jsx
import React, { useState, useEffect } from 'react';
import './CategoryModal.css';

const CategoryModal = ({ categoria, onGuardar, onCancelar, mensajeExito, opcionesRol = [], opcionesPrioridad = [] }) => {
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        activo: true,
        tipo_agente: '', // Asegurar que todos los campos del formulario tengan un valor inicial
        color: '#3498db',
        prioridad_automatica: 'Media', // ✅ NUEVO: Valor por defecto para la prioridad
        subcategorias: []
    });
    const [nuevaSubcategoria, setNuevaSubcategoria] = useState('');
    const [errores, setErrores] = useState({});

    useEffect(() => {
        if (categoria) {
            // Modo edición
            setFormData({
                nombre: categoria.nombre || '',
                descripcion: categoria.descripcion || '',
                activo: categoria.activo !== undefined ? categoria.activo : true,
                tipo_agente: categoria.tipo_agente || '',
                color: categoria.color || '#ffffffff',
                prioridad_automatica: categoria.prioridad_automatica || 'Media', // ✅ NUEVO
                subcategorias: categoria.subcategorias || []
            });
        } else {
            // Modo creación
            setFormData({
                nombre: '',
                descripcion: '',
                activo: true,
                color: '#3498db',
                tipo_agente: '',
                prioridad_automatica: 'Media', // ✅ NUEVO
                subcategorias: []
            });
        }
    }, [categoria]);

    const manejarCambio = (campo, valor) => {
        setFormData(prev => ({ ...prev, [campo]: valor }));
        if (errores[campo]) {
            setErrores(prev => ({ ...prev, [campo]: '' }));
        }
    };

    const agregarSubcategoria = () => {
        if (nuevaSubcategoria.trim()) {
            const subExistente = formData.subcategorias.find(sub => sub.nombre.toLowerCase() === nuevaSubcategoria.trim().toLowerCase());
            if (subExistente) {
                setErrores(prev => ({ ...prev, subcategorias: 'Esta subcategoría ya existe.' }));
                return;
            }
            setFormData(prev => ({
                ...prev,
                subcategorias: [...prev.subcategorias, { nombre: nuevaSubcategoria.trim() }]
            }));
            setNuevaSubcategoria('');
            setErrores(prev => ({ ...prev, subcategorias: '' }));
        }
    };

    const eliminarSubcategoria = (nombre) => {
        setFormData(prev => ({
            ...prev,
            subcategorias: prev.subcategorias.filter(sub => sub.nombre !== nombre)
        }));
    };

    const validarFormulario = () => {
        const nuevosErrores = {};
        if (!formData.nombre.trim()) {
            nuevosErrores.nombre = 'El nombre es requerido';
        }
        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    const manejarSubmit = (e) => {
        e.preventDefault();
        if (!validarFormulario()) return;
        onGuardar(formData);
    };

    const esModoEdicion = !!categoria;

    return (
        <div className="modal-overlay">
            <div className="modal-categoria" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="modal-header">
                    <h3>{esModoEdicion ? 'Editar Categoría' : 'Crear Categoría'}</h3>
                    <button onClick={onCancelar} className="btn-cerrar-modal">×</button>
                </div>

                <form onSubmit={manejarSubmit} className="formulario-categoria">
                    <div className="modal-contenido">
                        {mensajeExito ? (
                            <div className="mensaje-exito-modal">{mensajeExito}</div>
                        ) : (
                            <>
                                <div className="grupo-formulario">
                                    <label htmlFor="nombre">Nombre *</label>
                                    <input
                                        id="nombre"
                                        type="text"
                                        value={formData.nombre}
                                        onChange={(e) => manejarCambio('nombre', e.target.value)}
                                        className={errores.nombre ? 'input-error' : ''}
                                    />
                                    {errores.nombre && <span className="mensaje-error">{errores.nombre}</span>}
                                </div>

                                <div className="grupo-formulario">
                                    <label htmlFor="descripcion">Descripción</label>
                                    <textarea
                                        id="descripcion"
                                        value={formData.descripcion}
                                        onChange={(e) => manejarCambio('descripcion', e.target.value)}
                                        rows="3"
                                    />
                                </div>

                                <div className="grupo-formulario">
                                    <label htmlFor="color">Color</label>
                                    <div className="input-con-icono">
                                        <input
                                            id="color"
                                            type="color"
                                            value={formData.color}
                                            onChange={(e) => manejarCambio('color', e.target.value)}
                                        />
                                        <span className="valor-color">{formData.color}</span>
                                    </div>
                                </div>

                                <div className="grupo-formulario">
                                    <label htmlFor="tipo_agente">Tipo de Agente Requerido</label>
                                    <select
                                        id="tipo_agente"
                                        value={formData.tipo_agente}
                                        onChange={(e) => manejarCambio('tipo_agente', e.target.value)}
                                    >
                                        <option value="">-- Ninguno (Cualquier agente) --</option>
                                        {opcionesRol.map((rol) => (
                                            <option key={rol.value} value={rol.value}>
                                                {rol.label}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="descripcion-campo">Rol de agente requerido para atender esta categoría.</p>
                                </div>

                                {/* ✅ NUEVO: Selector de Prioridad Automática */}
                                <div className="grupo-formulario">
                                    <label htmlFor="prioridad_automatica">Prioridad Automática</label>
                                    <select
                                        id="prioridad_automatica"
                                        value={formData.prioridad_automatica}
                                        onChange={(e) => manejarCambio('prioridad_automatica', e.target.value)}
                                    >
                                        {/* Las opciones se basan en las constantes del modelo de Django */}
                                        <option value="Baja">Baja</option>
                                        <option value="Media">Media</option>
                                        <option value="Alta">Alta</option>
                                    </select>
                                    <p className="descripcion-campo">Prioridad que se asignará a los tickets de esta categoría.</p>
                                </div>


                                <div className="grupo-formulario">
                                    <label>Subcategorías</label>
                                    <div className="input-con-boton">
                                        <input
                                            type="text"
                                            value={nuevaSubcategoria}
                                            onChange={(e) => setNuevaSubcategoria(e.target.value)}
                                            placeholder="Nombre de la subcategoría"
                                        />
                                        <button type="button" onClick={agregarSubcategoria}>Agregar</button>
                                    </div>
                                    {errores.subcategorias && <span className="mensaje-error">{errores.subcategorias}</span>}
                                    <ul className="lista-subcategorias">
                                        {formData.subcategorias.map((sub, index) => (
                                            <li key={index}>
                                                <span>{sub.nombre}</span>
                                                <button type="button" onClick={() => eliminarSubcategoria(sub.nombre)}>×</button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="grupo-formulario checkbox-container">
                                    <input
                                        id="activo"
                                        type="checkbox"
                                        checked={formData.activo}
                                        onChange={(e) => manejarCambio('activo', e.target.checked)}
                                    />
                                    <label htmlFor="activo" className="checkbox-label">Categoría Activa</label>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="modal-acciones">
                        <button type="button" onClick={onCancelar} className="btn-modal btn-cancelar">
                            Cancelar
                        </button>

                        {!mensajeExito && (
                            <button type="submit" className="btn-modal btn-guardar">
                                {esModoEdicion ? 'Actualizar' : 'Crear'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CategoryModal;