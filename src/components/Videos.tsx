"use client";

import { useMemo, useState } from "react";
import type { Video } from "@/lib/db";
import { embedVideo, extractYouTubeId } from "@/lib/utils";

interface VideosProps {
  videos: Video[];
}

export default function Videos({ videos }: { videos: Video[] }) {
  const [activeIdx, setActiveIdx] = useState(0);

  const videoList = useMemo(() => {
    return videos.map((v, i) => {
      const ytId = extractYouTubeId(v.url);
      const isShort = v.url.includes("/shorts/");
      const info = embedVideo(v.url);
      const isVertical = info.tipo === "tiktok" || isShort;

      let embedUrl = info.embed;
      if (ytId) {
        // Autoplay silenciado en bucle continuo estilo TikTok / Shorts con controles para activar audio
        embedUrl = `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&playsinline=1&controls=1&rel=0&modestbranding=1`;
      }

      return {
        ...v,
        index: i,
        ytId,
        isVertical,
        embedUrl,
        tipo: info.tipo,
        badge: info.tipo === "tiktok" ? "TikTok" : isShort ? "Shorts" : "YouTube",
      };
    });
  }, [videos]);

  if (!videoList.length) return null;

  // Si hay más de un vídeo, permitimos alternar entre ellos mediante pestañas
  const currentVideo = videoList[activeIdx] || videoList[0];

  return (
    <div className="w-full space-y-4">
      {videoList.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
          {videoList.map((v, idx) => (
            <button
              key={`${v.url}-${idx}`}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`px-4 py-1.5 rounded-full text-xs font-serif transition-all cursor-pointer ${
                activeIdx === idx
                  ? "bg-gold text-stone-950 font-semibold shadow-[0_0_15px_rgba(201,168,106,0.35)] scale-105"
                  : "bg-stone-900/80 text-stone-300 hover:text-white border border-white/10"
              }`}
            >
              {v.titulo || `Vídeo ${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Contenedor estilo TikTok / Reels */}
      <div className="flex flex-col items-center">
        <div
          className={`relative w-full ${
            currentVideo.isVertical
              ? "max-w-[320px] xs:max-w-[350px] sm:max-w-[380px] aspect-[9/16]"
              : "max-w-2xl aspect-video"
          } rounded-[26px] sm:rounded-[32px] overflow-hidden border-2 border-gold/50 bg-black shadow-[0_20px_50px_rgba(0,0,0,0.85)]`}
        >
          {currentVideo.embedUrl ? (
            <iframe
              key={currentVideo.embedUrl}
              src={currentVideo.embedUrl}
              title={currentVideo.titulo}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture; accelerometer; gyroscope"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-stone-400">
              <span className="text-4xl mb-2">🎬</span>
              <p className="text-sm">{currentVideo.titulo}</p>
              <a
                href={currentVideo.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 text-xs text-gold-soft underline"
              >
                Abrir enlace de vídeo
              </a>
            </div>
          )}

          {/* Insignia superior flotante de formato */}
          <div className="absolute top-3 left-3 pointer-events-none">
            <span className="px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider font-semibold bg-stone-950/80 backdrop-blur-md border border-gold/40 text-gold-soft shadow-md">
              {currentVideo.badge} · Autoplay
            </span>
          </div>
        </div>

        {/* Indicador de audio y título inferior */}
        <div className="mt-3 text-center max-w-md px-2">
          <p className="font-serif text-sm sm:text-base text-stone-100 font-medium">
            {currentVideo.titulo}
          </p>
          <div className="inline-flex items-center justify-center gap-1.5 mt-1 px-3 py-1 rounded-full bg-stone-900/60 border border-white/10 text-[10px] sm:text-[11px] text-stone-400">
            <span>🔇</span>
            <span>Reproduciendo en bucle sin sonido. Toca el altavoz del reproductor para activar el audio</span>
            <span>🔊</span>
          </div>
        </div>
      </div>
    </div>
  );
}
