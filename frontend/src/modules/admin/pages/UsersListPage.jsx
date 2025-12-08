// src/modules/admin/pages/UsersListPage.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { adminGeneralApi } from '../api/adminGeneralApi'; // API para áreas y roles
import usePresence from '../api/usePresence';
import UsersTable from '../components/users/UsersTable';
import UsersFilters from '../components/users/UsersFilters';
import UserModal from '../components/users/UserModal';
import ConfirmModal from '../components/common/ConfirmModal';
import './UsersListPage.css';

const IconoCrear = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconoAnterior = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const IconoSiguiente = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;


const UsersListPage = () => {
    const {
        usuarios,
        cargando,
        error,
        filtros,
        crearUsuario,
        actualizarUsuario,
        eliminarUsuario,
        toggleEstadoUsuario,
        aplicarFiltros,
        obtenerOpcionesFiltro,
        paginacion,
        cambiarPagina
    } = useAdminUsers();

    // onlineUsers es un Set, no un Array
    const onlineUsers = usePresence();

    // CORRECCIÓN: Convertir Set a Array y manejar correctamente
    const usuariosConPresencia = useMemo(() => {
        if (!usuarios) return [];

        // Convertir Set de onlineUsers a Array para poder usar .some()
        const onlineUsersArray = Array.from(onlineUsers);

        return usuarios.map(usuario => ({
            ...usuario,
            // Usar .includes() en lugar de .some() para el Array
            isOnline: onlineUsersArray.includes(usuario.id)
        }));
    }, [usuarios, onlineUsers]);

    const [modalAbierto, setModalAbierto] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState(null);
    const [usuarioEliminar, setUsuarioEliminar] = useState(null);
    const [mensajeExito, setMensajeExito] = useState('');
    const [opcionesArea, setOpcionesArea] = useState([]);
    const [opcionesRol, setOpcionesRol] = useState([]);

    useEffect(() => {
        const cargarOpciones = async () => {
            try {
                const [areasData, rolesData] = await Promise.all([
                    adminGeneralApi.obtenerAreas(),
                    adminGeneralApi.obtenerRoles()
                ]);
                // ✅ CORRECCIÓN: Extraer el array 'results' de la respuesta paginada.
                setOpcionesArea(areasData.results || areasData);

                // ✅ SOLUCIÓN: Transformar la respuesta de roles al formato { value, label }
                const roles = rolesData.results || rolesData;
                const rolesFormateados = Array.isArray(roles)
                    ? roles.map(rol => ({ value: rol.id, label: rol.nombre_visible })) // ✅ SOLUCIÓN: Usar rol.nombre_visible
                    : [];
                setOpcionesRol(rolesFormateados);
            } catch (error) {
                console.error("Error al cargar opciones de área y rol:", error);
            }
        };
        cargarOpciones();
    }, []);

    const manejarAbrirModal = (usuario = null) => {
        setUsuarioEditando(usuario);
        setModalAbierto(true);
    };

    const manejarCerrarModal = () => {
        setModalAbierto(false);
        setUsuarioEditando(null);
        setMensajeExito('');
    };

    const manejarGuardarUsuario = async (datosUsuario) => {
        let resultado;

        if (usuarioEditando) {
            resultado = await actualizarUsuario(usuarioEditando.id, datosUsuario);
        } else {
            resultado = await crearUsuario(datosUsuario);
        }

        if (resultado.exito) {
            setMensajeExito(
                usuarioEditando
                    ? 'Usuario actualizado exitosamente'
                    : 'Usuario creado exitosamente'
            );
            setTimeout(() => {
                manejarCerrarModal();
            }, 1500);
        }
    };

    const manejarToggleEstado = async (usuarioId) => {
        await toggleEstadoUsuario(usuarioId);
    };

    const manejarEliminarUsuario = async () => {
        if (usuarioEliminar) {
            await eliminarUsuario(usuarioEliminar.id);
            setUsuarioEliminar(null);
        }
    };

    return (
        <div className="pagina-lista-usuarios">
            <div className="pagina-header">
                <div>
                    <h1>Gestión de Usuarios</h1>
                    {/* Mostrar contador de usuarios en línea */}
                    <small>Usuarios en línea: {onlineUsers.size}</small>
                </div>
                <div className="header-acciones">
                    <button onClick={() => manejarAbrirModal()} className="btn-crear-usuario">
                        <IconoCrear /> Crear Usuario
                    </button>
                </div>
            </div>

            {error && (
                <div className="mensaje-error">
                    {typeof error === 'object' ? JSON.stringify(error) : error}
                </div>
            )}

            {mensajeExito && (
                <div className="mensaje-exito">
                    {mensajeExito}
                </div>
            )}

            <UsersFilters
                filtrosAplicados={filtros}
                onFiltrosChange={aplicarFiltros}
                opciones={{ roles: opcionesRol, areas: opcionesArea }} // ✅ SOLUCIÓN: Pasar las opciones al componente de filtros
            />

            <UsersTable
                usuarios={usuariosConPresencia}
                cargando={cargando}
                onEditarUsuario={manejarAbrirModal}
                onEliminarUsuario={setUsuarioEliminar}
                onToggleEstado={manejarToggleEstado}
            // onlineUsers ya no se pasa por separado
            />

            {/* ✅ SOLUCIÓN: Añadir controles de paginación */}
            {paginacion && paginacion.total_pages > 1 && (
                <div className="paginacion-controles">
                    <button
                        onClick={() => cambiarPagina(paginacion.current_page - 1)}
                        disabled={!paginacion.previous}
                    >
                        <IconoAnterior /> Anterior
                    </button>
                    <span>
                        Página {paginacion.current_page} de {paginacion.total_pages}
                    </span>
                    <button
                        onClick={() => cambiarPagina(paginacion.current_page + 1)}
                        disabled={!paginacion.next}
                    >
                        Siguiente <IconoSiguiente />
                    </button>
                </div>
            )}

            {/* Modal para crear/editar usuario */}
            {modalAbierto && (
                <UserModal
                    usuario={usuarioEditando}
                    onGuardar={manejarGuardarUsuario}
                    onCancelar={manejarCerrarModal}
                    mensajeExito={mensajeExito}
                    opcionesRol={opcionesRol}
                    opcionesArea={opcionesArea}
                />
            )}

            {/* Modal de confirmación para eliminar */}
            {usuarioEliminar && (
                <ConfirmModal
                    titulo="Eliminar Usuario"
                    mensaje={`¿Estás seguro de que quieres eliminar al usuario "${usuarioEliminar.username}"?`}
                    onConfirmar={manejarEliminarUsuario}
                    onCancelar={() => setUsuarioEliminar(null)}
                />
            )}
        </div>
    );
};

export default UsersListPage;