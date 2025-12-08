import { useState, useEffect } from "react";
import { fetchUserTicketDetail } from "../../../api/userTickets";

export const useUserTicketDetail = (id) => {
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        // Si NO hay ID, no hacemos nada pero cortamos carga
        if (!id || id === "undefined") {
            setLoading(false);
            setError("ID inválido.");
            return;
        }

        const load = async () => {
            try {
                setLoading(true);
                setError("");
                const data = await fetchUserTicketDetail(id);
                setTicket(data);
            } catch (err) {
                console.error("❌ Error useUserTicketDetail:", err);
                setError("No se pudo cargar el ticket.");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [id]);

    return { ticket, loading, error, setTicket };
};
