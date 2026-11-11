"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { extractYouTubeId, parseYouTubeStartSeconds } from "@/lib/utils";

interface SoulTrack {
  url: string;
  title: string;
  name: string;
}

export default function AudioPlayer({
  generalUrl: initialGeneralUrl,
  generalTitulo: initialGeneralTitulo,
  adminVolume,
}: {
  generalUrl?: string | null;
  generalTitulo?: string | null;
  adminVolume?: number;
} = {}) {
  // Si hay música configurada, el reproductor inicia activo (con desbloqueo en primer toque en móvil)
  const [isPlaying, setIsPlaying] = useState(() => Boolean(initialGeneralUrl));
  const [isMuted, setIsMuted] = useState(false);
  const [soulTrack, setSoulTrack] = useState<SoulTrack | null>(null);
  const [generalTrack, setGeneralTrack] = useState<{ url: string; title: string } | null>(
    initialGeneralUrl ? { url: initialGeneralUrl, title: initialGeneralTitulo || "Música del Santuario" } : null
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [volume, setVolume] = useState(() => (typeof adminVolume === "number" ? adminVolume : 0.7));

  // Sincronizar volumen maestro configurado por el administrador
  useEffect(() => {
    if (typeof adminVolume === "number") {
      setVolume(adminVolume);
      if (adminVolume > 0 && isMuted) {
        setIsMuted(false);
      }
    }
  }, [adminVolume]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const chimeTimerRef = useRef<number | null>(null);

  // Cerrar panel al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sincronizar cambios de props (ej. al guardar música general en admin)
  useEffect(() => {
    if (initialGeneralUrl) {
      setGeneralTrack({ url: initialGeneralUrl, title: initialGeneralTitulo || "Música del Santuario" });
      setIsPlaying(true);
    } else {
      setGeneralTrack(null);
    }
  }, [initialGeneralUrl, initialGeneralTitulo]);

  // Pista activa: música específica del alma o música general del santuario
  const activeTrack = soulTrack
    ? soulTrack
    : generalTrack
    ? { url: generalTrack.url, title: generalTrack.title, name: "Obituario" }
    : null;

  const ytId = extractYouTubeId(activeTrack?.url);
  const startSeconds = parseYouTubeStartSeconds(activeTrack?.url);

  // Enviar comando al reproductor de YouTube mediante postMessage oficial
  const sendYtCommand = useCallback((func: string, args: unknown[] = []) => {
    if (ytIframeRef.current?.contentWindow) {
      try {
        ytIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func, args }),
          "*"
        );
      } catch (err) {
        console.warn("[YouTube postMessage Error]:", err);
      }
    }
  }, []);

  // 1. Sintetizador ambiental sagrado (Web Audio API) si no hay música configurada
  const initAmbientSynth = useCallback(() => {
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume, ctx.currentTime);
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      const synthGain = ctx.createGain();
      synthGain.gain.setValueAtTime(activeTrack ? 0 : 0.4, ctx.currentTime);
      synthGain.connect(masterGain);
      synthGainRef.current = synthGain;

      // Filtro pasa bajos cálido tipo coro de catedral
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(480, ctx.currentTime);
      filter.Q.setValueAtTime(1.5, ctx.currentTime);
      filter.connect(synthGain);

      // LFO para dar respiración suave al filtro
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.07, ctx.currentTime);
      lfoGain.gain.setValueAtTime(140, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      // Acorde etéreo sereno (Re menor novena mística: D3, A3, C4, E4, F4)
      const freqs = [146.83, 220.0, 261.63, 329.63, 349.23];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = idx % 2 === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq + (idx * 0.15 - 0.3), ctx.currentTime);

        oscGain.gain.setValueAtTime(0.12 / freqs.length, ctx.currentTime);
        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start();
      });

      // Campanilla periódica lejana
      function scheduleNextChime() {
        if (!audioCtxRef.current || !synthGainRef.current) return;
        const chimeFreqs = [523.25, 659.25, 783.99, 1046.5];
        const f = chimeFreqs[Math.floor(Math.random() * chimeFreqs.length)];
        const o = audioCtxRef.current.createOscillator();
        const g = audioCtxRef.current.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(f, audioCtxRef.current.currentTime);
        g.gain.setValueAtTime(0.0001, audioCtxRef.current.currentTime);
        g.gain.exponentialRampToValueAtTime(0.035, audioCtxRef.current.currentTime + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtxRef.current.currentTime + 4.2);
        o.connect(g);
        g.connect(synthGainRef.current);
        o.start();
        o.stop(audioCtxRef.current.currentTime + 4.5);

        chimeTimerRef.current = window.setTimeout(scheduleNextChime, (14 + Math.random() * 18) * 1000);
      }
      scheduleNextChime();
    } catch (e) {
      console.warn("AudioContext init error:", e);
    }
  }, [activeTrack, volume]);

  const stopAmbientSynth = useCallback(() => {
    if (audioCtxRef.current && audioCtxRef.current.state === "running") {
      audioCtxRef.current.suspend();
    }
    if (chimeTimerRef.current) {
      clearTimeout(chimeTimerRef.current);
      chimeTimerRef.current = null;
    }
  }, []);

  // Manejo de reproducción reactivo a isPlaying y a cambios de pista
  useEffect(() => {
    if (isPlaying) {
      if (activeTrack) {
        stopAmbientSynth();
        if (ytId) {
          if (!isMuted) sendYtCommand("unMute");
          sendYtCommand("setVolume", [Math.round(volume * 100)]);
          sendYtCommand("playVideo");
        } else {
          if (audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
        }
      } else {
        initAmbientSynth();
        if (synthGainRef.current && audioCtxRef.current) {
          synthGainRef.current.gain.setValueAtTime(0.4, audioCtxRef.current.currentTime);
        }
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (ytId) {
        sendYtCommand("pauseVideo");
      }
      stopAmbientSynth();
    }
  }, [isPlaying, activeTrack?.url, ytId, isMuted, sendYtCommand, initAmbientSynth, stopAmbientSynth, volume]);

  // Manejo de volumen y mute
  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(isMuted ? 0 : volume, audioCtxRef.current.currentTime);
    }
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    if (ytId) {
      sendYtCommand(isMuted ? "mute" : "unMute");
      sendYtCommand("setVolume", [Math.round(volume * 100)]);
    }
  }, [volume, isMuted, ytId, sendYtCommand]);

  // Desbloqueador de audio en el primer toque/clic (políticas estrictas de navegadores móviles)
  useEffect(() => {
    const unlockOnGesture = () => {
      if (isPlaying) {
        if (ytId) {
          if (!isMuted) sendYtCommand("unMute");
          sendYtCommand("setVolume", [Math.round(volume * 100)]);
          sendYtCommand("playVideo");
        }
        if (audioRef.current && !ytId) {
          audioRef.current.play().catch(() => {});
        }
        if (!activeTrack && audioCtxRef.current && audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume().catch(() => {});
        }
      }
    };

    window.addEventListener("click", unlockOnGesture, { passive: true });
    window.addEventListener("touchstart", unlockOnGesture, { passive: true });
    window.addEventListener("keydown", unlockOnGesture, { passive: true });

    return () => {
      window.removeEventListener("click", unlockOnGesture);
      window.removeEventListener("touchstart", unlockOnGesture);
      window.removeEventListener("keydown", unlockOnGesture);
    };
  }, [isPlaying, ytId, volume, isMuted, activeTrack, sendYtCommand]);

  // Escuchar eventos de cambio de alma y comandos globales
  useEffect(() => {
    function handleSoulTrack(e: Event) {
      const custom = e as CustomEvent<SoulTrack>;
      if (!custom.detail || !custom.detail.url) return;
      setSoulTrack(custom.detail);
      setIsPlaying(true);
    }

    function handleClearSoulTrack() {
      setSoulTrack(null);
    }

    function handleTogglePlay() {
      setIsPlaying((prev) => !prev);
    }

    function handleForcePlay() {
      setIsPlaying(true);
    }

    function handleForcePause() {
      setIsPlaying(false);
    }

    window.addEventListener("panteon:set-soul-track", handleSoulTrack);
    window.addEventListener("panteon:set-soul-music", handleSoulTrack);
    window.addEventListener("panteon:clear-soul-track", handleClearSoulTrack);
    window.addEventListener("panteon:clear-soul-music", handleClearSoulTrack);
    window.addEventListener("panteon:toggle-play", handleTogglePlay);
    window.addEventListener("panteon:play", handleForcePlay);
    window.addEventListener("panteon:pause", handleForcePause);

    return () => {
      window.removeEventListener("panteon:set-soul-track", handleSoulTrack);
      window.removeEventListener("panteon:set-soul-music", handleSoulTrack);
      window.removeEventListener("panteon:clear-soul-track", handleClearSoulTrack);
      window.removeEventListener("panteon:clear-soul-music", handleClearSoulTrack);
      window.removeEventListener("panteon:toggle-play", handleTogglePlay);
      window.removeEventListener("panteon:play", handleForcePlay);
      window.removeEventListener("panteon:pause", handleForcePause);
    };
  }, []);

  // Notificar al resto de la aplicación el estado actual de reproducción
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("panteon:audio-state", {
        detail: { isPlaying, soulTrack, generalTrack },
      })
    );
  }, [isPlaying, soulTrack, generalTrack]);

  const trackTitle = soulTrack
    ? soulTrack.title || `Melodía en memoria de ${soulTrack.name}`
    : generalTrack
    ? generalTrack.title
    : "Sintetizador Ambiental Sagrado";

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Elemento de audio nativo para archivos de audio MP3 / streaming directo */}
      {activeTrack && !ytId && (
        <audio
          ref={audioRef}
          key={activeTrack.url}
          src={activeTrack.url}
          loop
          preload="auto"
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* 
        Contenedor para YouTube:
        Ubicado con top/left negativos para no crear scroll en la página ni afectar el layout,
        pero con dimensiones suficientes (320x240) para que YouTube y los navegadores móviles
        no suspendan ni bloqueen el audio.
      */}
      {ytId && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: "-900px",
            left: "-900px",
            width: "320px",
            height: "240px",
            opacity: 0.01,
            pointerEvents: "none",
            zIndex: -9999,
          }}
        >
          {/* IFrame único controlado por postMessage */}
          <iframe
            key={`${ytId}-${startSeconds || 0}`}
            ref={ytIframeRef}
            src={`https://www.youtube.com/embed/${ytId}?autoplay=${isPlaying ? 1 : 0}&enablejsapi=1&loop=1&playlist=${ytId}&playsinline=1&controls=0&rel=0&origin=${
              typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : ""
            }${startSeconds ? `&start=${startSeconds}` : ""}`}
            title="Reproductor de audio de fondo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            style={{ width: "320px", height: "240px", border: 0 }}
            onLoad={() => {
              if (ytIframeRef.current?.contentWindow) {
                ytIframeRef.current.contentWindow.postMessage(JSON.stringify({ event: "listening" }), "*");
              }
              if (isPlaying) {
                if (!isMuted) sendYtCommand("unMute");
                sendYtCommand("setVolume", [Math.round(volume * 100)]);
                sendYtCommand("playVideo");
              } else {
                sendYtCommand("pauseVideo");
              }
            }}
          />
        </div>
      )}

      {/* Píldora del Reproductor en el encabezado */}
      <div className="flex items-center gap-1 sm:gap-1.5 p-1 pl-2 sm:pl-3 pr-1 sm:pr-1.5 rounded-full bg-stone-900/90 hover:bg-stone-850 border border-gold/30 hover:border-gold/60 backdrop-blur-md shadow-sm transition-all duration-200">
        {/* Indicador visual con icono musical + ondas sonoras doradas + Título */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 sm:gap-1.5 text-left group px-0.5 sm:px-1 py-0.5 cursor-pointer"
          title="Música del santuario (clic para ver opciones y volumen)"
          aria-label="Música del santuario"
        >
          <span className="text-[11px] leading-none text-gold/90 select-none">🎵</span>
          <div className="flex items-end gap-[2px] h-3 w-3 shrink-0 mb-0.5">
            <span
              className={`w-[2px] bg-gold rounded-full transition-all ${
                isPlaying ? "animate-[soundBar_0.8s_ease-in-out_infinite]" : "h-1 opacity-40"
              }`}
              style={{ height: isPlaying ? "80%" : "20%" }}
            />
            <span
              className={`w-[2px] bg-gold rounded-full transition-all ${
                isPlaying ? "animate-[soundBar_1.1s_ease-in-out_infinite_0.2s]" : "h-1 opacity-40"
              }`}
              style={{ height: isPlaying ? "100%" : "30%" }}
            />
            <span
              className={`w-[2px] bg-gold rounded-full transition-all ${
                isPlaying ? "animate-[soundBar_0.9s_ease-in-out_infinite_0.4s]" : "h-1 opacity-40"
              }`}
              style={{ height: isPlaying ? "60%" : "25%" }}
            />
          </div>

          <span className="hidden xs:inline text-[10px] sm:text-[11px] text-stone-300 font-serif max-w-[75px] sm:max-w-[140px] truncate group-hover:text-gold-soft transition-colors">
            {soulTrack ? soulTrack.name : (generalTrack?.title || "Música")}
          </span>
        </button>

        {/* Botón Silenciar / Des-silenciar (desktop) */}
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className="hidden sm:flex w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 text-stone-300 hover:text-gold items-center justify-center text-[10px] transition-colors cursor-pointer"
          title={isMuted ? "Activar sonido" : "Silenciar"}
          aria-label={isMuted ? "Activar sonido" : "Silenciar"}
        >
          {isMuted ? "🔇" : "🔊"}
        </button>

        {/* Botón Play / Pause con contexto claro de música */}
        <button
          type="button"
          onClick={() => {
            const nextState = !isPlaying;
            setIsPlaying(nextState);
            if (nextState && isMuted) {
              setIsMuted(false);
            }
          }}
          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gold/20 hover:bg-gold/35 border border-gold/50 text-gold-soft flex items-center justify-center text-[9px] sm:text-[10px] font-bold active:scale-90 transition-all shadow-[0_0_8px_rgba(201,168,106,0.2)] cursor-pointer"
          title={isPlaying ? "Pausar música de fondo" : "Reproducir música de fondo"}
          aria-label={isPlaying ? "Pausar música de fondo" : "Reproducir música de fondo"}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
      </div>

      {/* Panel desplegable con controles de volumen y detalles */}
      {isExpanded && (
        <div className="absolute top-full right-0 mt-2.5 w-72 sm:w-80 p-4 rounded-2xl bg-[#0e1218]/98 border border-gold/40 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] text-stone-200 text-xs space-y-3.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <span className="text-[10px] uppercase tracking-[0.2em] text-gold-soft font-semibold flex items-center gap-1.5">
              <span>✦</span>
              <span>{soulTrack ? `En Memoria de ${soulTrack.name}` : (generalTrack ? "Música General" : "Santuario")}</span>
              {ytId && (
                <span className="text-[9px] bg-red-600/30 border border-red-500/40 text-red-200 px-1.5 py-0.2 rounded-full uppercase">
                  YouTube
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-stone-400 hover:text-white text-xs p-1 rounded-md hover:bg-white/10 transition-colors"
              aria-label="Cerrar panel"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-stone-100 font-serif text-sm leading-snug line-clamp-2">
              {trackTitle}
            </p>
            <p className="text-[11px] text-stone-400">
              {soulTrack
                ? "Música personalizada asignada a este ser querido."
                : generalTrack
                ? "Música general establecida por el administrador para el santuario."
                : "Acorde ceremonial en Re menor novena mística."}
            </p>
          </div>

          {/* Control deslizante de volumen maestro */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-stone-300">
              <span className="flex items-center gap-1.5">
                <span>{isMuted ? "🔇" : volume === 0 ? "🔈" : volume < 0.5 ? "🔉" : "🔊"}</span>
                <span>Volumen</span>
              </span>
              <span className="font-mono text-gold-soft">{isMuted ? "0%" : `${Math.round(volume * 100)}%`}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const newVol = parseFloat(e.target.value);
                setVolume(newVol);
                if (isMuted && newVol > 0) setIsMuted(false);
              }}
              className="w-full accent-gold bg-stone-800 rounded-lg h-1.5 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isMuted ? "🔊 Activar" : "🔇 Silenciar"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const nextState = !isPlaying;
                setIsPlaying(nextState);
                if (nextState && isMuted) {
                  setIsMuted(false);
                }
              }}
              className="px-4 py-1.5 rounded-lg bg-gold/20 hover:bg-gold/30 border border-gold/40 text-gold-soft text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isPlaying ? "❚❚ Pausar" : "▶ Reproducir"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
