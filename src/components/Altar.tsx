import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { crearVelaRealistaSVG } from "@/lib/svg";
import { triggerHaptic } from "@/lib/haptics";
import { addOfrenda } from "@/lib/db";
import { FLORES_OPCIONES, FlorOpcion, getFlorImg, getFlorNombre } from "@/lib/flores";

const LLAMA = `<svg class="llama" viewBox="0 0 24 32" aria-hidden="true"><path d="M12 1c2.6 5.7 8 8.7 8 15.6C20 25 16.4 29 12 29S4 25 4 16.6C4 8.7 9.4 6.7 12 1z" fill="#ff8a1f"/><path d="M12 10c1.2 2.8 3.8 4.3 3.8 7.6 0 3-1.7 5.2-3.8 5.2s-3.8-2.2-3.8-5.2C8.2 14.3 10.8 12.8 12 10z" fill="#ffe08a"/></svg>`;

interface FloatingTribute {
  id: number;
  x: number;
  y: number;
  tipo: "vela" | "flor";
  img?: string;
}

interface AltarProps {
  personaId: string;
  velas: number;
  flores: number;
  visitas: number;
  floresTipos?: string[];
  nombre?: string;
}

export default function Altar({
  personaId,
  velas: v0,
  flores: f0,
  visitas,
  floresTipos: ft0 = [],
  nombre,
}: AltarProps) {
  const [velas, setVelas] = useState(v0);
  const [flores, setFlores] = useState(f0);
  const [floresTipos, setFloresTipos] = useState<string[]>(Array.isArray(ft0) ? ft0 : []);
  const [msg, setMsg] = useState("");
  const [glow, setGlow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showFlorModal, setShowFlorModal] = useState(false);
  const [floatingTributes, setFloatingTributes] = useState<FloatingTribute[]>([]);

  // Detección reactiva de pantalla móvil para dimensionar el altar a la perfección
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 640;
    }
    return true;
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Escuchar ofrendas en tiempo real emitidas por otros usuarios
  useEffect(() => {
    const handleRealtimeOfrenda = (e: Event) => {
      const custom = e as CustomEvent<{
        personaId: string;
        velas: number;
        flores: number;
        floresTipos?: string[];
        tipo?: "vela" | "flor";
        florNombre?: string;
      }>;
      if (custom.detail?.personaId === personaId) {
        setVelas(custom.detail.velas);
        setFlores(custom.detail.flores);
        if (Array.isArray(custom.detail.floresTipos)) {
          setFloresTipos(custom.detail.floresTipos);
        }
        setGlow(true);
        setTimeout(() => setGlow(false), 1200);
        if (custom.detail.tipo === "vela") {
          setMsg("Alguien acaba de encender una vela en su memoria.");
        } else if (custom.detail.tipo === "flor") {
          setMsg(
            custom.detail.florNombre
              ? `Alguien acaba de depositar «${custom.detail.florNombre}» en su memoria.`
              : "Alguien acaba de depositar flores en su memoria."
          );
        }
        setTimeout(() => setMsg(""), 3500);
      }
    };

    window.addEventListener("panteon:realtime-ofrenda", handleRealtimeOfrenda);
    return () => window.removeEventListener("panteon:realtime-ofrenda", handleRealtimeOfrenda);
  }, [personaId]);

  // Bloqueo de scroll y gestión de capas mientras el modal esté abierto
  useEffect(() => {
    if (showFlorModal) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      window.dispatchEvent(new CustomEvent("panteon:modal-opened", { detail: { modal: "flor" } }));

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setShowFlorModal(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
        window.dispatchEvent(new CustomEvent("panteon:modal-closed", { detail: { modal: "flor" } }));
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showFlorModal]);

  // Encender vela
  async function ofrecerVela(e?: React.MouseEvent) {
    if (busy) return;
    setBusy(true);

    triggerHaptic("candle");

    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top;
      const id = Date.now() + Math.random();
      setFloatingTributes((prev) => [...prev, { id, x: startX, y: startY, tipo: "vela" }]);
      setTimeout(() => {
        setFloatingTributes((prev) => prev.filter((t) => t.id !== id));
      }, 1900);
    }

    setVelas((n) => n + 1);
    setGlow(true);
    setTimeout(() => setGlow(false), 900);
    setMsg("Has encendido una vela de luz perpetua en su memoria.");
    setTimeout(() => setMsg(""), 2800);

    try {
      const d = addOfrenda(personaId, "vela");
      setVelas(d.velas);
      setFlores(d.flores);
    } finally {
      setBusy(false);
    }
  }

  // Dejar la flor seleccionada por el usuario
  async function ofrecerFlorSeleccionada(flor: FlorOpcion, e?: React.MouseEvent) {
    if (busy) return;
    setBusy(true);
    setShowFlorModal(false);

    triggerHaptic("success");

    // Efecto flotante con la imagen exacta de la flor elegida
    const startX = e ? e.clientX || window.innerWidth / 2 : window.innerWidth / 2;
    const startY = e ? e.clientY || window.innerHeight / 2 : window.innerHeight / 2;
    const id = Date.now() + Math.random();
    setFloatingTributes((prev) => [
      ...prev,
      { id, x: startX, y: startY, tipo: "flor", img: flor.img },
    ]);
    setTimeout(() => {
      setFloatingTributes((prev) => prev.filter((t) => t.id !== id));
    }, 1900);

    // Actualización optimista
    setFlores((n) => n + 1);
    setFloresTipos((prev) => [...prev, flor.id]);
    setGlow(true);
    setTimeout(() => setGlow(false), 900);
    setMsg(`Has depositado «${flor.nombre}» en su memoria.`);
    setTimeout(() => setMsg(""), 3000);

    try {
      const d = addOfrenda(personaId, "flor", flor.id);
      setVelas(d.velas);
      setFlores(d.flores);
      if (d.flores_tipos) setFloresTipos(d.flores_tipos);
    } finally {
      setBusy(false);
    }
  }

  // Cantidad de elementos balanceados para aprovechar el ancho en PC y evitar colapsos en móviles
  const maxV = Math.min(velas, isMobile ? 6 : 14);
  const maxF = Math.min(flores, isMobile ? 5 : 12);

  const velasHtml = useMemo(
    () => Array.from({ length: maxV }, (_, i) => crearVelaRealistaSVG(i)).join(""),
    [maxV]
  );

  // Mapeo ordenado de las flores más recientes a mostrar en el altar
  const floresParaLedge = useMemo(() => {
    const safeTipos = Array.isArray(floresTipos) ? floresTipos : [];
    return Array.from({ length: maxF }, (_, i) => {
      const idx = safeTipos.length > i ? safeTipos[safeTipos.length - 1 - i] : undefined;
      return {
        id: idx,
        img: getFlorImg(idx, i),
        nombre: getFlorNombre(idx),
      };
    });
  }, [maxF, floresTipos]);

  return (
    <section className="altar-sanctuary mt-6 sm:mt-9 rounded-2xl relative">
      {/* Animación flotante de tributos */}
      {floatingTributes.map((t) => (
        <div
          key={t.id}
          style={{ left: t.x, top: t.y }}
          className="fixed pointer-events-none z-[99999] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-flower-float"
        >
          {t.tipo === "flor" ? (
            <img
              src={t.img || "/img/flores_lujo_rojas.png"}
              alt="Flor ofrendada"
              className="w-20 sm:w-28 h-28 sm:h-40 object-contain filter drop-shadow-[0_0_35px_rgba(244,63,94,0.9)] scale-110"
            />
          ) : (
            <span className="text-4xl sm:text-5xl drop-shadow-[0_0_20px_rgba(255,160,50,0.9)]">
              🕯️
            </span>
          )}
        </div>
      ))}

      <div className={`sanctuary-ignite-glow ${glow ? "active" : ""}`} />

      {/* Cabecera y botones del altar */}
      <div className="relative z-10 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-3.5 sm:gap-4">
        <div className="text-center sm:text-left">
          <span className="text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.28em] text-gold/80 block">
            Santuario de Luz y Memoria
          </span>
          <h4 className="font-serif text-xl sm:text-2xl text-stone-100 mt-0.5">
            Altar de Ofrendas
          </h4>
          <p className="text-xs text-stone-400 mt-0.5 max-w-sm">
            Cada vela y cada arreglo floral permanece iluminando su descanso perpetuo.
          </p>
        </div>

        {/* Botones de acción táctiles y ergonómicos */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={ofrecerVela}
            className="tribute-btn min-h-[46px] inline-flex items-center justify-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 border border-amber-400/50 text-amber-200 text-[11px] sm:text-xs uppercase tracking-[0.14em] sm:tracking-[0.18em] shadow-[0_0_20px_rgba(255,160,40,0.18)] cursor-pointer"
          >
            <span dangerouslySetInnerHTML={{ __html: LLAMA }} /> <span>Prender Vela</span>
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              setShowFlorModal(true);
            }}
            className="tribute-btn min-h-[46px] inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 rounded-full bg-rose-950/60 hover:bg-rose-900/70 active:scale-95 border border-rose-400/50 text-rose-100 text-[11px] sm:text-xs uppercase tracking-[0.14em] sm:tracking-[0.18em] shadow-[0_0_20px_rgba(244,63,94,0.25)] cursor-pointer"
          >
            <span>🌹</span> <span>Dejar Flores</span>
          </button>
        </div>
      </div>

      {/* Escenario del Altar con disposición escalonada en niveles (velas arriba, flores al frente) */}
      <div className="altar-ledge relative z-10 px-2 sm:px-6 py-4 overflow-hidden">
        {velas === 0 && flores === 0 ? (
          <div className="py-8 text-center px-4">
            <p className="font-serif italic text-base text-stone-400">
              El altar aguarda su primera luz o arreglo floral.
            </p>
            <p className="text-[11px] text-stone-500 mt-1">
              Toca «Prender Vela» o «Dejar Flores» para colocar tu ofrenda en su memoria.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-end w-full min-h-[140px] sm:min-h-[160px]">
            {/* Nivel Superior / Posterior: Fila de Velas encendidas centradas con halos cálidos */}
            {velas > 0 && (
              <div className="w-full flex items-end justify-center py-1 sm:py-2">
                <div
                  className="flex items-end justify-center gap-2 sm:gap-3.5 max-w-full"
                  dangerouslySetInnerHTML={{ __html: velasHtml }}
                />
              </div>
            )}

            {/* Nivel Frontal / Repisa Principal: Arreglos florales amplios y frondosos */}
            {flores > 0 && (
              <div
                className={`w-full flex items-end justify-center -space-x-2.5 sm:-space-x-3.5 px-3 py-1 overflow-x-auto no-scrollbar ${
                  velas > 0 ? "-mt-3.5 sm:-mt-5 relative z-10" : "my-1"
                }`}
              >
                {floresParaLedge.map((f, i) => (
                  <div
                    key={`fl-${i}`}
                    className="real-bouquet flex flex-col items-center justify-end -mb-1 animate-in zoom-in-75 duration-300 group relative shrink-0"
                    title={f.nombre}
                  >
                    <img
                      src={f.img}
                      alt={f.nombre}
                      className="w-16 xs:w-18 sm:w-22 md:w-24 h-24 xs:h-28 sm:h-32 md:h-36 object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.95)] hover:scale-115 active:scale-105 transition-all cursor-pointer relative z-10 hover:z-30"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Badges de ofrendas acumuladas adicionales */}
            {(velas > maxV || flores > maxF) && (
              <div className="w-full flex items-center justify-center gap-2 pt-2.5 sm:pt-3">
                {velas > maxV && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-gold/30 text-[10px] text-gold-soft font-sans">
                    +{velas - maxV} velas más
                  </span>
                )}
                {flores > maxF && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-400/30 text-[10px] text-rose-200 font-sans">
                    +{flores - maxF} arreglos florales más
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Barra de estadísticas del altar */}
      <div className="relative z-10 px-4 sm:px-6 py-3 bg-stone-950/80 flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-xs text-stone-300">
        <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-[11px] sm:text-xs">
          <span>
            🕯️ <b className="text-gold-soft font-medium">{velas}</b> {velas === 1 ? "vela" : "velas"}
          </span>
          <span>
            🌹 <b className="text-rose-200 font-medium">{flores}</b>{" "}
            {flores === 1 ? "ofrenda floral" : "ofrendas florales"}
          </span>
          <span className="text-stone-400">
            👁️ <b className="text-stone-200 font-normal">{visitas}</b> visitas
          </span>
        </div>
        <span
          className="text-[11px] italic font-serif text-gold-soft transition-opacity duration-200 w-full sm:w-auto text-center sm:text-right"
          style={{ opacity: msg ? 1 : 0 }}
          aria-live="polite"
        >
          {msg}
        </span>
      </div>

      {/* Modal / Selector de Flores montado con React Portal directamente al body */}
      {showFlorModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-200"
            onClick={() => setShowFlorModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-[#0c1015] border-t-2 sm:border border-gold/45 rounded-t-3xl sm:rounded-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.98)] max-h-[85vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300"
            >
              {/* Header fijo del modal con fondo 100% sólido */}
              <div className="shrink-0 relative px-5 pt-4 pb-3 border-b border-white/10 bg-[#0f141c] text-center">
                {/* Indicador táctil para deslizar en móvil */}
                <div className="w-12 h-1 bg-stone-600 rounded-full mx-auto mb-2.5 sm:hidden" />
                <button
                  type="button"
                  onClick={() => setShowFlorModal(false)}
                  className="absolute top-3.5 right-4 w-8 h-8 rounded-full border border-white/15 bg-white/5 text-stone-400 hover:text-stone-100 hover:border-gold/50 flex items-center justify-center text-lg active:scale-95 transition-all cursor-pointer"
                  aria-label="Cerrar selector de flores"
                >
                  ✕
                </button>
                <span className="text-[10px] uppercase tracking-[0.25em] text-rose-300 font-medium block">
                  Ofrenda en Memoria Perpetua
                </span>
                <h3 className="font-serif text-lg sm:text-2xl text-stone-100 mt-0.5">
                  Elige el Arreglo Floral
                </h3>
                <p className="text-xs text-stone-400 mt-0.5 max-w-md mx-auto">
                  {nombre
                    ? `Selecciona las flores con las que deseas homenajear a ${nombre}`
                    : "Selecciona el ramo que deseas depositar sobre el altar"}
                </p>
              </div>

              {/* Contenedor con scroll propio e independiente (overscroll-contain) y fondo 100% sólido */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3 bg-[#0c1015] touch-pan-y">
                {FLORES_OPCIONES.map((flor) => (
                  <div
                    key={flor.id}
                    onClick={(e) => ofrecerFlorSeleccionada(flor, e)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        ofrecerFlorSeleccionada(flor);
                      }
                    }}
                    className="group relative flex items-center gap-3.5 sm:gap-4 p-3 sm:p-3.5 rounded-2xl bg-[#131821] hover:bg-[#1a212c] border border-white/10 hover:border-rose-400/60 transition-all duration-200 cursor-pointer text-left active:scale-[0.98] shadow-md hover:shadow-[0_0_25px_rgba(244,63,94,0.25)]"
                  >
                    {/* Previsualización de la flor con marco oscuro opaco */}
                    <div className="relative w-20 sm:w-24 h-24 sm:h-28 shrink-0 flex items-center justify-center rounded-xl bg-[#090c10] border border-white/10 p-1.5 overflow-hidden group-hover:border-rose-400/40">
                      <img
                        src={flor.img}
                        alt={flor.nombre}
                        className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)] group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>

                    {/* Descripción y significado */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-serif text-base sm:text-lg text-stone-100 group-hover:text-rose-200 transition-colors">
                          {flor.nombre}
                        </h4>
                        {flor.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-sans bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            {flor.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-300 font-light line-clamp-1">
                        {flor.subtitulo}
                      </p>
                      <p className="text-[11px] text-gold-soft/90 italic font-serif mt-1 flex items-center gap-1.5">
                        <span className="text-rose-400">✦</span>
                        <span className="line-clamp-2">«{flor.significado}»</span>
                      </p>
                    </div>

                    {/* Botón de ofrendar */}
                    <div className="shrink-0 hidden xs:flex items-center">
                      <span className="px-3.5 py-2 rounded-full text-xs font-sans font-medium uppercase tracking-wider bg-rose-950/80 group-hover:bg-rose-800 text-rose-200 border border-rose-500/40 group-hover:border-rose-400 shadow-sm transition-all">
                        Ofrecer
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer fijo del modal con safe-area para celulares */}
              <div className="shrink-0 px-5 py-3.5 bg-[#090c10] border-t border-white/10 pb-[max(1.2rem,env(safe-area-inset-bottom))] flex items-center justify-between text-[11px] text-stone-400">
                <span className="flex items-center gap-1.5">
                  <span className="text-gold">✦</span>
                  <span>Tu ofrenda quedará visible en el altar</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowFlorModal(false)}
                  className="text-stone-400 hover:text-stone-200 underline underline-offset-4 cursor-pointer py-1 px-2"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
