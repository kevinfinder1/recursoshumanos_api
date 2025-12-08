import React from "react";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center">
            <h1 className="text-5xl font-bold text-red-600 mb-4">404</h1>
            <h2 className="text-2xl font-semibold mb-2">Página no encontrada</h2>
            <p className="text-gray-600">
                La página que estás buscando no existe o ha sido movida.
            </p>
        </div>
    );
}
