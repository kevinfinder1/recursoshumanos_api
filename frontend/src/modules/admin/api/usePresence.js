// src/modules/admin/api/usePresence.js
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';

const usePresence = () => {
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const socket = useRef(null);
    const { user, token } = useAuth();

    useEffect(() => {
        if (!user || !token) {
            console.log('Presence: No user or token available');
            return;
        }

        console.log('Presence: Starting WebSocket connection...');

        try {
            // Construir la URL del WebSocket a partir de la variable de entorno de la API
            const apiUrl = new URL(import.meta.env.VITE_API_URL);
            const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
            const socketUrl = `${protocol}//${apiUrl.host}/ws/presence/?token=${token}`;

            socket.current = new WebSocket(socketUrl);

            socket.current.onopen = () => {
                console.log("Presence: Connected to presence channel");
            };

            socket.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Presence: Update received', data);

                    if (data.type === 'presence.update') {
                        const { user_id, status } = data.payload;

                        setOnlineUsers(prevUsers => {
                            const newUsers = new Set(prevUsers);
                            if (status === 'online') {
                                newUsers.add(user_id);
                            } else if (status === 'offline') {
                                newUsers.delete(user_id);
                            }
                            console.log('Online users:', Array.from(newUsers));
                            return newUsers;
                        });
                    }
                    // Manejar formato alternativo si es necesario
                    else if (data.user_id) {
                        const { user_id, status } = data;

                        setOnlineUsers(prevUsers => {
                            const newUsers = new Set(prevUsers);
                            if (status === 'online') {
                                newUsers.add(user_id);
                            } else {
                                newUsers.delete(user_id);
                            }
                            return newUsers;
                        });
                    }
                } catch (error) {
                    console.error('Presence: Error parsing message', error);
                }
            };

            socket.current.onerror = (error) => {
                console.error('Presence: WebSocket error', error);
            };

            socket.current.onclose = (event) => {
                console.log(`Presence: Disconnected (code: ${event.code}, reason: ${event.reason})`);
            };

        } catch (error) {
            console.error('Presence: Failed to create WebSocket', error);
        }

        return () => {
            if (socket.current) {
                socket.current.close(1000, "Component unmounted");
            }
        };
    }, [user, token]);

    return onlineUsers;
};

export default usePresence;