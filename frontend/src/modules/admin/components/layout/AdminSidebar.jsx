// src/modules/admin/components/layout/AdminSidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    FaTachometerAlt,
    FaTicketAlt,
    FaTags,
    FaUsers,
    FaChartBar,
    FaCog,
    FaTimes,
    FaExchangeAlt
} from 'react-icons/fa';
import './AdminSidebar.css';

const AdminSidebar = ({ isOpen, toggleSidebar }) => {
    const menuItems = [
        { path: '/admin/dashboard', icon: <FaTachometerAlt />, label: 'Dashboard' },
        { path: '/admin/tickets', icon: <FaTicketAlt />, label: 'Tickets' },
        { path: '/admin/categorias', icon: <FaTags />, label: 'Categorías' },
        { path: '/admin/usuarios', icon: <FaUsers />, label: 'Usuarios' },
        { path: '/admin/rotaciones', icon: <FaExchangeAlt />, label: 'Rotaciones' },
        { path: '/admin/reportes', icon: <FaChartBar />, label: 'Reportes' },
        { path: '/admin/configuracion', icon: <FaCog />, label: 'Configuración' },
    ];

    return (
        <aside className={`admin-sidebar ${isOpen ? 'is-open' : ''}`}>
            <div className="sidebar-logo">
                <button className="btn-cerrar-sidebar" onClick={toggleSidebar}>
                    <FaTimes />
                </button>
                <h2>Panel Admin</h2>
            </div>

            <nav className="sidebar-nav">
                <ul className="sidebar-menu">
                    {menuItems.map((item) => (
                        <li key={item.path} className="menu-item">
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    `menu-link ${isActive ? 'menu-activo' : ''}`
                                }
                            >
                                <span className="menu-icono">{item.icon}</span>
                                <span className="menu-texto">{item.label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};

export default AdminSidebar;