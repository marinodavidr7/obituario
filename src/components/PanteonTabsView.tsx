import { useState, useMemo, useEffect, useRef } from "react";
import Link from "@/components/Link";
import PersonaCard from "@/components/PersonaCard";
import type { Persona, Familia } from "@/lib/db";
import { triggerHaptic } from "@/lib/haptics";

const LLAMA_SVG = (
  <svg className="llama w-5 h-7 drop-shadow-[0_0_12px_rgba(255,160,50,0.7)]" viewBox="0 0 24 32" aria-hidden="true">
    <path d="M12 1c2.6 5.7 8 8.7 8 15.6C20 25 16.4 29 12 29S4 25 4 16.6C4 8.7 9.4 6.7 12 1z" fill="#ff8a1f" />
    <path d="M12 10c1.2 2.8 3.8 4.3 3.8 7.6 0 3-1.7 5.2-3.8 5.2s-3.8-2.2-3.8-5.2C8.2 14.3 10.8 12.8 12 10z" fill="#ffe08a" />
  </svg>
);

function extraerAnio(str: string): number {
  const m = (str || "").match(/\d{4}/);
  return m ? parseInt(m[0], 10) : 9999;
}

export default function PanteonTabsView({
  familias,
  todasLasPersonas,
}: {
  familias: (Familia & { total: number; velas: number; flores: number; fotos: string[] })[];
  todasLasPersonas: (Persona & { apellido: string })[];
}) {
  const [tab, setTab] = useState<"apellidos" | "todos" | "cronologia">("apellidos");
  const [criterioOrden, setCriterioOrden] = useState<"antiguos" | "recientes" | "alfabetico" | "velas">("antiguos");
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Escuchar el evento de cambio rápido de pestaña desde la barra inferior móvil y hash #almas
  useEffect(() => {
    function onSwitchTodos() {
      setTab("todos");
      tabsContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.addEventListener("switch-tab-todos", onSwitchTodos);

    if (typeof window !== "undefined" && window.location.hash === "#almas") {
      setTab("todos");
    }

    return () => window.removeEventListener("switch-tab-todos", onSwitchTodos);
  }, []);

  const cambiarTab = (nuevaTab: "apellidos" | "todos" | "cronologia") => {
    triggerHaptic("selection");
    setTab(nuevaTab);
  };

  // Ordenar lista de todas las personas
  const personasOrdenadas = useMemo(() => {
    const list = [...todasLasPersonas];
    if (criterioOrden === "antiguos") {
      list.sort((a, b) => extraerAnio(a.anios) - extraerAnio(b.anios));
    } else if (criterioOrden === "recientes") {
      list.sort((a, b) => extraerAnio(b.anios) - extraerAnio(a.anios));
    } else if (criterioOrden === "alfabetico") {
      list.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    } else if (criterioOrden === "velas") {
      list.sort((a, b) => b.velas - a.velas);
    }
    return list;
  }, [todasLasPersonas, criterioOrden]);

  // Cronología por orden cronológico de nacimiento
  const cronologia = useMemo(() => {
    return [...todasLasPersonas].sort((a, b) => extraerAnio(a.anios) - extraerAnio(b.anios));
  }, [todasLasPersonas]);

  return (
    <div ref={tabsContainerRef} id="almas" className="scroll-mt-20">
      {/* 1. VERSIÓN PARA TELÉFONO (Móvil): Grid fluido de 3 columnas para que nunca se recorte el texto ni aparezca barra de scroll */}
      <div className="sm:hidden mt-6 px-2">
        <nav
          aria-label="Vistas del obituario en móvil"
          className="w-full max-w-xl mx-auto grid grid-cols-3 border-b border-white/10"
        >
          <button
            type="button"
            onClick={() => cambiarTab("apellidos")}
            className={`relative py-3 px-1 text-center font-serif text-[11px] min-[380px]:text-xs tracking-[0.05em] uppercase transition-all active:scale-95 ${
              tab === "apellidos"
                ? "text-gold font-medium"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <span className="hidden min-[380px]:inline">Por </span>Apellidos
            {tab === "apellidos" && (
              <span className="absolute -bottom-px left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_8px_rgba(201,168,106,0.9)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => cambiarTab("todos")}
            className={`relative py-3 px-1 text-center font-serif text-[11px] min-[380px]:text-xs tracking-[0.05em] uppercase transition-all active:scale-95 ${
              tab === "todos"
                ? "text-gold font-medium"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <span className="hidden min-[380px]:inline">Todas las </span>Almas
            {tab === "todos" && (
              <span className="absolute -bottom-px left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_8px_rgba(201,168,106,0.9)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => cambiarTab("cronologia")}
            className={`relative py-3 px-1 text-center font-serif text-[11px] min-[380px]:text-xs tracking-[0.05em] uppercase transition-all active:scale-95 ${
              tab === "cronologia"
                ? "text-gold font-medium"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <span>Cronología</span>
            {tab === "cronologia" && (
              <span className="absolute -bottom-px left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_8px_rgba(201,168,106,0.9)]" />
            )}
          </button>
        </nav>
      </div>

      {/* 2. VERSIÓN PARA COMPUTADORA (Escritorio): El diseño original solemne de cápsula / píldora segmentada flotante */}
      <div className="hidden sm:flex mt-8 items-center justify-center px-1">
        <div className="inline-flex p-1 rounded-full bg-stone-900/90 border border-white/10 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <button
            type="button"
            onClick={() => cambiarTab("apellidos")}
            className={`px-6 py-2 rounded-full text-xs uppercase tracking-[0.2em] font-medium transition-all ${
              tab === "apellidos"
                ? "bg-gradient-to-r from-gold/30 via-gold/20 to-gold/30 border border-gold/60 text-gold-soft shadow-[0_0_15px_rgba(201,168,106,0.2)]"
                : "text-stone-400 hover:text-stone-200 border border-transparent"
            }`}
          >
            Por Apellidos
          </button>

          <button
            type="button"
            onClick={() => cambiarTab("todos")}
            className={`px-6 py-2 rounded-full text-xs uppercase tracking-[0.2em] font-medium transition-all ${
              tab === "todos"
                ? "bg-gradient-to-r from-gold/30 via-gold/20 to-gold/30 border border-gold/60 text-gold-soft shadow-[0_0_15px_rgba(201,168,106,0.2)]"
                : "text-stone-400 hover:text-stone-200 border border-transparent"
            }`}
          >
            Todas las Almas
          </button>

          <button
            type="button"
            onClick={() => cambiarTab("cronologia")}
            className={`px-6 py-2 rounded-full text-xs uppercase tracking-[0.2em] font-medium transition-all ${
              tab === "cronologia"
                ? "bg-gradient-to-r from-gold/30 via-gold/20 to-gold/30 border border-gold/60 text-gold-soft shadow-[0_0_15px_rgba(201,168,106,0.2)]"
                : "text-stone-400 hover:text-stone-200 border border-transparent"
            }`}
          >
            Cronología
          </button>
        </div>
      </div>

      {/* 1. Vista: Por Apellidos / Mausoleos (2 columnas fluidas en móviles igual que Todas las Almas) */}
      {tab === "apellidos" && (
        <div className="pt-6 sm:pt-8 w-full mx-auto animate-in fade-in duration-300">
          <div className="flex items-center justify-between gap-3 mb-5 pb-3 border-b border-white/10">
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-gold font-medium">
              {familias.length} familias y mausoleos
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-3 sm:gap-7">
            {familias.map((f) => (
              <Link
                key={f.id}
                href={`/familia/${f.id}`}
                onClick={() => triggerHaptic("light")}
                className={`arch-card group flex flex-col items-center text-center px-3.5 py-6 sm:px-7 sm:pt-12 sm:pb-7 min-h-[250px] sm:min-h-[410px] cursor-pointer active:scale-[0.97] transition-all ${
                  familias.length === 1 ? "col-span-2 sm:col-span-1 max-w-sm mx-auto w-full" : ""
                }`}
              >
                <div className="relative z-10 w-11 h-11 sm:w-16 sm:h-16 rounded-full bg-stone-950/70 border border-gold/30 flex items-center justify-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.8),0_0_20px_rgba(255,160,50,0.18)] group-hover:border-gold/60 group-hover:shadow-[0_0_25px_rgba(255,160,50,0.35)] transition-all duration-500 shrink-0">
                  {LLAMA_SVG}
                </div>

                <h2 className="relative z-10 font-serif text-lg sm:text-3xl text-[#f5f2eb] mt-3 sm:mt-5 tracking-wide group-hover:text-gold-soft transition-colors duration-300 line-clamp-1 sm:line-clamp-none px-1">
                  {f.apellido}
                </h2>

                <div className="relative z-10 w-8 sm:w-12 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent my-2 sm:my-3.5" />

                <p className="relative z-10 text-[11px] sm:text-xs font-light italic leading-relaxed text-stone-300/80 px-1 line-clamp-2">
                  «{f.lema || "En memoria eterna en el corazón familiar"}»
                </p>

                {f.fotos && f.fotos.length > 0 && (
                  <div className="relative z-10 flex items-center justify-center -space-x-1.5 sm:-space-x-2 mt-3 sm:mt-5">
                    {f.fotos.map((src, idx) => (
                      <div
                        key={idx}
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-stone-900 overflow-hidden bg-stone-950 shadow-md"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition duration-300" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="relative z-10 mt-auto pt-3 sm:pt-5 w-full border-t border-gold/15 flex items-center justify-between text-[10px] sm:text-[11px] text-stone-400">
                  <span className="uppercase tracking-[0.16em] sm:tracking-[0.2em] text-gold/90 font-medium text-[9px] sm:text-[10px]">
                    {f.total} {f.total === 1 ? "alma" : "almas"}
                  </span>
                  <div className="flex items-center gap-1.5 sm:gap-2.5 text-[10px] sm:text-[11px]">
                    {f.velas > 0 && (
                      <span title={`${f.velas} velas encendidas`} className="flex items-center gap-0.5 sm:gap-1 text-gold-soft/90">
                        🕯️ {f.velas}
                      </span>
                    )}
                    {f.flores > 0 && (
                      <span title={`${f.flores} ofrendas florales`} className="flex items-center gap-0.5 sm:gap-1 text-rose-200/90">
                        🌹 {f.flores}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {familias.length === 0 && (
            <div className="text-center py-10 px-4 rounded-2xl border border-white/5 bg-stone-900/30 my-4">
              <span className="text-3xl block mb-2">🏛️</span>
              <p className="text-sm font-serif text-stone-200">Aún no hay mausoleos registrados</p>
              <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                Sé el primero en inscribir a tu familia y ser querido en el santuario.
              </p>
              <div className="mt-4">
                <Link
                  href="/inscribir"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gold/15 hover:bg-gold/25 border border-gold/40 text-gold-soft text-xs transition-colors"
                >
                  <span>🕊️</span> Inscribir ser querido
                </Link>
              </div>
            </div>
          )}

          {/* Complemento: Lista de Difuntos / Almas del Panteón para completar la vista y eliminar vacíos */}
          {todasLasPersonas.length > 0 && (
            <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-white/10 animate-in fade-in duration-300">
              <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
                <div>
                  <h3 className="font-serif text-base sm:text-xl text-[#f2efe9] flex items-center gap-2">
                    <span className="text-gold">✦</span>
                    <span>Almas en Memoria Perpetua</span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5">
                    {todasLasPersonas.length} {todasLasPersonas.length === 1 ? "ser querido descansando en este santuario" : "seres queridos descansando en este santuario"}
                  </p>
                </div>

                {todasLasPersonas.length > 4 && (
                  <button
                    type="button"
                    onClick={() => cambiarTab("todos")}
                    className="text-xs text-gold-soft hover:text-gold hover:underline flex items-center gap-1 font-medium shrink-0 active:scale-95 transition-transform"
                  >
                    <span>Ver todas</span>
                    <span>→</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-7">
                {todasLasPersonas.map((p) => (
                  <PersonaCard key={p.id} p={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Vista: Todas las Almas (2 columnas en móviles tipo cuadrícula nativa) */}
      {tab === "todos" && (
        <div className="pt-6 sm:pt-8 w-full mx-auto animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-white/10">
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-gold font-medium">
              {personasOrdenadas.length} almas inscritas en el obituario
            </p>
            <div className="flex items-center gap-2 text-xs text-stone-400 self-end sm:self-auto">
              <span className="text-[11px]">Ordenar:</span>
              <select
                value={criterioOrden}
                onChange={(e) => {
                  triggerHaptic("selection");
                  setCriterioOrden(e.target.value as any);
                }}
                className="bg-stone-900 border border-white/15 rounded-full px-3 py-1 text-xs text-stone-200 focus:outline-none focus:border-gold"
              >
                <option value="antiguos">Año (Antiguos primero)</option>
                <option value="recientes">Año (Recientes primero)</option>
                <option value="alfabetico">Alfabético</option>
                <option value="velas">Más velas</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-7">
            {personasOrdenadas.map((p) => (
              <PersonaCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      )}

      {/* 3. Vista: Línea del Tiempo */}
      {tab === "cronologia" && (
        <div className="pt-6 sm:pt-8 max-w-3xl mx-auto animate-in fade-in duration-300">
          <div className="text-center mb-7 sm:mb-10">
            <h3 className="font-serif text-2xl sm:text-3xl text-stone-100">Crónica de Generaciones</h3>
            <p className="text-xs text-stone-400 mt-1">Ordenados desde los primeros ancestros por año de nacimiento</p>
          </div>

          <div className="relative border-l border-gold/30 ml-3 sm:ml-8 pl-5 sm:pl-8 space-y-5 sm:space-y-8">
            {cronologia.map((p) => {
              const anio = extraerAnio(p.anios);
              return (
                <div key={p.id} className="relative group">
                  <span className="absolute -left-[27px] sm:-left-[39px] top-2 sm:top-1.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-stone-950 border-2 border-gold group-hover:scale-125 transition-transform" />
                  <Link
                    href={`/persona/${p.id}`}
                    onClick={() => triggerHaptic("light")}
                    className="block bg-stone-900/75 hover:bg-stone-900 border border-white/10 hover:border-gold/40 rounded-xl p-3.5 sm:p-5 transition-colors group cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
                      <span className="text-[11px] sm:text-xs tracking-[0.16em] uppercase text-gold font-medium">
                        {anio !== 9999 ? anio : ""} · Familia {p.apellido}
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-stone-400">{p.anios}</span>
                    </div>
                    <h4 className="font-serif text-lg sm:text-xl text-stone-100 group-hover:text-gold-soft mt-1 transition-colors leading-snug">
                      {p.nombre} {p.apodo ? <span className="text-sm italic text-gold/80">«{p.apodo}»</span> : ""}
                    </h4>
                    {p.epitafio && (
                      <p className="text-xs italic text-stone-400 mt-1 line-clamp-2">“{p.epitafio}”</p>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
