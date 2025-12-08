import React from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { Ticket, Bell, Settings, User, AlertCircle, Clock, CheckCircle2, ListChecks } from "lucide-react";
import { useUserDashboard } from "../hooks/useUserDashboard";
import "../styles/userPanel.css"; // Corrected path

export default function UsuarioDashboard() {
    const navigate = useNavigate();
    const location = useLocation();
    const { tickets, loading, error, reload, metrics, ultimos, sinRating, editables } = useUserDashboard();

    const isHome = location.pathname.endsWith("/usuario/dashboard");

    const stats = [
        { label: "Abiertos", value: metrics.abiertos, icon: AlertCircle, colorClass: "up-stat-blue" },
        { label: "Pendientes", value: metrics.pendientes, icon: Clock, colorClass: "up-stat-red" },
        { label: "En Proceso", value: metrics.enProceso, icon: ListChecks, colorClass: "up-stat-yellow" },
        { label: "Resueltos", value: metrics.resueltos, icon: CheckCircle2, colorClass: "up-stat-green" },
        { label: "Vencidos", value: metrics.vencidos, icon: AlertCircle, colorClass: "up-stat-red" },
        { label: "Total", value: metrics.total, icon: Ticket, colorClass: "up-stat-gray" },
    ];

    return (
        <div className="app-wrapper">

            {/* ===== CONTENT ===== */}
            <main className="main-content">

                {/* ===== STATS CARDS ===== */}
                <div className="up-stats-grid">
                    {stats.map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <div key={i} className={`up-stat-card ${s.colorClass}`}>
                                <div className="up-stat-header">
                                    <Icon className="stat-svg" size={24} strokeWidth={1.8} />
                                    <p className="up-stat-value">{loading ? "…" : s.value}</p>
                                </div>
                                <p className="up-stat-label">{s.label}</p>
                            </div>
                        );
                    })}
                </div>

                {/* ===== ACTION BAR ===== */}
                <div className="up-action-bar">
                    <div className="up-search-box">
                        <svg className="up-search-icon" width="20" height="20" opacity="0.5">
                            <circle cx="9" cy="9" r="7" stroke="white" fill="none" strokeWidth="2" />
                            <line x1="14" y1="14" x2="19" y2="19" stroke="white" strokeWidth="2" />
                        </svg>

                        <input
                            type="text"
                            placeholder="Buscar tickets..."
                            className="up-search-input"
                        />
                    </div>

                    <button
                        className="up-btn-red"
                        onClick={() => navigate("/usuario/tickets/nuevo")}
                    >
                        + Nuevo Ticket
                    </button>
                </div>

                {/* ===== CONTENT OUTLET OR HOME ===== */}
                {!isHome ? (
                    <Outlet context={{ tickets, loading, error, reload }} />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                        {/* Card: Últimos Tickets */}
                        <div className="up-dashboard-list-card">
                            <h3 className="up-dashboard-list-title">Últimos Tickets</h3>
                            <div className="up-dashboard-list-content">
                                {ultimos.length > 0 ? ultimos.map((t) => (
                                    <Link key={t.id} to={`/usuario/tickets/${t.id}`} className="up-dashboard-list-item">
                                        <div className="flex-grow">
                                            <span className="font-semibold">#{t.id} — {t.titulo}</span>
                                            <p className={`up-ticket-priority ${t.prioridad.toLowerCase()}`}>{t.prioridad}</p>
                                        </div>
                                        <span className="text-sm opacity-80 self-start">{t.estado}</span>
                                    </Link>
                                )) : (
                                    <p className="text-sm text-center opacity-60 py-4">No hay tickets recientes.</p>
                                )}
                            </div>
                        </div>

                        {/* Card: Pendientes de calificar */}
                        <div className="up-dashboard-list-card">
                            <h3 className="up-dashboard-list-title">Pendientes de calificar</h3>
                            <div className="up-dashboard-list-content">
                                {sinRating.length > 0 ? sinRating.map((t) => (
                                    <Link key={t.id} to={`/usuario/tickets/${t.id}`} className="up-dashboard-list-item">
                                        <span className="font-semibold">#{t.id} — {t.titulo}</span>
                                    </Link>
                                )) : (
                                    <p className="text-sm text-center opacity-60 py-4">Nada que calificar por ahora.</p>
                                )}
                            </div>
                        </div>

                        {/* Card: Aún editables */}
                        <div className="up-dashboard-list-card">
                            <h3 className="up-dashboard-list-title">Aún editables</h3>
                            <div className="up-dashboard-list-content">
                                {editables.length > 0 ? editables.map((t) => (
                                    <Link key={t.id} to={`/usuario/tickets/${t.id}`} className="up-dashboard-list-item">
                                        <span className="font-semibold">#{t.id} — {t.titulo}</span>
                                        <span className="text-sm opacity-80">{t.tiempo_restante_edicion}s restantes</span>
                                    </Link>
                                )) : (
                                    <p className="text-sm text-center opacity-60 py-4">No tienes tickets editables.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}