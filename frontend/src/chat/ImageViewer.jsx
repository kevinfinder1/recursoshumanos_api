// src/chat/ImageViewer.jsx
import React from "react";
import { X, Download } from "lucide-react";
import "./Chat.css";

const ImageViewer = ({ src, onClose }) => {
    if (!src) return null;

    return (
        <div className="image-viewer">
            <button
                className="image-viewer__close"
                onClick={onClose}
            >
                <X size={32} />
            </button>

            <img
                src={src}
                alt="preview"
                className="image-viewer__image"
            />

            <a
                href={src}
                download
                className="image-viewer__download"
            >
                <Download size={18} />
                Descargar
            </a>
        </div>
    );
};

export default ImageViewer;
