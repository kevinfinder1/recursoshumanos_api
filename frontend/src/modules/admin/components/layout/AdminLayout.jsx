// src/modules/admin/components/layout/AdminLayout.jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import './AdminLayout.css';

const AdminLayout = () => {
    // El sidebar está abierto por defecto en pantallas grandes, cerrado en móviles
    const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

    const toggleSidebar = () => {
        setSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="admin-layout">
            <AdminSidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            <div className="admin-contenedor-principal">
                <AdminHeader toggleSidebar={toggleSidebar} />
                <main className="admin-contenido">
                    <Outlet />
                </main>
            </div>
            {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}
        </div>
    );
};

export default AdminLayout;