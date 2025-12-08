// src/modules/admin/components/common/ConfirmModal.jsx
import React from 'react';
import './ConfirmModal.css';

const ConfirmModal = ({ titulo, mensaje, onConfirmar, onCancelar }) => {
    return (
        <div className="modal-overlay">
            <div className="modal-confirmacion">
                <div className="modal-header">
                    <h3>{titulo}</h3>
                </div>

                <div className="modal-contenido">
                    <p>{mensaje}</p>
                </div>

                <div className="modal-acciones">
                    <button
                        onClick={onCancelar}
                        className="btn-modal btn-cancelar"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirmar}
                        className="btn-modal btn-confirmar"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;