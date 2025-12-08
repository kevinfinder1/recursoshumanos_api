import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { reasignarTicket } from "../../../api/ticketsApi";

const useReassign = (onSuccess) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleReassign = useCallback(async (ticketId, agentId) => {
        if (!ticketId || !agentId) {
            toast.error("Se requiere el ticket y el agente de destino.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log(`🔄 Reasignando ticket ${ticketId} al agente ${agentId}...`);

            await reasignarTicket(ticketId, agentId);

            toast.success("✅ Solicitud de reasignación enviada exitosamente.");

            // Si se proporcionó una función de éxito (como refrescar la lista), la llamamos.
            if (onSuccess) {
                onSuccess();
            }

        } catch (err) {
            console.error("❌ Error en la reasignación:", err);
            const errorMessage = err.response?.data?.error || "No se pudo enviar la solicitud de reasignación.";
            setError(errorMessage);
            toast.error(`⚠️ ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    }, [onSuccess]);

    return {
        isReassigning: loading,
        reassignError: error,
        handleReassign,
    };
};

export default useReassign;