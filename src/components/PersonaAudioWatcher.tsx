"use client";

import { useEffect } from "react";

interface PersonaAudioWatcherProps {
  musica?: string | null;
  titulo?: string | null;
  nombre: string;
}

export default function PersonaAudioWatcher({ musica, titulo, nombre }: PersonaAudioWatcherProps) {
  useEffect(() => {
    if (!musica) {
      window.dispatchEvent(new CustomEvent("panteon:clear-soul-track"));
      window.dispatchEvent(new CustomEvent("panteon:clear-soul-music"));
      return;
    }

    const detail = {
      url: musica,
      title: titulo || "Música en su memoria",
      name: nombre,
    };

    // Emitir evento para reproducir la canción específica de esta alma
    window.dispatchEvent(new CustomEvent("panteon:set-soul-track", { detail }));

    return () => {
      // Al salir de la página de esta alma, restaurar la música general del santuario
      window.dispatchEvent(new CustomEvent("panteon:clear-soul-track"));
    };
  }, [musica, titulo, nombre]);

  return null;
}
