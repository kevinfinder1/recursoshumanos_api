// src/modules/admin/pages/CategoriesListPage.jsx
import React, { useState, useEffect } from 'react';
import { useAdminCategories } from '../hooks/useAdminCategories';
import API from '../../../api/axiosInstance'; // Usaremos la instancia general de API
import CategoriesTable from '../components/categories/CategoriesTable';
import CategoryModal from '../components/categories/CategoryModal';
import ConfirmModal from '../components/common/ConfirmModal';
import './CategoriesListPage.css';

const IconoCrear = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

// --- Iconos para Estadísticas ---
const IconoTotalCategorias = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
const IconoActivas = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const IconoInactivas = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>;

const CategoriesListPage = () => {
    // Aquí me traigo todo lo que necesito del hook de categorías: la lista, el estado de carga, errores, etc.
    const {
        categorias,
        cargando,
        error,
        estadisticas,
        crearCategoria,
        actualizarCategoria,
        eliminarCategoria,
        toggleEstadoCategoria
    } = useAdminCategories();

    // Estados para controlar los modales y mensajes
    const [modalAbierto, setModalAbierto] = useState(false); // Para saber si el modal de crear/editar está abierto
    const [categoriaEditando, setCategoriaEditando] = useState(null); // Aquí guardo la categoría que estoy editando
    const [categoriaEliminar, setCategoriaEliminar] = useState(null); // Para guardar la categoría a borrar y mostrar el modal de confirmación
    const [mensajeExito, setMensajeExito] = useState(''); // Para el mensajito verde de "todo salió bien"
    const [opcionesRol, setOpcionesRol] = useState([]); // Roles para el select del modal
    const [opcionesPrioridad, setOpcionesPrioridad] = useState([]); // ✅ NUEVO: Prioridades para el select del modal

    useEffect(() => {
        // Este efecto se corre una sola vez para ir a buscar los roles y prioridades a la API
        const cargarOpciones = async () => {
            try {
                // ✅ MEJORA: Cargar roles y prioridades en paralelo para más eficiencia
                const [resRoles, resPrioridades] = await Promise.all([
                    API.get('/adminpanel/roles/'),
                    API.get('/adminpanel/prioridades/') // ✅ CORRECCIÓN: El endpoint es en plural, como se define en urls.py
                ]);

                // Procesar roles
                const rolesData = resRoles.data.results || resRoles.data || [];
                const opcionesFormateadas = rolesData.map(rol => ({
                    value: rol.id,
                    label: rol.nombre_visible
                }));
                setOpcionesRol(opcionesFormateadas);

                // ✅ NUEVO: Procesar prioridades
                const prioridadesData = resPrioridades.data.results || resPrioridades.data || [];
                const opcionesPrioridadFormateadas = prioridadesData.map(p => ({
                    value: p.id,
                    label: p.nombre
                }));
                setOpcionesPrioridad(opcionesPrioridadFormateadas);

            } catch (error) {
                console.error("Error al cargar las opciones para el modal:", error);
            }
        };
        cargarOpciones();
    }, []);

    // Esta función abre el modal. Si le paso una categoría, es para editar. Si no, para crear.
    const manejarAbrirModal = (categoria = null) => {
        setCategoriaEditando(categoria);
        setModalAbierto(true);
    };

    // Cierra el modal y limpia los estados para que no quede basura de la vez anterior.
    const manejarCerrarModal = () => {
        setModalAbierto(false);
        setCategoriaEditando(null);
        setMensajeExito('');
    };

    // La lógica gorda para guardar. Decide si tiene que actualizar o crear una nueva.
    const manejarGuardarCategoria = async (datosCategoria) => {
        let resultado;
        // Si hay una categoría en 'categoriaEditando', actualizamos. Si no, creamos.
        if (categoriaEditando) {
            resultado = await actualizarCategoria(categoriaEditando.id, datosCategoria);
        } else {
            resultado = await crearCategoria(datosCategoria);
        }

        if (resultado.exito) {
            // Si todo fue bien, muestro un mensaje de éxito y cierro el modal después de un ratito.
            setMensajeExito(
                categoriaEditando
                    ? 'Categoría actualizada exitosamente'
                    : 'Categoría creada exitosamente'
            );
            setTimeout(() => {
                manejarCerrarModal();
            }, 1500);
        }
    };

    // Para el switch de 'Activo'/'Inactivo' en la tabla.
    const manejarToggleEstado = async (categoriaId, estadoActual) => {
        await toggleEstadoCategoria(categoriaId, estadoActual);
    };

    // Se llama desde el modal de confirmación para borrar la categoría de verdad.
    const manejarEliminarCategoria = async () => {
        if (categoriaEliminar) {
            await eliminarCategoria(categoriaEliminar.id);
            setCategoriaEliminar(null);
        }
    };

    return (
        <div className="pagina-lista-categorias">
            <div className="pagina-header">
                <div>
                    <h1>Gestión de Categorías</h1>
                    <p className="pagina-subtitulo">
                        Administra las categorías disponibles para los tickets
                    </p>
                </div>
                <div className="header-acciones">
                    <button onClick={() => manejarAbrirModal()} className="btn-crear-categoria">
                        <IconoCrear /> Crear Categoría
                    </button>
                </div>
            </div>

            {/* Si hay un error del hook, lo muestro aquí arriba */}
            {error && (
                <div className="mensaje-error">
                    {typeof error === 'object' ? JSON.stringify(error) : error}
                </div>
            )}

            {/* El mensajito de éxito que aparece y desaparece */}
            {mensajeExito && (
                <div className="mensaje-exito">
                    {mensajeExito}
                </div>
            )}

            {/* Las tarjetitas con los números totales */}
            {/* Estadísticas rápidas */}
            {estadisticas && (
                <div className="estadisticas-categorias">
                    <div className="tarjeta-estadistica total">
                        <div className="estadistica-icono"><IconoTotalCategorias /></div>
                        <div className="estadistica-info">
                            <span className="valor-estadistica">{estadisticas.total_categorias}</span>
                            <span className="estadistica-label">Total Categorías</span>
                        </div>
                    </div>
                    <div className="tarjeta-estadistica activas">
                        <div className="estadistica-icono"><IconoActivas /></div>
                        <div className="estadistica-info">
                            <span className="valor-estadistica">{estadisticas.categorias_activas}</span>
                            <span className="estadistica-label">Activas</span>
                        </div>
                    </div>
                    <div className="tarjeta-estadistica inactivas">
                        <div className="estadistica-icono"><IconoInactivas /></div>
                        <div className="estadistica-info">
                            <span className="valor-estadistica">{estadisticas.categorias_inactivas}</span>
                            <span className="estadistica-label">Inactivas</span>
                        </div>
                    </div>
                </div>
            )}

            {/* La tabla principal donde se lista todo */}
            <CategoriesTable
                categorias={categorias}
                cargando={cargando}
                onEditarCategoria={manejarAbrirModal}
                onEliminarCategoria={setCategoriaEliminar}
                onToggleEstado={manejarToggleEstado}
            />

            {/* El modal para crear o editar, solo se muestra si modalAbierto es true */}
            {/* Modal para crear/editar categoría */}
            {modalAbierto && (
                <CategoryModal
                    categoria={categoriaEditando}
                    onGuardar={manejarGuardarCategoria}
                    onCancelar={manejarCerrarModal}
                    mensajeExito={mensajeExito}
                    opcionesRol={opcionesRol} // Pasar la lista de roles al modal
                    opcionesPrioridad={opcionesPrioridad} // ✅ NUEVO: Pasar la lista de prioridades al modal
                />
            )}

            {/* El modal de confirmación para no borrar cosas por accidente */}
            {/* Modal de confirmación para eliminar */}
            {categoriaEliminar && (
                <ConfirmModal
                    titulo="Eliminar Categoría"
                    mensaje={`¿Estás seguro de que quieres eliminar la categoría "${categoriaEliminar.nombre}"?`}
                    onConfirmar={manejarEliminarCategoria}
                    onCancelar={() => setCategoriaEliminar(null)}
                />
            )}
        </div>
    );
};

export default CategoriesListPage;