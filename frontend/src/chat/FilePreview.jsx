// src/chat/FilePreview.jsx (Versión extendida)
import React, { useState, useContext, useEffect } from "react";
import toast from "react-hot-toast";
import AuthContext from "../context/AuthContext";
import "./Chat.css"; // Importar el archivo CSS

const FilePreview = ({ file }) => {
    const [showPreview, setShowPreview] = useState(false);
    const [fileData, setFileData] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const { isAuthenticated, token } = useContext(AuthContext);

    const getFileName = () => {
        return file?.file_name || file?.file_url?.split("/").pop() || "Archivo";
    };

    const getFileUrl = () => { // Renamed from getAbsoluteFileUrl to match original context
        if (!file?.file_url) return null;

        if (file.file_url.startsWith('/media/')) {
            return `${import.meta.env.VITE_API_URL}${file.file_url}`; // Use environment variable
        }

        return file.file_url;
    };

    const getFileInfo = () => {
        const fileName = getFileName().toLowerCase();
        let icon = '📎';
        let type = 'Archivo';
        let canPreview = false;
        let previewType = 'none';

        // PDF
        if (fileName.endsWith('.pdf')) {
            icon = '📕';
            type = 'Documento PDF';
            canPreview = true;
            previewType = 'pdf';
        }
        // Imágenes
        else if (fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/)) {
            icon = '🖼️';
            type = 'Imagen';
            canPreview = true;
            previewType = 'image';
        }
        // Documentos
        else if (fileName.match(/\.(doc|docx)$/)) {
            icon = '📘';
            type = 'Documento Word';
        }
        else if (fileName.match(/\.(xls|xlsx|csv)$/)) {
            icon = '📗';
            type = 'Hoja de cálculo';
        }
        else if (fileName.match(/\.(ppt|pptx)$/)) {
            icon = '📙';
            type = 'Presentación';
        }
        // Archivos de texto y código
        else if (fileName.match(/\.(txt|log|md)$/)) {
            icon = '📄';
            type = 'Archivo de texto';
            canPreview = true;
            previewType = 'text';
        }
        else if (fileName.match(/\.(js|jsx|ts|tsx|py|java|c|cpp|html|css|json|xml)$/)) {
            icon = '📝';
            type = 'Archivo de código';
            canPreview = true;
            previewType = 'text';
        }
        // Archivos comprimidos
        else if (fileName.match(/\.(zip|rar|7z|tar|gz)$/)) {
            icon = '📦';
            type = 'Archivo comprimido';
        }
        // Audio
        else if (fileName.match(/\.(mp3|wav|ogg|flac)$/)) {
            icon = '🎵';
            type = 'Archivo de audio';
            canPreview = true;
            previewType = 'audio';
        }
        // Video
        else if (fileName.match(/\.(mp4|avi|mov|wmv|flv|webm)$/)) {
            icon = '🎬';
            type = 'Archivo de video';
            canPreview = true;
            previewType = 'video';
        }

        return { icon, type, canPreview, previewType };
    };

    const handleDownload = async (e) => {
        e.preventDefault();

        if (!isAuthenticated || !token) {
            alert('Debes estar autenticado para descargar archivos');
            return;
        }

        setDownloading(true);

        try {
            const fileUrl = getFileUrl();
            const fileName = getFileName();

            const response = await fetch(fileUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
            }, 100);

        } catch (error) {
            console.error('❌ Error en descarga:', error);
            alert('Error al descargar el archivo: ' + error.message);
        } finally {
            setDownloading(false);
        }
    };

    const handlePreview = async (e) => {
        e.preventDefault();

        if (!isAuthenticated || !token) {
            alert('Debes estar autenticado para ver el preview');
            return;
        }

        setLoadingPreview(true);
        setShowPreview(true);

        try {
            const fileUrl = getFileUrl();
            const { previewType } = getFileInfo();
            const response = await fetch(fileUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}`);
            }

            if (previewType === 'text') {
                // Para archivos de texto, leer el contenido
                const text = await response.text();
                setFileData(text);
            } else {
                // Para otros tipos, usar blob
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                setFileData(url);
            }

        } catch (error) {
            console.error('Error cargando preview:', error);
            setFileData(null);
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleClosePreview = () => {
        setShowPreview(false);
        setFileData(null);
    };

    // Limpiar URLs
    useEffect(() => {
        return () => {
            if (fileData && typeof fileData === 'string' && fileData.startsWith('blob:')) {
                URL.revokeObjectURL(fileData);
            }
        };
    }, [fileData]);

    const fileName = getFileName();
    const fileUrl = getFileUrl();
    const { icon, type, canPreview, previewType } = getFileInfo();

    const renderPreview = () => {
        if (loadingPreview) {
            return (
                <div className="file-modal__loading">
                    <div className="file-modal__spinner"></div>
                    <p>Cargando vista previa...</p>
                </div>
            );
        }

        if (!fileData) {
            return (
                <div className="file-modal__error">
                    <p>No se pudo cargar la vista previa</p>
                    <button onClick={handleDownload} className="file-modal__action file-modal__action--download">
                        Descargar archivo
                    </button>
                </div>
            );
        }

        switch (previewType) {
            case 'pdf':
                return <iframe src={fileData} className="file-modal__pdf" title={`Preview de ${fileName}`} />;
            case 'image':
                return (
                    <div className="file-modal__image-container">
                        <img
                            src={fileData}
                            alt={fileName}
                            className="file-modal__image"
                        />
                    </div>
                );
            case 'text':
                return (
                    <pre className="file-modal__text">{fileData}</pre>
                );
            case 'audio':
                return (
                    <div className="file-modal__audio-container">
                        <audio controls className="file-modal__audio">
                            <source src={fileData} type="audio/mpeg" />
                            Tu navegador no soporta el elemento de audio.
                        </audio>
                    </div>
                );
            case 'video':
                return (
                    <div className="file-modal__video-container">
                        <video controls className="file-modal__video">
                            <source src={fileData} type="video/mp4" />
                            Tu navegador no soporta el elemento de video.
                        </video>
                    </div>
                );
            default:
                return (
                    <div className="file-modal__no-preview-container">
                        <p className="file-modal__no-preview">Vista previa no disponible para este tipo de archivo</p>
                    </div>
                );
        }
    };

    return (
        <>
            {/* Tarjeta dentro del chat */}
            <div className="file-preview">
                <div className="file-preview__icon">{icon}</div>

                <div className="file-preview__info">
                    <p className="file-preview__name">{fileName}</p>
                    <p className="file-preview__type">{type}</p>

                    <div className="file-preview__actions">
                        {canPreview && (
                            <button
                                className="file-preview__btn file-preview__btn--preview"
                                onClick={handlePreview}
                            >
                                Preview
                            </button>
                        )}

                        <button
                            className="file-preview__btn file-preview__btn--download"
                            onClick={handleDownload}
                        >
                            {downloading ? "⏳..." : " Download"}
                        </button>
                    </div>
                </div>
            </div>

            {/* 🪟 MODAL DE PREVIEW */}
            {showPreview && (
                <div className="file-modal">
                    <div className="file-modal__window">
                        {/* Header */}
                        <div className="file-modal__header">
                            <div>
                                <h2 className="file-modal__title">{fileName}</h2>
                                <p className="file-modal__subtitle">{type}</p>
                            </div>

                            <button
                                className="file-modal__close"
                                onClick={handleClosePreview}
                            >
                                ✖
                            </button>
                        </div>

                        {/* CONTENT */}
                        <div className="file-modal__content">{renderPreview()}</div>

                        {/* Footer */}
                        <div className="file-modal__footer">
                            <span className="text-sm text-gray-600">
                                {file.file_size ? `Tamaño: ${formatFileSize(file.file_size)}` : ''}
                            </span>
                            <button
                                onClick={handleDownload}
                                className="file-modal__action file-modal__action--download"
                            >
                                📥 Descargar
                            </button>

                            <button
                                className="file-modal__action file-modal__action--close"
                                onClick={handleClosePreview}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
export default FilePreview;