import { useEffect, useRef } from "react";

const useGroupSocket = (groupName, onMessage) => {
    const wsRef = useRef(null);

    useEffect(() => {
        const token =
            sessionStorage.getItem("access") ||
            localStorage.getItem("secure_access");

        const ws = new WebSocket(
            `ws://192.168.50.68:8000/ws/group/${groupName}/?token=${token}`
        );
        wsRef.current = ws;

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (!data.error) onMessage(data);
        };

        return () => ws.close();
    }, [groupName, onMessage]);

    return wsRef;
};

export default useGroupSocket;
