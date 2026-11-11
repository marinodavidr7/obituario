import Link from "@/components/Link";
import type { Persona } from "@/lib/db";
import { iniciales } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";

export default function PersonaCard({ p }: { p: Persona }) {
  return (
    <Link
      href={`/persona/${p.id}`}
      onClick={() => triggerHaptic("light")}
      className="arch-card flex flex-col items-center text-center px-3.5 py-6 sm:px-6 sm:pt-12 sm:pb-7 min-h-[250px] sm:min-h-[360px] active:scale-[0.97] transition-all"
    >
      <div className="portrait-ring relative z-10 w-20 h-20 sm:w-28 sm:h-28 md:w-[132px] md:h-[132px] shrink-0">
        {p.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.foto}
            alt={p.nombre}
            className="portrait-inner object-cover w-full h-full"
            style={{ objectPosition: p.foto_pos || "50% 20%" }}
            loading="lazy"
          />
        ) : (
          <div className="portrait-inner font-serif text-2xl sm:text-4xl text-gold/80">
            {iniciales(p.nombre)}
          </div>
        )}
      </div>

      <h3 className="relative z-10 font-serif text-base sm:text-xl text-stone-100 mt-3 sm:mt-5 leading-snug line-clamp-2 px-1">
        {p.nombre}
      </h3>

      {p.apodo && (
        <p className="relative z-10 text-[11px] sm:text-xs italic text-gold mt-0.5 sm:mt-1 truncate max-w-full px-1">
          «{p.apodo}»
        </p>
      )}

      <p className="relative z-10 text-[10px] sm:text-[11px] tracking-[0.15em] sm:tracking-[0.2em] text-stone-400 mt-1.5 sm:mt-2">
        {p.anios}
      </p>

      {p.epitafio && (
        <p className="relative z-10 text-[11px] sm:text-xs font-light italic text-stone-400 mt-2 line-clamp-1 sm:line-clamp-2 max-w-[210px] px-1">
          “{p.epitafio}”
        </p>
      )}

      <div className="relative z-10 mt-auto pt-3 sm:pt-4 flex items-center justify-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] text-stone-400">
        <span className="flex items-center gap-1">🕯️ {p.velas}</span>
        <span className="flex items-center gap-1">🌹 {p.flores}</span>
      </div>
    </Link>
  );
}
