"use client";
import { useCallback, useEffect, useState } from "react";
import { triggerHaptic } from "@/lib/haptics";

export default function Gallery({ fotos, nombre }: { fotos: string[]; nombre: string }) {
  const [open, setOpen] = useState<number | null>(null);

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

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8 gap-2.5 sm:gap-3.5">
        {fotos.map((src, i) => {
          const isGif = src.toLowerCase().includes(".gif");
          return (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setOpen(i);
              }}
              aria-label={`Ampliar fotografía o GIF ${i + 1}`}
              className="relative aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-gold/60 active:scale-95 group bg-black transition-transform cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Recuerdo de ${nombre} ${i + 1}`}
                loading="lazy"
                className={`w-full h-full object-cover ${isGif ? "" : "grayscale-[30%]"} group-hover:grayscale-0 group-hover:scale-105 transition duration-300`}
              />
              {isGif && (
                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-sans font-bold bg-gold/90 text-stone-950 uppercase tracking-wider shadow pointer-events-none">
                  GIF
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
          onClick={close}
          style={{ animation: "backdropIn 200ms ease-out" }}
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

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotos[open]}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-w-[94vw] max-h-[78vh] sm:max-h-[82vh] rounded-xl shadow-2xl object-contain border border-white/15"
          />

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

          <div className="absolute bottom-[max(1.2rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 text-[11px] tracking-[0.25em] text-stone-400 bg-stone-900/80 px-4 py-1.5 rounded-full border border-white/10">
            {open + 1} / {fotos.length}
          </div>
        </div>
      )}
    </>
  );
}
