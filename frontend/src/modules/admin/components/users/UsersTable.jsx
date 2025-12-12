// src/modules/admin/components/users/UsersTable.jsx
import React from 'react';
import { FiEdit, FiTrash2 } from 'react-icons/fi'; // Usando Feather Icons para un estilo más moderno
import './UsersTable.css';

const UsersTable = ({
    usuarios,
    cargando,
    onEditarUsuario,
    onEliminarUsuario,
    onToggleEstado
}) => {
    if (cargando) {
        return <div className="tabla-cargando">Cargando usuarios...</div>;
    }

    if (!usuarios || usuarios.length === 0) {
        return <div className="tabla-vacia">No se encontraron usuarios</div>;
    }

    return (
        <div className="contenedor-tabla">
            <table className="tabla-usuarios">
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>Tickets</th>
                        <th>Registro</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {usuarios.map((usuario) => (
                        <tr key={usuario.id} className={!usuario.esta_activo ? 'usuario-inactivo' : ''}>
                            <td>
                                <div className="celda-usuario">
                                    <span className="usuario-username">{usuario.username}</span>
                                </div>
                            </td>
                            <td>{usuario.nombre_completo}</td>
                            <td>{usuario.email}</td>
                            <td>
                                <span className={`badge-rol rol-${(typeof usuario.role === 'string' ? usuario.role : usuario.role?.nombre_clave) || 'sin-rol'}`}>
                                    {(typeof usuario.role === 'string' ? usuario.role : usuario.role?.nombre_visible) || 'Sin rol'}
                                </span>
                            </td>
                            <td>
                                <button
                                    onClick={() => onToggleEstado(usuario.id)}
                                    className={`btn-estado ${usuario.esta_activo ? 'activo' : 'inactivo'}`}
                                >
                                    {usuario.esta_activo ? 'Activo' : 'Inactivo'}
                                </button>
                            </td>
                            <td>
                                <span className="cantidad-tickets">
                                    {usuario.total_tickets_asignados}
                                </span>
                            </td>
                            <td>
                                {new Date(usuario.fecha_registro).toLocaleDateString()}
                            </td>
                            <td>
                                <div className="contenedor-acciones">
                                    <button
                                        onClick={() => onEditarUsuario(usuario)}
                                        className="btn-accion btn-editar"
                                        title="Editar usuario"
                                    >
                                        <FiEdit />
                                    </button>
                                    <button
                                        onClick={() => onEliminarUsuario(usuario)}
                                        className="btn-accion btn-eliminar"
                                        title="Eliminar usuario"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UsersTable;