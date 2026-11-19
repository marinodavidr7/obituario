import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "@/components/Link";
import { normalizarUrlImagen } from "@/lib/imageUrl";

import { iniciales } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";
import { listFamilias, listPersonas } from "@/lib/db";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { Skeleton } from "@/components/Skeleton";

const MAX_PERSONAS = 12;
const MAX_FAMILIAS = 6;

/** Minúsculas y sin acentos: "José" y "jose" encuentran lo mismo. */
function normalizarTexto(valor: string): string {
  return (valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

type ResultadoPersona = {
  id: string;
  nombre: string;
  apodo: string | null;
  anios: string;
  foto: string | null;
  foto_pos?: string | null;
  familia_id: string;
  epitafio: string | null;
};

type ResultadoFamilia = {
  id: string;
  apellido: string;
  lema: string | null;
  total: number;
};

export default function Buscador() {
  const [query, setQuery] = useState("");
  const queryDebounced = useDebouncedValue(query, 220);
  const [abiertoDesktop, setAbiertoDesktop] = useState(false);
  const [modalMovilAbierto, setModalMovilAbierto] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [personas, setPersonas] = useState<ResultadoPersona[]>([]);
  const [familias, setFamilias] = useState<ResultadoFamilia[]>([]);
  const [totalPersonas, setTotalPersonas] = useState(0);
  const [totalFamilias, setTotalFamilias] = useState(0);

  const contenedorDesktopRef = useRef<HTMLDivElement>(null);
  const inputMovilRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escuchar evento personalizado emitido por MobileBottomNav o botones rápidos
  useEffect(() => {
    function handleOpenSearch() {
      setModalMovilAbierto(true);
      setTimeout(() => {
        inputMovilRef.current?.focus();
      }, 120);
    }
    window.addEventListener("open-panteon-search", handleOpenSearch);
    return () => window.removeEventListener("open-panteon-search", handleOpenSearch);
  }, []);

  // Bloquear scroll de fondo cuando el modal móvil está abierto
  useEffect(() => {
    if (modalMovilAbierto) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }
    return () => {
      document.body.classList.remove("no-scroll");
    };
  }, [modalMovilAbierto]);

  // Limpiar resultados al vaciar el campo sin esperar al debounce.
  useEffect(() => {
    if (!query.trim()) {
      setPersonas([]);
      setFamilias([]);
      setTotalPersonas(0);
      setTotalFamilias(0);
      setAbiertoDesktop(false);
    }
  }, [query]);

  // Búsqueda diferida (220 ms) para no recorrer el obituario en cada tecla.
  useEffect(() => {
    const q = normalizarTexto(queryDebounced.trim());
    if (!q) return;

    try {
      const allP = listPersonas();
      const allF = listFamilias();

      const matchP = allP.filter((p) => {
        const nombre = normalizarTexto(p.nombre);
        const apodo = normalizarTexto(p.apodo || "");
        const epitafio = normalizarTexto(p.epitafio || "");
        return nombre.includes(q) || apodo.includes(q) || epitafio.includes(q);
      });

      const matchF = allF.filter((f) => {
        const apellido = normalizarTexto(f.apellido);
        const lema = normalizarTexto(f.lema || "");
        return apellido.includes(q) || lema.includes(q);
      });

      setPersonas(matchP.slice(0, MAX_PERSONAS));
      setFamilias(matchF.slice(0, MAX_FAMILIAS));
      setTotalPersonas(matchP.length);
      setTotalFamilias(matchF.length);
      setAbiertoDesktop(true);
    } catch {
      setPersonas([]);
      setFamilias([]);
      setTotalPersonas(0);
      setTotalFamilias(0);
    }
  }, [queryDebounced]);

  // Cerrar dropdown desktop al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contenedorDesktopRef.current && !contenedorDesktopRef.current.contains(event.target as Node)) {
        setAbiertoDesktop(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mientras el usuario escribe y el debounce aún no dispara, mostramos el aviso.
  const buscando = query.trim() !== "" && query !== queryDebounced;

  const cerrarModalMovil = () => {
    triggerHaptic("light");
    setModalMovilAbierto(false);
    setQuery("");
  };

  const seleccionarResultado = () => {
    triggerHaptic("selection");
    setModalMovilAbierto(false);
    setAbiertoDesktop(false);
  };

  return (
    <>
      {/* Botón rápido de búsqueda en móvil (fino y minimalista) */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic("light");
          setModalMovilAbierto(true);
          setTimeout(() => inputMovilRef.current?.focus(), 120);
        }}
        aria-label="Buscar en el obituario"
        className="sm:hidden w-8 h-8 rounded-full bg-stone-900/90 border border-gold/30 hover:border-gold/60 text-gold-soft hover:text-gold flex items-center justify-center active:scale-95 transition-all shrink-0 shadow-sm my-auto focus:outline-none"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M16.65 10.85a5.8 5.8 0 11-11.6 0 5.8 5.8 0 0111.6 0z" />
        </svg>
      </button>

      {/* Buscador de escritorio */}
      <div ref={contenedorDesktopRef} className="hidden sm:block relative w-64 md:w-80">
        <div className="relative flex items-center">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim()) setAbiertoDesktop(true);
            }}
            placeholder="Buscar ser querido, oficio, lugar..."
            aria-label="Buscar ser querido"
            className="w-full bg-stone-900/90 border border-white/10 focus:border-gold/60 focus:bg-stone-900 rounded-full py-2 pl-9 pr-8 text-xs text-stone-200 placeholder-stone-500 focus:outline-none transition-all shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
          />
          <svg
            className="w-3.5 h-3.5 text-gold/60 absolute left-3 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M16.65 10.85a5.8 5.8 0 11-11.6 0 5.8 5.8 0 0111.6 0z" />
          </svg>

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setAbiertoDesktop(false);
              }}
              className="absolute right-2.5 text-stone-500 hover:text-stone-300 text-xs px-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Dropdown flotante en escritorio */}
        {abiertoDesktop && (
          <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-[#0d1015]/95 backdrop-blur-xl border border-gold/30 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(201,168,106,0.1)] overflow-hidden max-h-[75vh] overflow-y-auto animate-in fade-in duration-200">
            {buscando && (
              <div className="p-3 space-y-2.5" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-1">
                    <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-2.5 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!buscando && personas.length === 0 && familias.length === 0 && (
              <div className="p-5 text-center text-xs text-stone-400 font-serif italic">
                No se encontraron registros para &ldquo;{query}&rdquo;
              </div>
            )}

            {/* Familias */}
            {!buscando && familias.length > 0 && (
              <div className="p-2 border-b border-white/5">
                <span className="text-[10px] uppercase tracking-[0.22em] text-gold/80 px-3 py-1 block">
                  Familias
                </span>
                {familias.map((f) => (
                  <Link
                    key={f.id}
                    href={`/familia/${f.id}`}
                    onClick={seleccionarResultado}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gold/10 transition-colors group"
                  >
                    <div>
                      <span className="font-serif text-sm text-stone-200 group-hover:text-gold-soft block">
                        Familia {f.apellido}
                      </span>
                      {f.lema && (
                        <span className="text-[11px] text-stone-500 italic block line-clamp-1">
                          {f.lema}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-stone-400">
                      {f.total} almas
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Personas */}
            {!buscando && personas.length > 0 && (
              <div className="p-2">
                <span className="text-[10px] uppercase tracking-[0.22em] text-gold/80 px-3 py-1 block">
                  Seres Queridos
                </span>
                {personas.map((p) => (
                  <Link
                    key={p.id}
                    href={`/persona/${p.id}`}
                    onClick={seleccionarResultado}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gold/10 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-full border border-gold/40 bg-stone-950 overflow-hidden flex items-center justify-center shrink-0">
                      {p.foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={normalizarUrlImagen(p.foto, 96)}
                          alt=""
                          style={{ objectPosition: p.foto_pos || "50% 20%" }}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0"
                        />
                      ) : (
                        <span className="font-serif text-xs text-gold/90">{iniciales(p.nombre)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-stone-200 group-hover:text-gold-soft block truncate">
                        {p.nombre}
                      </span>
                      <span className="text-[11px] text-stone-400 block tracking-wide">
                        {p.anios} {p.apodo ? `· «${p.apodo}»` : ""}
                      </span>
                      {p.epitafio && (
                        <span className="text-[10px] text-stone-500 italic block line-clamp-1 mt-0.5">
                          &ldquo;{p.epitafio}&rdquo;
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {!buscando && (totalPersonas > personas.length || totalFamilias > familias.length) && (
              <p className="px-3 py-2 text-[11px] text-stone-500 border-t border-white/5">
                Hay más coincidencias. Escribe un poco más para afinarlas.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal / Sheet Nativo de Búsqueda para Móviles (teletransportado al body para escapar de navbar backdrop-blur) */}
      {mounted && modalMovilAbierto && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="sm:hidden fixed inset-0 z-[100] bg-[#07090d]/95 backdrop-blur-2xl flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] animate-in fade-in duration-200"
        >
          {/* Cabecera del buscador móvil */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
            <div className="relative flex-1 flex items-center">
              <svg
                className="w-4 h-4 text-gold absolute left-3.5 pointer-events-none"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="6" />
                <path strokeLinecap="round" d="m15.5 15.5 4.5 4.5" />
              </svg>
              <input
                ref={inputMovilRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar nombre, apellido, oficio..."
                className="w-full bg-stone-900 border border-gold/30 focus:border-gold rounded-full py-2.5 pl-10 pr-9 text-base text-stone-100 placeholder-stone-500 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 text-stone-400 hover:text-stone-200 text-sm p-1"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={cerrarModalMovil}
              className="text-sm font-medium text-gold hover:text-gold-soft px-1.5 py-2 active:opacity-70"
            >
              Cancelar
            </button>
          </div>

          {/* Contenido / Resultados en móvil */}
          <div className="flex-1 overflow-y-auto px-4 py-3 divide-y divide-white/5 overscroll-contain">
            {buscando && (
              <div className="py-3 space-y-3" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3.5 p-3">
                    <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!buscando && query && personas.length === 0 && familias.length === 0 && (
              <div className="py-16 text-center">
                <span className="text-2xl text-gold/60 block mb-2">✦</span>
                <p className="font-serif italic text-stone-400 text-base">
                  No se hallaron registros para &ldquo;{query}&rdquo;
                </p>
                <p className="text-xs text-stone-500 mt-1">Prueba buscando por nombre de pila o apellido</p>
              </div>
            )}

            {!query && (
              <div className="py-12 text-center text-stone-400">
                <span className="text-3xl text-gold/70 block mb-2">🕯️</span>
                <p className="font-serif text-stone-300 text-lg">Encuentra a tus seres queridos</p>
                <p className="text-xs text-stone-500 mt-1">
                  Escribe un apellido, nombre, profesión o lugar
                </p>
              </div>
            )}

            {/* Resultados de Familias en Móvil */}
            {!buscando && familias.length > 0 && (
              <div className="py-2">
                <span className="text-[10px] uppercase tracking-[0.22em] text-gold/80 px-2 py-1 block">
                  Familias
                </span>
                {familias.map((f) => (
                  <Link
                    key={f.id}
                    href={`/familia/${f.id}`}
                    onClick={seleccionarResultado}
                    className="flex items-center justify-between p-3 rounded-xl active:bg-gold/15 transition-colors"
                  >
                    <div>
                      <span className="font-serif text-base text-stone-100 block">
                        Familia {f.apellido}
                      </span>
                      {f.lema && (
                        <span className="text-xs text-stone-400 italic block line-clamp-1">
                          «{f.lema}»
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gold/90 font-medium">
                      {f.total} {f.total === 1 ? "alma" : "almas"} →
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Resultados de Personas en Móvil */}
            {!buscando && personas.length > 0 && (
              <div className="py-2">
                <span className="text-[10px] uppercase tracking-[0.22em] text-gold/80 px-2 py-1 block">
                  Seres Queridos
                </span>
                {personas.map((p) => (
                  <Link
                    key={p.id}
                    href={`/persona/${p.id}`}
                    onClick={seleccionarResultado}
                    className="flex items-center gap-3.5 p-3 rounded-xl active:bg-gold/15 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full border border-gold/40 bg-stone-950 overflow-hidden flex items-center justify-center shrink-0">
                      {p.foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={normalizarUrlImagen(p.foto, 128)}
                          alt=""
                          style={{ objectPosition: p.foto_pos || "50% 20%" }}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover grayscale-[20%]"
                        />
                      ) : (
                        <span className="font-serif text-base text-gold/90">{iniciales(p.nombre)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-base font-medium text-stone-100 block truncate">
                        {p.nombre}
                      </span>
                      <span className="text-xs text-stone-400 block">
                        {p.anios} {p.apodo ? `· «${p.apodo}»` : ""}
                      </span>
                      {p.epitafio && (
                        <span className="text-xs text-gold-soft/80 italic block line-clamp-1 mt-0.5">
                          “{p.epitafio}”
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {!buscando && (totalPersonas > personas.length || totalFamilias > familias.length) && (
              <p className="px-2 py-3 text-xs text-stone-500">
                Hay más coincidencias. Escribe un poco más para afinarlas.
              </p>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
