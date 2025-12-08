// src/hooks/useSound.js
import { useCallback } from "react";

export const useSound = (soundFile, volume = 0.6) => {
    const play = useCallback(() => {
        try {
            const audio = new Audio(soundFile);
            audio.volume = volume; // Volumen entre 0.0 y 1.0
            audio.play().catch(err => {
                console.warn("No se pudo reproducir sonido:", err);
            });
        } catch (e) {
            console.error("Error con el audio:", e);
        }
    }, [soundFile, volume]);

    return play;
};
