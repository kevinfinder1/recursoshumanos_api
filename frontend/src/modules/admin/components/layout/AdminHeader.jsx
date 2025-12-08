// src/modules/admin/components/layout/AdminHeader.jsx
import React from 'react';
import { FaBars } from 'react-icons/fa';
import './AdminHeader.css';

const AdminHeader = ({ toggleSidebar }) => {
    return (
        <header className="admin-header">
            <div className="header-izquierda">
                <button className="btn-menu-hamburguesa" onClick={toggleSidebar}>
                    <FaBars />
                </button>
                <h1 className="header-titulo">Bienvenido</h1>
            </div>
        </header>
    );
};

export default AdminHeader;