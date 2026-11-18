"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { triggerHaptic } from "@/lib/haptics";
import { normalizarGaleria } from "@/lib/galeria";
import type { GaleriaItem } from "@/types";

export default function Gallery({ fotos: fotosProp, nombre }: { fotos: GaleriaItem[]; nombre: string }) {
  // Normalizar en render: mezcla entradas legacy ("https://...") con las nuevas {url, comentario}.
  const fotos = normalizarGaleria(fotosProp);
  const [open, setOpen] = useState<number | null>(null);
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({});
  const markLoaded = useCallback((src: string) => {
    setLoadedMap((prev) => (prev[src] ? prev : { ...prev, [src]: true }));
  }, []);

  const close = useCallback(() => {
    triggerHaptic("light");
    setOpen(null);
  }, []);

  const move = useCallback(
    (d: number) => {
      triggerHaptic("selection");
      setOpen((i) => (i === null ? i : (i + d + fotos.length) % fotos.length));
    },
    [fotos.length]
  );

  // Bloquear el scroll de la página y avisar al shell (para ocultar el banner superior)
  useEffect(() => {
    if (open === null) return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    window.dispatchEvent(new Event("panteon:album-open"));
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      window.dispatchEvent(new Event("panteon:album-close"));
    };
  }, [open]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, move]);

  // Deslizar horizontalmente para cambiar de foto (con tolerancia a vibraciones verticales)
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const didSwipe = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
    didSwipe.current = false;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (swipeStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - swipeStartX.current;
      const dy = e.changedTouches[0].clientY - (swipeStartY.current ?? e.changedTouches[0].clientY);
      // Sólo si el gesto fue claramente horizontal
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        didSwipe.current = true;
        move(dx < 0 ? 1 : -1);
      }
      swipeStartX.current = null;
      swipeStartY.current = null;
    },
    [move]
  );

  const onOverlayClick = useCallback(() => {
    // Un swipe no debe cerrarse tocando (el click llega después de touchend)
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    close();
  }, [close]);

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8 gap-2.5 sm:gap-3.5">
        {fotos.map((item, i) => {
          const src = item.url;
          const comentario = item.comentario;
          const isGif = /\.gif(\?|$)/i.test(src) || src.toLowerCase().includes(".gif");
          const isVideoClip = /\.(mp4|webm|mov)(\?|$)/i.test(src);
          const isLoaded = Boolean(loadedMap[src]);
          return (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setOpen(i);
              }}
              aria-label={`Ampliar fotografía o animación ${i + 1}`}
              className="relative aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-gold/60 active:scale-95 group bg-stone-950 transition-transform cursor-pointer"
            >
              {!isLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900/90 animate-pulse pointer-events-none z-10">
                  <span className="w-4 h-4 rounded-full border-2 border-gold/30 border-t-gold animate-spin mb-1" />
                  {(isGif || isVideoClip) && (
                    <span className="text-[9px] text-gold-soft/80 tracking-wider uppercase">
                      Cargando
                    </span>
                  )}
                </div>
              )}

              {isVideoClip ? (
                <video
                  src={src}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  onLoadedData={() => markLoaded(src)}
                  onError={() => markLoaded(src)}
                  className={`w-full h-full object-cover group-hover:scale-105 transition duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={src}
                  alt={`Recuerdo de ${nombre} ${i + 1}`}
                  loading={isGif ? "eager" : "lazy"}
                  decoding={isGif ? "sync" : "async"}
                  fetchPriority={isGif ? "high" : "auto"}
                  onLoad={() => markLoaded(src)}
                  onError={() => markLoaded(src)}
                  className={`w-full h-full object-cover ${isGif ? "" : "grayscale-[30%]"} group-hover:grayscale-0 group-hover:scale-105 transition duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
                />
              )}
              {isGif && (
                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-sans font-bold bg-gold/90 text-stone-950 uppercase tracking-wider shadow pointer-events-none z-20">
                  GIF
                </span>
              )}
              {isVideoClip && (
                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-sans font-bold bg-emerald-400/90 text-stone-950 uppercase tracking-wider shadow pointer-events-none z-20">
                  CLIP
                </span>
              )}
              {comentario && (
                <span className="absolute bottom-0 inset-x-0 px-1.5 py-1 bg-gradient-to-t from-black/85 via-black/55 to-transparent text-[9px] leading-tight text-stone-100 line-clamp-2 text-left pointer-events-none z-20">
                  {comentario}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {open !== null && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/95 p-3 sm:p-10 select-none"
          role="dialog"
          aria-modal="true"
          onClick={onOverlayClick}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{ animation: "backdropIn 200ms ease-out", touchAction: "pan-y", overscrollBehavior: "contain" }}
        >
          {/* Botón cerrar seguro para muesca/isla dinámica */}
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar visor"
            className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] w-11 h-11 rounded-full bg-white/10 border border-white/20 text-stone-200 hover:text-white active:scale-90 grid place-items-center text-lg z-10"
          >
            ✕
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              move(-1);
            }}
            aria-label="Foto anterior"
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-gold/20 border border-white/20 text-2xl grid place-items-center active:scale-90 z-10 text-stone-100"
          >
            ‹
          </button>

          {/\.(mp4|webm|mov)(\?|$)/i.test(fotos[open].url) ? (
            <video
              src={fotos[open].url}
              autoPlay
              loop
              muted
              playsInline
              controls
              onClick={(e) => e.stopPropagation()}
              className="max-w-[94vw] max-h-[78vh] sm:max-h-[82vh] rounded-xl shadow-2xl object-contain border border-white/15 bg-black"
            />
          ) : (
            <div className="relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              {!loadedMap[fotos[open].url] && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="w-7 h-7 rounded-full border-2 border-gold/30 border-t-gold animate-spin mb-2" />
                  <span className="text-xs text-gold-soft tracking-wider">Cargando...</span>
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotos[open].url}
                alt={fotos[open].comentario ?? `Fotografía de ${nombre}`}
                onLoad={() => markLoaded(fotos[open].url)}
                className="max-w-[94vw] max-h-[78vh] sm:max-h-[82vh] rounded-xl shadow-2xl object-contain border border-white/15"
              />
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              move(1);
            }}
            aria-label="Siguiente foto"
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-gold/20 border border-white/20 text-2xl grid place-items-center active:scale-90 z-10 text-stone-100"
          >
            ›
          </button>

          <div className="absolute bottom-[max(1.2rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-full max-w-[94vw] sm:max-w-xl flex flex-col items-center gap-2 px-3">
            {fotos[open].comentario && (
              <div className="w-full text-center text-sm text-stone-100 bg-black/70 border border-white/10 rounded-xl px-4 py-2 backdrop-blur-sm">
                {fotos[open].comentario}
              </div>
            )}
            <div className="text-[11px] tracking-[0.25em] text-stone-400 bg-stone-900/80 px-4 py-1.5 rounded-full border border-white/10">
              {open + 1} / {fotos.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
