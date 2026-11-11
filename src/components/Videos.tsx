"use client";
import { useEffect, useState } from "react";
import type { Video } from "@/lib/db";
import { embedVideo } from "@/lib/utils";

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

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3.5">
        {videos.map((v, i) => {
          const t = embedVideo(v.url).tipo;
          const badge = t === "tiktok" ? "TikTok · Vertical" : t === "youtube" ? "YouTube" : v.fuente || "Vídeo";
          return (
            <button key={v.url} onClick={() => setOpen(i)} className="w-full text-left flex items-center gap-3.5 p-3.5 rounded-xl bg-white/[0.02] hover:bg-gold/10 border border-white/10 hover:border-gold/45 transition-colors group">
              <span className="w-10 h-10 rounded-full bg-stone-950/85 border border-gold/60 grid place-items-center text-gold text-[11px] shrink-0">▶</span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm font-normal text-stone-100 group-hover:text-gold-soft truncate">{v.titulo}</strong>
                <small className="text-[10px] tracking-[0.16em] uppercase text-gold/80">{badge}</small>
              </span>
            </button>
          );
        })}
      </div>
      {cur && (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-black/95 backdrop-blur-md p-4 sm:p-8" onClick={() => setOpen(null)} style={{ animation: "backdropIn 200ms ease-out" }}>
          <div onClick={(e) => e.stopPropagation()} className={`relative w-full ${info?.tipo === "tiktok" ? "max-w-md" : "max-w-5xl"} bg-stone-950 border border-gold/35 rounded-2xl overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.95)]`} style={{ animation: "modalIn 260ms cubic-bezier(0.23,1,0.32,1)" }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-stone-900/90">
              <h4 className="font-serif text-lg text-stone-100 truncate pr-3">{cur.titulo}</h4>
              <button onClick={() => setOpen(null)} aria-label="Cerrar vídeo" className="w-9 h-9 rounded-full bg-white/5 hover:bg-gold/20 border border-white/15 text-stone-300 grid place-items-center">✕</button>
            </div>
            {info?.embed ? (
              <iframe src={info.embed} title={cur.titulo} className={info.tipo === "tiktok" ? "w-full h-[640px]" : "w-full aspect-video"} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
            ) : (
              <div className="p-10 text-center text-sm text-stone-400">
                <a href={cur.url} target="_blank" rel="noreferrer" className="text-gold-soft underline">Abrir el vídeo en una pestaña nueva</a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}