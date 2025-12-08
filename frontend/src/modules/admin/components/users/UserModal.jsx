// src/modules/admin/components/users/UserModal.jsx
import React, { useState, useEffect } from 'react';
import RoleModal from './RoleModal'; // ✅ 1. Importar el nuevo modal de roles
import { adminUsersApi } from '../../api/adminUsersApi';
import './UserModal.css';

const UserModal = ({ usuario, onGuardar, onCancelar, mensajeExito, opcionesRol, opcionesArea }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        rol: '', // ✅ CORRECCIÓN: Usar 'rol' para que coincida con el backend y enviar el ID
        // --- NUEVOS CAMPOS ---
        tipo_documento: 'cedula',
        numero_documento: '',
        codigo_empleado: '',
        fecha_nacimiento: '',
        area: '',
        tiene_discapacidad: false,
        certificado_discapacidad: null,
        // --- FIN NUEVOS CAMPOS ---
        password: '',
        confirm_password: ''
    });

    const [errores, setErrores] = useState({});
    const [validando, setValidando] = useState(false);
    const [opcionesAreaLocales, setOpcionesAreaLocales] = useState(opcionesArea);
    const [opcionesRolLocales, setOpcionesRolLocales] = useState(opcionesRol);
    const [mostrarCamposPassword, setMostrarCamposPassword] = useState(false);
    const [mostrarContrasena, setMostrarContrasena] = useState(false); // ✅ Estado para ver/ocultar contraseña
    const [mostrandoModalRol, setMostrandoModalRol] = useState(false); // ✅ 2. Estado para controlar el modal de rol

    useEffect(() => {
        if (usuario) {
            // Modo edición
            setFormData({
                username: usuario.username || '',
                email: usuario.email || '',
                first_name: usuario.first_name || '',
                last_name: usuario.last_name || '',
                rol: usuario.rol || '',
                tipo_documento: usuario.tipo_documento || 'cedula',
                numero_documento: usuario.numero_documento || '',
                codigo_empleado: usuario.codigo_empleado || '',
                fecha_nacimiento: usuario.fecha_nacimiento || '',
                area: usuario.area || '',
                tiene_discapacidad: usuario.tiene_discapacidad || false,
                certificado_discapacidad: null, // El archivo no se carga para editar, solo se puede reemplazar
                password: '',
                confirm_password: ''
            });
            setMostrarCamposPassword(false); // Ocultar por defecto en edición
        } else {
            setMostrarCamposPassword(true); // Mostrar por defecto en creación
        }
    }, [usuario]);

    useEffect(() => {
        setOpcionesAreaLocales(opcionesArea);
    }, [opcionesArea]);

    useEffect(() => {
        setOpcionesRolLocales(opcionesRol);
    }, [opcionesRol]);
    const manejarCambio = (e) => {
        const { name, value, type, checked, files } = e.target;
        const valor = type === 'checkbox' ? checked : (type === 'file' ? files[0] : value);

        setFormData(prev => ({ ...prev, [name]: valor }));
        if (errores[name]) {
            setErrores(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validarFormulario = () => {
        const nuevosErrores = {};

        if (!formData.username.trim()) {
            nuevosErrores.username = 'El usuario es requerido';
        } else if (formData.username.length < 3) {
            nuevosErrores.username = 'El usuario debe tener al menos 3 caracteres';
        }

        if (!formData.email.trim()) {
            nuevosErrores.email = 'El email es requerido';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            nuevosErrores.email = 'El email no es válido';
        }

        // --- Lógica de validación de contraseña REESTRUCTURADA ---
        const esCreacion = !usuario;
        const seIntentaCambiarPassword = formData.password || formData.confirm_password;

        if (esCreacion || seIntentaCambiarPassword) {
            if (!formData.password) {
                nuevosErrores.password = 'La contraseña es requerida';
            } else if (formData.password.length < 8) {
                nuevosErrores.password = 'La contraseña debe tener al menos 8 caracteres';
            }

            if (formData.password !== formData.confirm_password) {
                nuevosErrores.confirm_password = 'Las contraseñas no coinciden';
            }
        }
        if (!formData.rol) {
            nuevosErrores.rol = 'El rol es requerido';
        }

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    const manejarSubmit = async (e) => {
        e.preventDefault();

        if (!validarFormulario()) {
            return;
        }

        setValidando(true);

        try {
            // Usar FormData para poder enviar archivos
            const datosParaEnviar = new FormData();
            for (const key in formData) {
                if (key === 'password' && usuario && !formData.password) {
                    continue; // No enviar contraseña vacía en modo edición
                }

                // DEBUG: Ver qué se está enviando
                console.log(`Enviando ${key}:`, formData[key], 'Tipo:', typeof formData[key]);

                if (formData[key] !== null && formData[key] !== undefined) {
                    datosParaEnviar.append(key, formData[key]);
                }
            }

            await onGuardar(datosParaEnviar);
        } catch (error) {
            // DEBUG: Ver el error completo que devuelve el backend
            console.error('Error completo:', error);
            // Capturar errores del servidor y mostrarlos en el formulario
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                if (typeof errorData === 'object' && errorData !== null) {
                    setErrores(prev => ({ ...prev, ...errorData }));
                } else {
                    // Si el error no es un objeto, mostrarlo como un error general
                    setErrores(prev => ({ ...prev, detail: 'Ocurrió un error inesperado.' }));
                }
            }
        } finally {
            setValidando(false);
        }
    };

    const manejarCrearArea = async () => {
        const nombreNuevaArea = window.prompt('Introduce el nombre de la nueva área:');
        if (nombreNuevaArea && nombreNuevaArea.trim() !== '') {
            try {
                // Asumimos que existe una función `crearArea` en tu API
                const nuevaArea = await adminUsersApi.crearArea({ nombre: nombreNuevaArea.trim() });

                // Actualizamos la lista de opciones de área localmente
                const nuevasOpciones = [...opcionesAreaLocales, nuevaArea];
                setOpcionesAreaLocales(nuevasOpciones);

                // Seleccionamos la nueva área en el formulario
                setFormData(prev => ({ ...prev, area: nuevaArea.id }));

                alert(`Área "${nuevaArea.nombre}" creada con éxito.`);

            } catch (error) {
                console.error('Error al crear el área:', error);
                alert('Hubo un error al crear el área. Revisa la consola para más detalles.');
            }
        }
    };

    // ✅ 3. Nueva función para manejar el guardado del rol desde el RoleModal
    const manejarRolGuardado = (nuevoRol) => {
        // El backend devuelve { id, name }, lo transformamos a { value, label }
        const rolFormateado = { value: nuevoRol.id, label: nuevoRol.nombre_visible }; // ✅ SOLUCIÓN: Usar nuevoRol.nombre_visible

        // Actualizamos la lista de opciones de rol localmente
        const nuevasOpciones = [...opcionesRolLocales, rolFormateado];
        setOpcionesRolLocales(nuevasOpciones);

        // Seleccionamos el nuevo rol en el formulario
        setFormData(prev => ({ ...prev, rol: nuevoRol.id }));

        // Cerramos el modal de rol
        setMostrandoModalRol(false);
        alert(`Rol "${nuevoRol.nombre_visible}" creado y seleccionado.`); // ✅ SOLUCIÓN: Usar nuevoRol.nombre_visible
    };
    const esModoEdicion = !!usuario;

    return (
        <div className="modal-overlay">
            <div className="modal-usuario" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="modal-header">
                    <h3>{esModoEdicion ? 'Editar Usuario' : 'Crear Usuario'}</h3>
                    <button onClick={onCancelar} className="btn-cerrar-modal">×</button>
                </div>

                {/* ✅ 4. Renderizar el modal de rol si está activo */}
                {mostrandoModalRol && (
                    <RoleModal
                        onGuardar={manejarRolGuardado}
                        onCancelar={() => setMostrandoModalRol(false)}
                    />
                )}

                <form onSubmit={manejarSubmit} className="formulario-usuario">
                    <div className="modal-contenido">
                        {mensajeExito ? (
                            <div className="mensaje-exito-modal">
                                {mensajeExito}
                            </div>
                        ) : (
                            <>
                                {errores.detail && <div className="mensaje-error-general">{errores.detail}</div>}

                                {/* Username */}
                                <div className="grupo-formulario">
                                    <label htmlFor="username">Usuario *</label>
                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        value={formData.username}
                                        onChange={manejarCambio}
                                        className={errores.username ? 'input-error' : ''}
                                        disabled={esModoEdicion}
                                    />
                                    {errores.username && (
                                        <span className="mensaje-error">{Array.isArray(errores.username) ? errores.username.join(' ') : errores.username}</span>
                                    )}
                                </div>

                                {/* Email */}
                                <div className="grupo-formulario">
                                    <label htmlFor="email">Email *</label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={manejarCambio}
                                        className={errores.email ? 'input-error' : ''}
                                    />
                                    {errores.email && (
                                        <span className="mensaje-error">{Array.isArray(errores.email) ? errores.email.join(' ') : errores.email}</span>
                                    )}
                                </div>

                                {/* Nombre y Apellido */}
                                <div className="grupo-doble">
                                    <div className="grupo-formulario">
                                        <label htmlFor="first_name">Nombre</label>
                                        <input
                                            id="first_name"
                                            name="first_name"
                                            type="text"
                                            value={formData.first_name}
                                            onChange={manejarCambio}
                                            className={errores.first_name ? 'input-error' : ''}
                                        />
                                        {errores.first_name && (
                                            <span className="mensaje-error">{Array.isArray(errores.first_name) ? errores.first_name.join(' ') : errores.first_name}</span>
                                        )}
                                    </div>
                                    <div className="grupo-formulario">
                                        <label htmlFor="last_name">Apellido</label>
                                        <input
                                            id="last_name"
                                            name="last_name"
                                            type="text"
                                            value={formData.last_name}
                                            onChange={manejarCambio}
                                            className={errores.last_name ? 'input-error' : ''}
                                        />
                                        {errores.last_name && (
                                            <span className="mensaje-error">{Array.isArray(errores.last_name) ? errores.last_name.join(' ') : errores.last_name}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Rol */}
                                <div className="grupo-formulario">
                                    <label htmlFor="rol">Rol *</label>
                                    <div className="input-con-boton">
                                        <select
                                            id="rol"
                                            name="rol"
                                            value={formData.rol}
                                            onChange={manejarCambio}
                                            className={errores.rol ? 'input-error' : ''}
                                        >
                                            <option value="">Seleccionar rol</option>
                                            {opcionesRolLocales.map((rol) => (
                                                <option key={rol.value} value={rol.value}>
                                                    {rol.label}
                                                </option>
                                            ))}
                                        </select>
                                        <button type="button" onClick={() => setMostrandoModalRol(true)} title="Crear nuevo rol">+</button>
                                    </div>
                                    {errores.rol && (
                                        <span className="mensaje-error">{errores.rol}</span>
                                    )}
                                </div>

                                {/* --- NUEVOS CAMPOS DE RRHH --- */}
                                <div className="grupo-doble">
                                    <div className="grupo-formulario">
                                        <label htmlFor="tipo_documento">Tipo Documento</label>
                                        <select id="tipo_documento" name="tipo_documento" value={formData.tipo_documento} onChange={manejarCambio} className={errores.tipo_documento ? 'input-error' : ''}>
                                            <option key="cedula" value="cedula">Cédula</option>
                                            <option key="pasaporte" value="pasaporte">Pasaporte</option>
                                        </select>
                                        {errores.tipo_documento && (
                                            <span className="mensaje-error">{Array.isArray(errores.tipo_documento) ? errores.tipo_documento.join(' ') : errores.tipo_documento}</span>
                                        )}
                                    </div>
                                    <div className="grupo-formulario">
                                        <label htmlFor="numero_documento">Nº Documento</label>
                                        <input id="numero_documento" name="numero_documento" type="text" value={formData.numero_documento} onChange={manejarCambio} className={errores.numero_documento ? 'input-error' : ''} />
                                        {errores.numero_documento && (
                                            <span className="mensaje-error">{Array.isArray(errores.numero_documento) ? errores.numero_documento.join(' ') : errores.numero_documento}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="grupo-doble">
                                    <div className="grupo-formulario">
                                        <label htmlFor="codigo_empleado">Código Empleado</label>
                                        <input id="codigo_empleado" name="codigo_empleado" type="text" value={formData.codigo_empleado} onChange={manejarCambio} className={errores.codigo_empleado ? 'input-error' : ''} />
                                        {errores.codigo_empleado && (
                                            <span className="mensaje-error">{Array.isArray(errores.codigo_empleado) ? errores.codigo_empleado.join(' ') : errores.codigo_empleado}</span>
                                        )}
                                    </div>
                                    <div className="grupo-formulario">
                                        <label htmlFor="fecha_nacimiento">Fecha Nacimiento</label>
                                        <input id="fecha_nacimiento" name="fecha_nacimiento" type="date" value={formData.fecha_nacimiento} onChange={manejarCambio} className={errores.fecha_nacimiento ? 'input-error' : ''} />
                                        {errores.fecha_nacimiento && (
                                            <span className="mensaje-error">{Array.isArray(errores.fecha_nacimiento) ? errores.fecha_nacimiento.join(' ') : errores.fecha_nacimiento}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="grupo-formulario">
                                    <label htmlFor="area">Área / Departamento</label>
                                    <div className="input-con-boton">
                                        <select id="area" name="area" value={formData.area} onChange={manejarCambio} className={errores.area ? 'input-error' : ''}>
                                            <option value="">Seleccionar área</option>
                                            {opcionesAreaLocales.map((area) => (
                                                <option key={area.id} value={area.id}>
                                                    {area.nombre}
                                                </option>
                                            ))}
                                        </select>
                                        <button type="button" onClick={manejarCrearArea} title="Crear nueva área">+</button>
                                    </div>
                                    {errores.area && (
                                        <span className="mensaje-error">{Array.isArray(errores.area) ? errores.area.join(' ') : errores.area}</span>
                                    )}
                                </div>

                                <div className="grupo-formulario checkbox-container">
                                    <input
                                        id="tiene_discapacidad"
                                        name="tiene_discapacidad"
                                        type="checkbox"
                                        checked={formData.tiene_discapacidad}
                                        onChange={manejarCambio}
                                    />
                                    <label htmlFor="tiene_discapacidad" className="checkbox-label">Tiene Discapacidad</label>
                                </div>

                                {formData.tiene_discapacidad && (
                                    <div className="grupo-formulario">
                                        <label htmlFor="certificado_discapacidad">Certificado de Discapacidad</label>
                                        <input
                                            id="certificado_discapacidad"
                                            name="certificado_discapacidad"
                                            type="file"
                                            // No se puede aplicar input-error directamente a type="file" de forma estándar
                                            // pero el mensaje de error se mostrará debajo.
                                            // className={errores.certificado_discapacidad ? 'input-error' : ''}
                                            onChange={manejarCambio}
                                        />
                                        {usuario && usuario.certificado_discapacidad && (
                                            <p className="descripcion-campo">
                                                Archivo actual: <a href={usuario.certificado_discapacidad} target="_blank" rel="noopener noreferrer">Ver certificado</a>.
                                                <br />
                                                Selecciona un nuevo archivo para reemplazarlo.
                                            </p>
                                        )}
                                        {errores.certificado_discapacidad && (
                                            <span className="mensaje-error">{Array.isArray(errores.certificado_discapacidad) ? errores.certificado_discapacidad.join(' ') : errores.certificado_discapacidad}</span>
                                        )}
                                    </div>
                                )}

                                <hr className="separador-form" />
                                {/* --- FIN NUEVOS CAMPOS --- */}

                                {esModoEdicion && (
                                    <div className="grupo-formulario">
                                        <button type="button" className="btn-link" onClick={() => setMostrarCamposPassword(!mostrarCamposPassword)}>
                                            {mostrarCamposPassword ? 'Cancelar cambio de contraseña' : 'Cambiar contraseña'}
                                        </button>
                                    </div>
                                )}

                                {/* Contraseña (solo en creación o si se quiere cambiar) */}
                                {(!esModoEdicion || mostrarCamposPassword) && (
                                    <>
                                        <div className="grupo-formulario">
                                            <label htmlFor="password">
                                                {esModoEdicion ? 'Nueva Contraseña' : 'Contraseña *'}
                                            </label>
                                            {/* ✅ Contenedor para input y botón */}
                                            <div className="input-con-icono">
                                                <input
                                                    id="password"
                                                    name="password"
                                                    type={mostrarContrasena ? 'text' : 'password'}
                                                    value={formData.password}
                                                    onChange={manejarCambio}
                                                    className={errores.password ? 'input-error' : ''}
                                                    autoComplete="new-password"
                                                />
                                                <button
                                                    type="button"
                                                    className="btn-icono-input"
                                                    onClick={() => setMostrarContrasena(!mostrarContrasena)}
                                                    title={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                                                >
                                                    {mostrarContrasena ? '🙈' : '👁️'}
                                                </button>
                                            </div>
                                            {errores.password && (
                                                <span className="mensaje-error">{Array.isArray(errores.password) ? errores.password.join(' ') : errores.password}</span>
                                            )}
                                        </div>

                                        <div className="grupo-formulario">
                                            <label htmlFor="confirm_password">
                                                {esModoEdicion ? 'Confirmar Nueva Contraseña' : 'Confirmar Contraseña *'}
                                            </label>
                                            {/* ✅ Contenedor para input y botón */}
                                            <div className="input-con-icono">
                                                <input
                                                    id="confirm_password"
                                                    name="confirm_password"
                                                    type={mostrarContrasena ? 'text' : 'password'}
                                                    value={formData.confirm_password}
                                                    onChange={manejarCambio}
                                                    className={errores.confirm_password ? 'input-error' : ''}
                                                />
                                                <button
                                                    type="button"
                                                    className="btn-icono-input"
                                                    onClick={() => setMostrarContrasena(!mostrarContrasena)}
                                                    title={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                                                >
                                                    {mostrarContrasena ? '🙈' : '👁️'}
                                                </button>
                                            </div>
                                            {errores.confirm_password && (
                                                <span className="mensaje-error">{Array.isArray(errores.confirm_password) ? errores.confirm_password.join(' ') : errores.confirm_password}</span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>

                    <div className="modal-acciones">
                        <button
                            type="button"
                            onClick={onCancelar}
                            className="btn-modal btn-cancelar"
                            disabled={validando}
                        >
                            Cancelar
                        </button>

                        {!mensajeExito && (
                            <button
                                type="submit"
                                className="btn-modal btn-guardar"
                                disabled={validando}
                            >
                                {validando ? 'Guardando...' : (esModoEdicion ? 'Actualizar' : 'Crear')}
                            </button>
                        )}
                    </div>
                </form>
            </div >
        </div >
    );
};

export default UserModal;