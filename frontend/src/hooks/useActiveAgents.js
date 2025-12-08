// src/chat/hooks/useActiveAgents.js - CORREGIDO
import { useEffect, useState } from "react";
import API from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext"; // Asegúrate de tener este hook

const useActiveAgents = (pollIntervalMs = 30000) => {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { user } = useAuth(); // Obtener usuario actual

    const loadAgents = async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await API.get("/agent/agentes-conectados/");

            console.log("✅ Agentes cargados:", res.data.agentes?.length || 0);

            if (res.data && res.data.agentes) {
                // ✅ FILTRAR: Excluir al usuario actual de la lista
                const filteredAgents = res.data.agentes.filter(agent =>
                    agent.id !== user?.id && agent.username !== user?.username
                );

                setAgents(filteredAgents);

                // Debug
                filteredAgents.forEach(agent => {
                    console.log(`🟢 ${agent.username}: ACTIVO (carga: ${agent.carga_trabajo} tickets)`);
                });

                console.log(`📊 Agentes mostrados: ${filteredAgents.length} (excluyendo al usuario actual)`);
            } else {
                setAgents([]);
            }

        } catch (err) {
            console.error("❌ Error cargando agentes:", err);
            setError(`Error cargando agentes: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAgents();
        const interval = setInterval(loadAgents, pollIntervalMs);
        return () => clearInterval(interval);
    }, [pollIntervalMs, user?.id]); // Dependencia del usuario

    // ✅ Filtrar activos e inactivos EXCLUYENDO al usuario actual
    const activeAgents = agents.filter(agent => agent.esta_activo && agent.id !== user?.id);
    const inactiveAgents = agents.filter(agent => !agent.esta_activo && agent.id !== user?.id);

    return {
        agents,
        loading,
        error,
        activeAgents,
        inactiveAgents,
        reload: loadAgents
    };
};

export default useActiveAgents;