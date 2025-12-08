// src/modules/admin/components/categories/CategoriesTable.jsx
import React from 'react';
import './CategoriesTable.css';

const IconoEditar = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const IconoEliminar = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

const CategoriesTable = ({
    categorias,
    cargando,
    onEditarCategoria,
    onEliminarCategoria,
    onToggleEstado
}) => {
    if (cargando) {
        return <div className="tabla-cargando">Cargando categorías...</div>;
    }

    if (!categorias || categorias.length === 0) {
        return <div className="tabla-vacia">No se encontraron categorías</div>;
    }

    return (
        <div className="contenedor-tabla">
            <table className="tabla-categorias">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th>Tickets Totales</th>
                        <th>Tickets Abiertos</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {categorias.map((categoria) => (
                        <tr key={categoria.id} className={!categoria.activo ? 'categoria-inactiva' : ''}>
                            <td>
                                <div className="celda-categoria">
                                    <span className="categoria-nombre">{categoria.nombre}</span>
                                </div>
                            </td>
                            <td>
                                <span className="categoria-descripcion">
                                    {categoria.descripcion || 'Sin descripción'}
                                </span>
                            </td>
                            <td>
                                <span className="cantidad-tickets">
                                    {categoria.total_tickets || 0}
                                </span>
                            </td>
                            <td>
                                <span className="cantidad-abiertos">
                                    {categoria.tickets_abiertos || 0}
                                </span>
                            </td>
                            <td>
                                <button
                                    onClick={() => onToggleEstado(categoria.id, categoria.activo)}
                                    className={`btn-estado ${categoria.activo ? 'activo' : 'inactivo'}`}
                                >
                                    {categoria.activo ? 'Activa' : 'Inactiva'}
                                </button>
                            </td>
                            <td>
                                <div className="contenedor-acciones">
                                    <button
                                        onClick={() => onEditarCategoria(categoria)}
                                        className="btn-accion btn-editar"
                                        title="Editar categoría"
                                    >
                                        <IconoEditar />
                                    </button>
                                    <button
                                        onClick={() => onEliminarCategoria(categoria)}
                                        className="btn-accion btn-eliminar"
                                        title="Eliminar categoría"
                                    >
                                        <IconoEliminar />
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

export default CategoriesTable;