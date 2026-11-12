"use client";

import { useMemo, useRef, useState } from "react";
import type { Video } from "@/lib/db";
import { embedVideo, extractYouTubeId } from "@/lib/utils";

interface VideosProps {
  videos: Video[];
  nombre?: string;
}

export default function Videos({ videos, nombre = "En Memoria" }: VideosProps) {
  const [modo, setModo] = useState<"retrato" | "cine">("retrato");
  const [mutedStates, setMutedStates] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    videos.forEach((_, i) => {
      init[i] = true;
    });
    return init;
  });

  const iframeRefs = useRef<Record<number, HTMLIFrameElement | null>>({});

  const videoList = useMemo(() => {
    return videos.map((v, i) => {
      const ytId = extractYouTubeId(v.url);
      const isShort = v.url.includes("/shorts/");
      const info = embedVideo(v.url);
      const isVertical = info.tipo === "tiktok" || isShort;

      let embedUrl = info.embed;
      if (ytId) {
        // Embed limpio sin bordes negros, en bucle continuo y silenciado estilo TikTok
        embedUrl = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&iv_load_policy=3`;
      }

      // Insignia dinámica al estilo del diseño (MEMORIA EN VIVO, HOMENAJE, RECUERDO)
      const badgeText = i === 0 ? "MEMORIA EN VIVO" : i === 1 ? "HOMENAJE" : "RECUERDO";

      return {
        ...v,
        index: i,
        ytId,
        isVertical,
        embedUrl,
        badgeText,
        isShort,
      };
    });
  }, [videos]);

  if (!videoList.length) return null;

  const toggleSound = (idx: number) => {
    const iframe = iframeRefs.current[idx];
    if (!iframe?.contentWindow) return;

    const currentMuted = mutedStates[idx] ?? true;
    if (currentMuted) {
      iframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', "*");
      iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', "*");
      setMutedStates((prev) => ({ ...prev, [idx]: false }));
    } else {
      iframe.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', "*");
      setMutedStates((prev) => ({ ...prev, [idx]: true }));
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* Cabecera con selector [ Retrato | Cine ] */}
      <div className="flex items-center justify-between gap-4 border-b border-pink-400/20 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <h4 className="text-[11px] sm:text-xs font-semibold tracking-[0.25em] uppercase text-pink-300/90 truncate">
            REGISTROS EN VÍDEO ({videoList.length})
          </h4>
          <span className="hidden sm:block flex-1 h-px bg-gradient-to-r from-pink-400/30 to-transparent w-24" />
        </div>

        {/* Selector de modo estilo TikTok / Cine */}
        <div className="inline-flex items-center p-1 rounded-full bg-stone-900/90 border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setModo("retrato")}
            className={`px-3.5 py-1 rounded-full text-xs font-serif transition-all cursor-pointer ${
              modo === "retrato"
                ? "bg-pink-900/50 text-pink-200 border border-pink-400/40 shadow-sm font-medium"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Retrato
          </button>
          <button
            type="button"
            onClick={() => setModo("cine")}
            className={`px-3.5 py-1 rounded-full text-xs font-serif transition-all cursor-pointer ${
              modo === "cine"
                ? "bg-pink-900/50 text-pink-200 border border-pink-400/40 shadow-sm font-medium"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Cine
          </button>
        </div>
      </div>

      {/* Grid de vídeos: sin bordes negros y sin datos en modo Cine */}
      <div
        className={
          modo === "retrato"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-7 justify-center items-start"
            : "grid grid-cols-1 gap-6 max-w-4xl mx-auto"
        }
      >
        {videoList.map((v) => {
          const isMuted = mutedStates[v.index] ?? true;

          return (
            <div
              key={`${v.url}-${v.index}`}
              className={`group relative mx-auto w-full ${
                modo === "retrato"
                  ? "max-w-[340px] xs:max-w-[360px] aspect-[9/16] rounded-[32px] sm:rounded-[36px]"
                  : "aspect-video max-w-4xl rounded-2xl"
              } overflow-hidden border border-pink-400/25 bg-black shadow-[0_20px_50px_rgba(0,0,0,0.85)]`}
            >
              {/* Vídeo en bucle automático - scale elimina cualquier borde negro */}
              {v.embedUrl ? (
                <div className="w-full h-full overflow-hidden relative bg-black">
                  <iframe
                    ref={(el) => {
                      iframeRefs.current[v.index] = el;
                    }}
                    src={v.embedUrl}
                    title={v.titulo}
                    className={`w-full h-full border-0 transform ${
                      modo === "retrato"
                        ? "scale-[1.35]"
                        : v.isVertical
                        ? "scale-[1.78]"
                        : "scale-[1.02]"
                    } origin-center pointer-events-auto`}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-stone-400">
                  <span className="text-4xl mb-2">🎬</span>
                  <p className="text-sm">{v.titulo}</p>
                </div>
              )}

              {/* Insignia superior izquierda: SOLO en modo Retrato (en modo Cine queda limpio sin datos) */}
              {modo === "retrato" && (
                <div className="absolute top-4 left-4 z-20 pointer-events-none">
                  <span className="px-3 py-1 rounded-full text-[10px] uppercase font-sans tracking-[0.16em] font-semibold bg-black/65 backdrop-blur-md border border-white/10 text-stone-100 shadow-md">
                    {v.badgeText}
                  </span>
                </div>
              )}

              {/* Botón superior derecho para activar audio */}
              {v.ytId && (
                <button
                  type="button"
                  onClick={() => toggleSound(v.index)}
                  className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/65 hover:bg-black/90 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-90 transition-all cursor-pointer shadow-lg"
                  title={isMuted ? "Activar audio" : "Silenciar audio"}
                  aria-label={isMuted ? "Activar audio" : "Silenciar audio"}
                >
                  {isMuted ? (
                    <span className="text-xs">🔇</span>
                  ) : (
                    <span className="text-xs">🔊</span>
                  )}
                </button>
              )}

              {/* Capa inferior con frase y créditos: SOLO en modo Retrato (en modo Cine queda limpio sin datos) */}
              {modo === "retrato" && (
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none z-10">
                  <p className="font-serif italic text-sm sm:text-base text-stone-100 leading-snug line-clamp-2">
                    “{v.titulo || "Tu alegría ilumina cada recuerdo"}”
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-stone-400 mt-2 font-sans">
                    <span className="truncate font-light">
                      {nombre.split(" ")[0]} • Archivo Familiar
                    </span>
                    <span className="font-mono text-stone-400/90 shrink-0 ml-2 text-[10px]">
                      {v.isShort ? "Shorts" : "Vídeo"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
