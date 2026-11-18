/**
 * Biografía estilo «hoja del santuario» — hereda el tema activo del alma
 * (variables --theme-* definidas por [data-theme="..."] en index.css):
 *  - Fondo de la hoja = superficie del tema (--theme-stone-850 → mezcla con --theme-bg)
 *  - Acentos (inicial capitular, filetes, adornos) = --theme-gold del tema
 *  - Texto = --theme-text; énfasis en --theme-gold-soft / blanco
 *  - Colapsada por defecto: sólo el primer párrafo; botón centrado
 *    «Leer su historia completa ↓» / «Leer menos ↑» (animación 300 ms).
 *    Si la biografía es corta (< 400 caracteres o un párrafo) no aparece botón.
 */
import { useId, useRef, useState, type CSSProperties, type ReactNode } from "react";

function renderInline(texto: string): ReactNode {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return partes.map((seg, i) =>
    seg.startsWith("**") && seg.endsWith("**") ? (
      <strong key={i} className="font-bold text-[color:var(--theme-gold-soft)]">
        {seg.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{seg}</span>
    )
  );
}

const FUENTE_BIO = '"Times New Roman", Times, Georgia, serif';

const paperStyle: CSSProperties = {
  background:
    "linear-gradient(160deg, var(--theme-stone-850, #12161c) 0%, var(--theme-stone-900, #0b0e12) 78%)",
  boxShadow:
    "inset 0 0 0 1px var(--theme-border, rgba(201,168,106,0.24)), inset 0 0 0 5px var(--theme-stone-850, #12161c), inset 0 0 0 6px color-mix(in srgb, var(--theme-gold, #c9a86a) 45%, transparent), 0 24px 50px -18px rgba(0,0,0,0.75)",
};

const UMBRAL_COLAPSO = 400;

export default function BiografiaLiteraria({ bio }: { bio: string }) {
  const [abierto, setAbierto] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const textoId = useId();

  const parrafos = bio
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (parrafos.length === 0) return null;

  const totalChars = parrafos.join(" ").length;
  const colapsable = parrafos.length > 1 && totalChars >= UMBRAL_COLAPSO;

  const alternar = () => {
    setAbierto((prev) => {
      const next = !prev;
      if (!next && cardRef.current) {
        cardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return next;
    });
  };

  const primero = parrafos[0];
  const resto = parrafos.slice(1);

  const parrafoTitulo = (p: string, conInicial: boolean, key: string | number) => {
    if (!conInicial) {
      return (
        <p key={key} className="break-words text-[color:var(--theme-text,#e8e5df)]">
          {renderInline(p)}
        </p>
      );
    }
    const primera = p.charAt(0);
    const restoTexto = p.slice(1);
    return (
      <p key={key} className="break-words text-[color:var(--theme-text,#e8e5df)]">
        <span
          aria-hidden="true"
          className="float-left select-none leading-[0.75] pt-[0.12em] pr-[0.14em] pl-[0.02em] text-[3.6em] font-medium text-[color:var(--theme-gold,#c9a86a)]"
          style={{ fontFamily: FUENTE_BIO, textShadow: "0 0 24px color-mix(in srgb, var(--theme-gold, #c9a86a) 35%, transparent)" }}
        >
          {primera}
        </span>
        {renderInline(restoTexto)}
      </p>
    );
  };

  return (
    <div className="mt-3 sm:mt-4 px-1">
      <figure
        ref={cardRef}
        lang="es"
        className="relative rounded-[4px] px-5 py-6 sm:px-9 sm:py-8 text-[color:var(--theme-text,#e8e5df)]"
        style={paperStyle}
      >
        {/* Remate superior ornamental */}
        <div
          aria-hidden
          className="flex items-center justify-center gap-3 mb-5 select-none text-[color:var(--theme-gold,#c9a86a)]"
        >
          <span className="block h-px w-16 sm:w-24 bg-[color:var(--theme-gold,#c9a86a)] opacity-50" />
          <span className="text-[15px] leading-none">❦</span>
          <span className="block h-px w-16 sm:w-24 bg-[color:var(--theme-gold,#c9a86a)] opacity-50" />
        </div>

        <div
          id={textoId}
          className="space-y-4 text-[16px] sm:text-[18px] leading-[1.72] sm:leading-[1.78] [text-align:justify] [text-justify:inter-word]"
          style={{ hyphens: "auto", fontFamily: FUENTE_BIO }}
        >
          {/* Primer párrafo (siempre visible) con degradado al tema cuando está colapsado */}
          <div className="relative">
            {parrafoTitulo(primero, true, "primero")}
            {colapsable && !abierto && (
              <div
                aria-hidden
                className="absolute inset-x-0 -bottom-1 h-16 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to bottom, color-mix(in srgb, var(--theme-stone-850,#12161c) 0%, transparent) 0%, color-mix(in srgb, var(--theme-stone-850,#12161c) 82%, transparent) 75%, var(--theme-stone-850,#12161c) 100%)",
                }}
              />
            )}
          </div>

          {/* Resto de la biografía: animado con grid-template-rows + opacidad (300 ms) */}
          {colapsable ? (
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                abierto ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden min-h-0 space-y-4">
                {resto.map((p, i) => parrafoTitulo(p, false, i))}
              </div>
            </div>
          ) : (
            resto.map((p, i) => parrafoTitulo(p, false, i))
          )}
        </div>

        {colapsable && (
          <div className="flex justify-center mt-5">
            <button
              type="button"
              onClick={alternar}
              aria-expanded={abierto}
              aria-controls={textoId}
              className="group inline-flex items-center gap-1.5 bg-transparent border-0 px-3 py-2 cursor-pointer select-none
                text-[12px] font-semibold tracking-[0.16em] uppercase text-[color:var(--theme-gold,#c9a86a)]
                transition-colors duration-200 hover:text-[color:var(--theme-gold-soft,#e8d5a9)]
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--theme-gold,#c9a86a)]"
            >
              <span>{abierto ? "Leer menos" : "Leer su historia completa"}</span>
              <span
                aria-hidden
                className={`inline-block transition-transform duration-200 ${
                  abierto ? "group-hover:-translate-y-[2px]" : "group-hover:translate-y-[2px]"
                }`}
              >
                {abierto ? "↑" : "↓"}
              </span>
            </button>
          </div>
        )}

        {/* Remate inferior ornamental */}
        <div
          aria-hidden
          className="flex items-center justify-center gap-3 mt-5 select-none text-[color:var(--theme-gold,#c9a86a)]"
        >
          <span className="block h-px w-16 sm:w-24 bg-[color:var(--theme-gold,#c9a86a)] opacity-50" />
          <span className="text-[12px] tracking-[0.35em] uppercase">Fin</span>
          <span className="block h-px w-16 sm:w-24 bg-[color:var(--theme-gold,#c9a86a)] opacity-50" />
        </div>
      </figure>
    </div>
  );
}
