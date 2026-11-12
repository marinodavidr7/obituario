"use client";

import { useMemo, useRef, useState } from "react";
import type { Video } from "@/lib/db";
import { embedVideo, extractYouTubeId } from "@/lib/utils";

interface VideosProps {
  videos: Video[];
}

export default function Videos({ videos }: { videos: Video[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const videoList = useMemo(() => {
    return videos.map((v, i) => {
      const ytId = extractYouTubeId(v.url);
      const isShort = v.url.includes("/shorts/");
      const info = embedVideo(v.url);
      const isVertical = info.tipo === "tiktok" || isShort;

      let embedUrl = info.embed;
      if (ytId) {
        // Envoltorio vertical sin bordes negros con autoplay, silenciado y loop estilo TikTok
        embedUrl = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`;
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

  const currentVideo = videoList[activeIdx] || videoList[0];

  const toggleSound = () => {
    if (!iframeRef.current?.contentWindow) return;
    if (isMuted) {
      iframeRef.current.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', "*");
      iframeRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', "*");
      setIsMuted(false);
    } else {
      iframeRef.current.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', "*");
      setIsMuted(true);
    }
  };

  return (
    <div className="w-full space-y-4">
      {videoList.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
          {videoList.map((v, idx) => (
            <button
              key={`${v.url}-${idx}`}
              type="button"
              onClick={() => {
                setActiveIdx(idx);
                setIsMuted(true);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-serif transition-all cursor-pointer ${
                activeIdx === idx
                  ? "bg-pink-500/20 text-pink-200 border border-pink-400/50 font-semibold shadow-[0_0_15px_rgba(244,114,182,0.25)] scale-105"
                  : "bg-stone-900/80 text-stone-300 hover:text-white border border-white/10"
              }`}
            >
              {v.titulo || `Vídeo ${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Envoltorio vertical sin bordes negros */}
      <div className="flex flex-col items-center">
        <div
          className={`relative w-full ${
            currentVideo.isVertical
              ? "max-w-[340px] aspect-[9/16]"
              : "max-w-2xl aspect-video"
          } mx-auto rounded-3xl overflow-hidden border border-pink-400/30 shadow-2xl bg-black`}
        >
          {currentVideo.embedUrl ? (
            <iframe
              ref={iframeRef}
              key={currentVideo.embedUrl}
              src={currentVideo.embedUrl}
              title={currentVideo.titulo}
              className="w-full h-full scale-[1.02] border-0"
              allow="autoplay; encrypted-media; picture-in-picture"
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

          {/* Botón flotante para activar / silenciar audio como en TikTok */}
          {currentVideo.ytId && (
            <button
              type="button"
              onClick={toggleSound}
              className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 hover:bg-black backdrop-blur-md border border-white/20 text-white text-xs font-sans shadow-xl active:scale-90 transition-all cursor-pointer"
              title={isMuted ? "Activar audio" : "Silenciar audio"}
            >
              <span>{isMuted ? "🔇" : "🔊"}</span>
              <span className="text-[10px] tracking-wider uppercase font-semibold">
                {isMuted ? "Activar audio" : "Silenciar"}
              </span>
            </button>
          )}

          {/* Insignia superior flotante */}
          <div className="absolute top-3 left-3 pointer-events-none">
            <span className="px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold bg-black/70 backdrop-blur-md border border-pink-400/30 text-pink-200 shadow-md">
              {currentVideo.badge}
            </span>
          </div>
        </div>

        {/* Título inferior */}
        <div className="mt-3 text-center max-w-md px-2">
          <p className="font-serif text-sm sm:text-base text-stone-100 font-medium">
            {currentVideo.titulo}
          </p>
        </div>
      </div>
    </div>
  );
}
