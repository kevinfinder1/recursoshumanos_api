// src/components/solicitante/UserTicketForm.jsx
import React, { useEffect, useState } from "react";
import {
    FileUp,
    Type,
    FileText,
    Layers,
    Flag,
    FolderOpen,
    Upload,
} from "lucide-react";

import { fetchCategorias, fetchSubcategorias } from "../../../api/userTickets";
import "./Form.css";

export default function UserTicketForm({
    initialValues = {},
    onSubmit,
    submitting,
    mode = "create",
    errorMessage,
}) {
    const [form, setForm] = useState({
        titulo: initialValues.titulo || "",
        descripcion: initialValues.descripcion || "",
        categoria_principal: initialValues.categoria_principal || "",
        subcategoria: initialValues.subcategoria || "",
        archivo_adjunto: null,
    });

    const [categorias, setCategorias] = useState([]);
    const [subcategorias, setSubcategorias] = useState([]);
    const [loadingCategorias, setLoadingCategorias] = useState(false);
    const [loadingSubcategorias, setLoadingSubcategorias] = useState(false);
    const [prioridadAsignada, setPrioridadAsignada] = useState(null);

    useEffect(() => {
        const loadCategorias = async () => {
            setLoadingCategorias(true);
            try {
                const data = await fetchCategorias();
                setCategorias(Array.isArray(data) ? data : []);
            } catch {
                setCategorias([]);
            } finally {
                setLoadingCategorias(false);
            }
        };
        loadCategorias();
    }, []);

    useEffect(() => {
        const loadSubs = async () => {
            if (!form.categoria_principal) {
                setSubcategorias([]);
                return;
            }
            setLoadingSubcategorias(true);
            try {
                const data = await fetchSubcategorias(form.categoria_principal);
                setSubcategorias(Array.isArray(data) ? data : []);
            } catch {
                setSubcategorias([]);
            } finally {
                setLoadingSubcategorias(false);
            }
        };
        loadSubs();
    }, [form.categoria_principal]);

    // ✅ NUEVO: Efecto para mostrar la prioridad cuando cambia la categoría
    useEffect(() => {
        if (form.categoria_principal) {
            const categoriaSeleccionada = categorias.find(
                (c) => c.id.toString() === form.categoria_principal.toString()
            );
            if (categoriaSeleccionada) {
                setPrioridadAsignada(categoriaSeleccionada.prioridad_automatica);
            }
        } else {
            // Si no hay categoría, se oculta el campo de prioridad
            setPrioridadAsignada(null);
        }
    }, [form.categoria_principal, categorias]);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === "archivo_adjunto") {
            setForm((prev) => ({ ...prev, [name]: files[0] }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    return (
        <form
            className="ticket-form premium-form"
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit(form);
            }}
        >
            {/* ERROR */}
            {errorMessage && <div className="error-box mb-3">{errorMessage}</div>}

            {/* TÍTULO */}
            <div className="premium-field">
                <label className="premium-label">
                    <Type className="field-icon" />
                    Título del ticket
                </label>
                <input
                    type="text"
                    name="titulo"
                    value={form.titulo}
                    onChange={handleChange}
                    required
                    maxLength={255}
                    className="premium-input"
                    placeholder="Escribe un título claro y breve..."
                />
            </div>

            {/* DESCRIPCIÓN */}
            <div className="premium-field">
                <label className="premium-label">
                    <FileText className="field-icon" />
                    Descripción
                </label>
                <textarea
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="premium-textarea"
                    placeholder="Describe el problema o solicitud con el mayor detalle posible..."
                ></textarea>
            </div>

            {/* CATEGORÍA */}
            <div className="premium-field">
                <label className="premium-label">
                    <Layers className="field-icon" />
                    Categoría principal
                </label>

                {loadingCategorias ? (
                    <p className="loading-text">Cargando categorías…</p>
                ) : (
                    <select
                        name="categoria_principal"
                        value={form.categoria_principal}
                        onChange={handleChange}
                        required
                        className="premium-select"
                    >
                        <option value="">Selecciona una categoría</option>
                        {categorias.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.nombre}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* ✅ NUEVO: Mostrar la prioridad asignada automáticamente */}
            {prioridadAsignada && (
                <div className="premium-field">
                    <label className="premium-label">
                        <Flag className="field-icon" />
                        Prioridad Asignada
                    </label>
                    <div
                        className={`priority-display priority-${prioridadAsignada.toLowerCase()}`}
                    >
                        {prioridadAsignada}
                    </div>
                </div>
            )}

            {/* SUBCATEGORÍA */}
            <div className="premium-field">
                <label className="premium-label">
                    <FolderOpen className="field-icon" />
                    Subcategoría
                </label>

                {loadingSubcategorias ? (
                    <p className="loading-text">Cargando subcategorías…</p>
                ) : (
                    <select
                        name="subcategoria"
                        value={form.subcategoria}
                        onChange={handleChange}
                        className="premium-select"
                        disabled={!form.categoria_principal}
                    >
                        <option value="">Opcional</option>
                        {subcategorias.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.nombre}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* ARCHIVO ADJUNTO */}
            <div className="premium-field">
                <label className="premium-label">
                    <Upload className="field-icon" />
                    Archivo adjunto (opcional)
                </label>
                <input
                    type="file"
                    name="archivo_adjunto"
                    accept="image/*,application/pdf"
                    onChange={handleChange}
                    className="premium-file"
                />
            </div>

            {/* BOTÓN */}
            <button type="submit" className="btn-red large-btn" disabled={submitting}>
                {submitting
                    ? "Guardando..."
                    : mode === "create"
                        ? "Crear Ticket"
                        : "Guardar Cambios"}
                <FileUp className="ml-2 w-4 h-4" />
            </button>
        </form>
    );
}
