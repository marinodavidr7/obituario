"use client";
import { useEffect, useState } from "react";
import type { Video } from "@/lib/db";
import { embedVideo, extractYouTubeId } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";

export default function Videos({ videos }: { videos: Video[] }) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const cur = open !== null ? videos[open] : null;
  const info = cur ? embedVideo(cur.url) : null;
  const isCurShort = cur ? cur.url.includes("/shorts/") : false;
  const isVertical = info?.tipo === "tiktok" || isCurShort;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {videos.map((v, i) => {
          const ytId = extractYouTubeId(v.url);
          const t = embedVideo(v.url).tipo;
          const isShort = v.url.includes("/shorts/");
          const badge = t === "tiktok" ? "TikTok" : isShort ? "Shorts" : t === "youtube" ? "YouTube" : v.fuente || "Vídeo";
          const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;

          return (
            <button
              key={`${v.url}-${i}`}
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setOpen(i);
              }}
              aria-label={`Reproducir vídeo: ${v.titulo}`}
              className="relative aspect-video sm:aspect-[16/10] rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 hover:border-gold/60 active:scale-95 group bg-stone-950 transition-all duration-300 shadow-lg text-left cursor-pointer"
            >
              {/* Imagen miniatura del vídeo como en las fotos */}
              {thumb ? (
                <img
                  src={thumb}
                  alt={v.titulo}
                  loading="lazy"
                  className="w-full h-full object-cover grayscale-[15%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1a202c] via-[#0d1117] to-black flex items-center justify-center p-4">
                  <span className="text-3xl text-gold/40">🎬</span>
                </div>
              )}

              {/* Degradado oscuro para resaltar texto */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10 group-hover:from-black/95 transition-colors" />

              {/* Botón flotante central dorado con icono play */}
              <div className="absolute inset-0 grid place-items-center">
                <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 backdrop-blur-md border border-gold/70 text-gold-soft grid place-items-center text-sm shadow-[0_0_20px_rgba(201,168,106,0.3)] group-hover:scale-110 group-hover:bg-gold group-hover:text-stone-950 transition-all duration-300">
                  ▶
                </span>
              </div>

              {/* Badge superior (Shorts, YouTube, TikTok) */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-sans tracking-wider uppercase font-semibold bg-stone-950/80 backdrop-blur-md border border-white/15 text-gold-soft shadow-sm">
                  {badge}
                </span>
              </div>

              {/* Título en la parte inferior */}
              <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-3">
                <p className="text-xs sm:text-sm font-medium text-stone-100 group-hover:text-gold-soft transition-colors line-clamp-2 leading-tight">
                  {v.titulo}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {cur && (
        <div
          className="fixed inset-0 z-[110] grid place-items-center bg-black/95 backdrop-blur-md p-3 sm:p-8 select-none"
          onClick={() => setOpen(null)}
          style={{ animation: "backdropIn 200ms ease-out" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${isVertical ? "max-w-sm sm:max-w-md" : "max-w-5xl"} bg-stone-950 border border-gold/35 rounded-2xl overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.95)]`}
            style={{ animation: "modalIn 260ms cubic-bezier(0.23,1,0.32,1)" }}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-stone-900/90">
              <h4 className="font-serif text-sm sm:text-base text-stone-100 truncate pr-3">{cur.titulo}</h4>
              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label="Cerrar vídeo"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-gold/20 border border-white/15 text-stone-300 grid place-items-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            {info?.embed ? (
              <iframe
                src={info.embed}
                title={cur.titulo}
                className={isVertical ? "w-full h-[520px] sm:h-[640px]" : "w-full aspect-video"}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="p-10 text-center text-sm text-stone-400">
                <a href={cur.url} target="_blank" rel="noreferrer" className="text-gold-soft underline">
                  Abrir el vídeo en una pestaña nueva
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}