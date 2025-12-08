import React from "react";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import AppRouter from "./routes/AppRouter"; // Importamos el nuevo router
import { NotificationsProvider } from "./context/NotificationsContext"; // 👈 IMPORTANTE

function App() {
  const { user, isAuthenticated, loading } = useAuth();

  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Inicializando aplicación...</p>
        </div>
      </div>
    );
  }

  // DEBUG: Verificar estado de autenticación y usuario
  console.log("APP.JSX | isAuthenticated:", isAuthenticated, "| user:", user);

  return (
    <NotificationsProvider>
      <div className="App">
        {isAuthenticated && <Navbar />}
        <AppRouter />
      </div>
    </NotificationsProvider>
  );
}

export default App;