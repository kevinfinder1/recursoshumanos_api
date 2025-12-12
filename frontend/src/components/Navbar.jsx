import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import { useNotificationsContext } from "../context/NotificationsContext";
import NotificationPanel from "./NotificationPanel";
import { Menu, X } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import "./Navbar.css";

const Navbar = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [openNotifications, setOpenNotifications] = useState(false); // 1. Estado para el panel
    const { user, logout, isAuthenticated } = useAuth();
    const { notifications: rawNotifications, fetchNotifications, loading } = useNotificationsContext();
    const notifications = Array.isArray(rawNotifications) ? rawNotifications : [];
    const navigate = useNavigate();
    const location = useLocation();

    const unreadChat = notifications.filter(n => n.tipo === "chat_message" && !n.leida).length;

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    // 2. Función para abrir/cerrar notificaciones
    const toggleNotifications = () => {
        setOpenNotifications((prev) => !prev);
    };

    // 3. Lógica para Toasts de Chat en tiempo real
    const prevNotificationsRef = useRef([]);
    const hasLoadedRef = useRef(false);
    const fetchNotifsRef = useRef(fetchNotifications);

    useEffect(() => {
        fetchNotifsRef.current = fetchNotifications;
    }, [fetchNotifications]);

    // 🔹 POLLING ROBUSTO: Usar setTimeout recursivo para asegurar ejecución continua
    useEffect(() => {
        let timeoutId;

        const poll = async () => {
            if (fetchNotifsRef.current) {
                try {
                    // console.log("🔄 Polling notificaciones..."); // Descomenta para depurar
                    await fetchNotifsRef.current();
                } catch (error) {
                    console.error("Error polling notifications:", error);
                }
            }
            // Programar la siguiente ejecución solo cuando la anterior termine
            timeoutId = setTimeout(poll, 100);
        };

        poll(); // Iniciar ciclo

        return () => clearTimeout(timeoutId);
    }, []);

    useEffect(() => {
        // Evitar procesar si está cargando Y no tenemos datos previos (carga inicial real)
        // Si ya tenemos datos y está refrescando en background (loading=true), permitimos comparar
        if (loading && notifications.length === 0) return;

        // Primera carga: Sincronizar ID sin notificar
        if (!hasLoadedRef.current) {
            // Solo marcar como cargado si realmente tenemos datos o si ya terminó de cargar
            if (notifications.length > 0 || !loading) {
                hasLoadedRef.current = true;
                prevNotificationsRef.current = notifications;
            }
            return;
        }

        // Comparar lista actual con anterior para encontrar NUEVOS elementos
        const prevIds = new Set(prevNotificationsRef.current.map(n => n.id));
        const newItems = notifications.filter(n => !prevIds.has(n.id));

        if (newItems.length > 0) {
            // Evitar spam masivo si es una carga tardía (ej. más de 5 notificaciones de golpe)
            if (prevNotificationsRef.current.length === 0 && newItems.length > 5) {
                // Probablemente carga inicial tardía, ignorar
            } else {
                newItems.forEach(n => {
                    // Detectar si es mensaje de chat (incluyendo el fix de group-hr)
                    const tipo = n.tipo || "";
                    const mensaje = n.mensaje || "";
                    const isChat = (
                        tipo === "chat_message" ||
                        !!n.chat_room ||
                        mensaje.includes("group-hr") ||
                        mensaje.toLowerCase().includes("nuevo mensaje")
                    );

                    if (isChat && !n.leida) {
                        // Verificar si ya estamos viendo esa sala para no molestar
                        const params = new URLSearchParams(location.search);
                        const currentRoom = params.get('roomId');

                        let targetRoom = n.chat_room;
                        if (!targetRoom && n.mensaje && n.mensaje.includes("group-hr")) {
                            targetRoom = "group-hr";
                        }

                        // Si NO estamos en la sala del mensaje, mostrar Toast interactivo
                        if (String(targetRoom) !== String(currentRoom)) {
                            toast((t) => (
                                <div
                                    onClick={() => {
                                        toast.dismiss(t.id);
                                        const base = user?.role === "solicitante" ? "/usuario" : "/agente";
                                        if (targetRoom) {
                                            navigate(`${base}/chat?roomId=${targetRoom}`);
                                        } else {
                                            navigate(`${base}/chat`);
                                        }
                                    }}
                                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                                >
                                    <div style={{ fontSize: '24px' }}>💬</div>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '2px' }}>
                                            Nuevo mensaje
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: '1.2' }}>
                                            {(n.mensaje || "").length > 50 ? (n.mensaje || "").substring(0, 50) + '...' : (n.mensaje || "")}
                                        </div>
                                    </div>
                                </div>
                            ), {
                                duration: 5000,
                                position: 'top-right',
                                style: {
                                    background: '#ffffff',
                                    borderLeft: '4px solid #2563eb',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    maxWidth: '350px'
                                }
                            });
                        }
                    }
                });
            }
        }

        // Actualizar referencia para la próxima comparación
        prevNotificationsRef.current = notifications;
    }, [notifications, loading, location.search, navigate, user]);

    // ✅ Asegurarse de que el usuario exista antes de verificar su rol
    const esAgente = user && (user.role === "admin" || user.role?.startsWith("agente"));
    const esUsuario = user && user.role === "solicitante";

    // ✅ No renderizar nada si no está autenticado
    if (!isAuthenticated) return null;

    const isActive = (path) => location.pathname === path;

    return (
        <>
            <Toaster position="top-right" containerStyle={{ zIndex: 10000 }} />
            <nav className="modern-navbar-v2">
                <div className="navbar-container-v2">
                    {/* 🏷️ LOGO / TÍTULO */}
                    <div className="navbar-logo-v2">
                        <div className="logo-icon-v2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z" />
                            </svg>
                        </div>
                        <Link to="/" className="logo-text-v2">
                            <span className="logo-title-v2">HR Tickets</span>
                            <span className="logo-subtitle-v2">Sistema de Gestión</span>
                        </Link>
                    </div>

                    {/* 🔗 LINKS DE NAVEGACIÓN - DESKTOP */}
                    <div className="navbar-links">
                        {esAgente && (
                            <>
                                <Link
                                    to="/agente/tickets"
                                    className={`nav-link ${isActive('/agente/tickets') ? 'active' : ''}`}
                                >
                                    Mis Tickets
                                </Link>
                                <Link
                                    to="/agente/tickets/pendientes"
                                    className={`nav-link ${isActive('/agente/tickets/pendientes') ? 'active' : ''}`}
                                >
                                    Pendientes
                                </Link>
                                <Link
                                    to="/agente/tickets/creados"
                                    className={`nav-link ${isActive('/agente/tickets/creados') ? 'active' : ''}`}
                                >
                                    Mis Creados
                                </Link>
                                <Link
                                    to="/agente/tickets/nuevo"
                                    className={`nav-link ${isActive('/agente/tickets/nuevo') ? 'active' : ''}`}
                                >
                                    Crear Ticket
                                </Link>
                                {/* ⭐ BOTÓN CHAT */}
                                <Link
                                    to="/agente/chat"
                                    className={`nav-link ${isActive('/agente/chat') ? 'active' : ''}`}
                                >
                                    Chat
                                    {unreadChat > 0 && (
                                        <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                            {unreadChat}
                                        </span>
                                    )}
                                </Link>
                            </>
                        )}
                        {esUsuario && (
                            <>
                                <Link
                                    to="/usuario/dashboard"
                                    className={`nav-link ${isActive('/usuario/dashboard') ? 'active' : ''}`}
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    to="/usuario/tickets"
                                    className={`nav-link ${isActive('/usuario/tickets') ? 'active' : ''}`}
                                >
                                    Mis Tickets
                                </Link>
                                <Link
                                    to="/usuario/tickets/nuevo"
                                    className={`nav-link ${isActive('/usuario/tickets/nuevo') ? 'active' : ''}`}
                                >
                                    Crear Ticket
                                </Link>
                                {/* ⭐ BOTÓN CHAT */}
                                <Link
                                    to="/usuario/chat"
                                    className={`nav-link ${isActive('/usuario/chat') ? 'active' : ''}`}
                                >
                                    Chat
                                    {unreadChat > 0 && (
                                        <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                            {unreadChat}
                                        </span>
                                    )}
                                </Link>
                            </>
                        )}
                    </div>

                    {/* 🔔 SECCIÓN DERECHA - DESKTOP */}
                    <div className="navbar-actions-v2">
                        {/* 👤 Usuario actual */}
                        {user && (
                            <div className="navbar-user-v2">
                                <div className="user-avatar-v2">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="user-info-v2">
                                    <span className="user-name-v2">{user.username}</span>
                                    <span className="user-role-v2">{user.role}</span>
                                </div>
                            </div>
                        )}

                        {/* 📢 Notificaciones */}
                        <NotificationBell onClick={toggleNotifications} />

                        {/* 🔒 Cerrar sesión */}
                        <button onClick={handleLogout} className="btn-logout-v2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                            </svg>
                            <span>Cerrar sesión</span>
                        </button>
                    </div>

                    {/* 🍔 MENÚ MÓVIL - HAMBURGER */}
                    <button
                        className={`navbar-hamburger-v2 ${menuOpen ? 'active' : ''}`}
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        {menuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* 📱 MENÚ MÓVIL DESPLEGABLE */}
                <div className={`navbar-mobile-menu-v2 ${menuOpen ? 'open' : ''}`}>
                    {user && (
                        <div className="mobile-user-card-v2">
                            <div className="user-avatar-v2 large">
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="user-info-v2">
                                <span className="user-name-v2">{user.username}</span>
                                <span className="user-role-v2">{user.role}</span>
                            </div>
                        </div>
                    )}

                    <div className="mobile-links">
                        {esAgente && (
                            <>
                                <Link
                                    to="/agente"
                                    className={`mobile-link ${isActive('/agente') ? 'active' : ''}`}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    to="/agente/tickets"
                                    className={`mobile-link ${isActive('/agente/tickets') ? 'active' : ''}`}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    Mis Tickets
                                </Link>
                                <Link
                                    to="/agente/tickets/pendientes"
                                    className={`mobile-link ${isActive('/agente/tickets/pendientes') ? 'active' : ''}`}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    Pendientes
                                </Link>
                                <Link
                                    to="/agente/tickets/creados"
                                    className={`mobile-link ${isActive('/agente/tickets/creados') ? 'active' : ''}`}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    Mis Creados
                                </Link>
                                <Link
                                    to="/agente/tickets/nuevo"
                                    className={`mobile-link ${isActive('/agente/tickets/nuevo') ? 'active' : ''}`}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    Crear Ticket
                                </Link>
                                <Link
                                    to="/agente/chat"
                                    className={`mobile-link ${isActive('/agente/chat') ? 'active' : ''}`}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    Chat
                                    {unreadChat > 0 && (
                                        <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                            {unreadChat}
                                        </span>
                                    )}
                                </Link>
                            </>
                        )}
                        {esUsuario && (
                            <>
                                <Link
                                    to="/usuario/dashboard"
                                    className={`mobile-link ${isActive('/usuario/dashboard') ? 'active' : ''}`}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    to="/usuario/tickets"
                                    className={`mobile-link ${isActive('/usuario/tickets') ? 'active' : ''}`}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    Mis Tickets
                                </Link>
                                <Link
                                    to="/usuario/tickets/nuevo"
                                    className={`mobile-link ${isActive('/usuario/tickets/nuevo') ? 'active' : ''}`}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    Crear Ticket
                                </Link>
                                <Link
                                    to="/usuario/chat"
                                    className={`mobile-link ${isActive('/usuario/chat') ? 'active' : ''}`}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    Chat
                                    {unreadChat > 0 && (
                                        <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                            {unreadChat}
                                        </span>
                                    )}
                                </Link>
                            </>
                        )}
                    </div>

                    <div className="mobile-notifications-v2">
                        <NotificationBell onClick={toggleNotifications} />
                    </div>

                    <button onClick={handleLogout} className="btn-logout-v2 mobile">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                        </svg>
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </nav>

            {/* 3. Panel de notificaciones (se renderiza fuera del nav) */}
            <NotificationPanel
                open={openNotifications}
                onClose={() => setOpenNotifications(false)}
            />
        </>
    );
};

export default Navbar;