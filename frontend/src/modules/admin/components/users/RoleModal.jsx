import React, { useState, useEffect } from 'react';
import { adminUsersApi } from '../../api/adminUsersApi';
import './UserModal.css'; // Reutilizamos los estilos del UserModal
import slugify from 'slugify'; // Necesitarás instalar esta librería: npm install slugify

const RoleModal = ({ onGuardar, onCancelar }) => {
    const [formData, setFormData] = useState({
        nombre_visible: '',
        nombre_clave: '',
        tipo_base: 'solicitante',
        descripcion: ''
    });
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);

    const manejarCambio = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Generar nombre clave automáticamente a partir del nombre visible
        if (name === 'nombre_visible') {
            const clave = slugify(value, { lower: true, strict: true, replacement: '_' });
            setFormData(prev => ({ ...prev, nombre_clave: clave }));
        }

        // Limpiar errores al escribir
        if (errores[name]) {
            setErrores(prev => ({ ...prev, [name]: null }));
        }
    };

    const validarFormulario = () => {
        const nuevosErrores = {};
        if (!formData.nombre_visible.trim()) {
            nuevosErrores.nombre_visible = 'El nombre visible es requerido.';
        }
        if (!formData.nombre_clave.trim()) {
            nuevosErrores.nombre_clave = 'El nombre clave es requerido.';
        } else if (!/^[a-z0-9_]+$/.test(formData.nombre_clave)) {
            nuevosErrores.nombre_clave = 'El nombre clave solo puede contener letras minúsculas, números y guiones bajos (_).';
        }

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    const manejarSubmit = async (e) => {
        e.preventDefault();
        if (!validarFormulario()) return;

        setGuardando(true);
        setErrores({});

        try {
            // Asumimos que el backend espera 'name' como el identificador único (nombre_clave)
            // y los otros campos son extra. Ajusta esto según tu Serializer de Django.
            const datosParaEnviar = {
                nombre_clave: formData.nombre_clave, // ✅ SOLUCIÓN: Enviar 'nombre_clave' en lugar de 'name'
                nombre_visible: formData.nombre_visible,
                tipo_base: formData.tipo_base,
                descripcion: formData.descripcion
            };

            const nuevoRol = await adminUsersApi.crearRol(datosParaEnviar);
            onGuardar(nuevoRol); // Devolvemos el rol completo
        } catch (err) {
            console.error("Error al crear el rol:", err);
            const errorData = err.response?.data;
            if (errorData && typeof errorData === 'object') {
                // Mapear errores del backend a los campos del formulario
                const erroresApi = {};
                if (errorData.nombre_clave) erroresApi.nombre_clave = errorData.nombre_clave.join(' '); // ✅ SOLUCIÓN: Mapear 'nombre_clave'
                if (errorData.nombre_visible) erroresApi.nombre_visible = errorData.nombre_visible.join(' ');
                setErrores(erroresApi);
            } else {
                setErrores({ general: 'Error al crear el rol. Puede que el nombre clave ya exista.' });
            }
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-usuario" style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h3>Crear Nuevo Rol</h3>
                    <button onClick={onCancelar} className="btn-cerrar-modal">×</button>
                </div>

                <form onSubmit={manejarSubmit} className="formulario-usuario">
                    <div className="modal-contenido">
                        {errores.general && <div className="mensaje-error-general">{errores.general}</div>}

                        <div className="grupo-formulario">
                            <label htmlFor="nombre_visible">Nombre visible *</label>
                            <input id="nombre_visible" name="nombre_visible" type="text" value={formData.nombre_visible} onChange={manejarCambio} placeholder="Ej: Agente de Inventario" autoFocus className={errores.nombre_visible ? 'input-error' : ''} />
                            <p className="descripcion-campo">Nombre para mostrar en la UI.</p>
                            {errores.nombre_visible && <span className="mensaje-error">{errores.nombre_visible}</span>}
                        </div>

                        <div className="grupo-formulario">
                            <label htmlFor="nombre_clave">Nombre clave *</label>
                            <input id="nombre_clave" name="nombre_clave" type="text" value={formData.nombre_clave} onChange={manejarCambio} placeholder="ej_agente_inventario" className={errores.nombre_clave ? 'input-error' : ''} />
                            <p className="descripcion-campo">Identificador interno, sin espacios ni mayúsculas.</p>
                            {errores.nombre_clave && <span className="mensaje-error">{errores.nombre_clave}</span>}
                        </div>

                        <div className="grupo-formulario">
                            <label htmlFor="tipo_base">Tipo base</label>
                            <select id="tipo_base" name="tipo_base" value={formData.tipo_base} onChange={manejarCambio}>
                                {/* ✅ CORRECCIÓN: Opciones alineadas con TIPO_ROL_CHOICES del modelo Rol */}
                                <option value="solicitante">Solicitante</option>
                                <option value="agente">Agente</option>
                                <option value="admin">Administrador</option>
                            </select>
                            <p className="descripcion-campo">El tipo base del rol define sus permisos fundamentales.</p>
                        </div>

                        <div className="grupo-formulario">
                            <label htmlFor="descripcion">Descripción</label>
                            <textarea id="descripcion" name="descripcion" value={formData.descripcion} onChange={manejarCambio} rows="3" placeholder="Describe brevemente las responsabilidades de este rol..."></textarea>
                        </div>
                    </div>

                    <div className="modal-acciones">
                        <button type="button" onClick={onCancelar} className="btn-modal btn-cancelar" disabled={guardando}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-modal btn-guardar" disabled={guardando}>
                            {guardando ? 'Guardando...' : 'Crear Rol'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RoleModal;