import { useEffect, useState } from "react";
import Link from "@/components/Link";
import Ornament from "@/components/Ornament";
import PersonaCard from "@/components/PersonaCard";
import { getFamilia, listPersonas } from "@/lib/db";
import type { Familia, Persona } from "@/types";

export default function FamiliaView({ id }: { id: string }) {
  const [familia, setFamilia] = useState<Familia | null>(() => getFamilia(id) || null);
  const [personas, setPersonas] = useState<Persona[]>(() => listPersonas(id));

  useEffect(() => {
    const f = getFamilia(id);
    setFamilia(f || null);
    if (f) {
      setPersonas(listPersonas(id));
    }
  }, [id]);

  if (!familia) {
    return (
      <div className="py-24 text-center">
        <p className="font-serif text-2xl text-stone-300 mb-4">Familia no encontrada en el santuario.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gold/40 text-gold-soft text-xs uppercase tracking-widest"
        >
          Volver al Santuario
        </Link>
      </div>
    );
  }

  const fam = familia;

  return (
    <section className="fade-enter pb-20">
      <div className="text-center pt-4 sm:pt-10 pb-4 sm:pb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[11px] sm:text-xs tracking-[0.18em] sm:tracking-[0.22em] uppercase text-stone-400 hover:text-gold-soft border border-white/10 hover:border-gold/40 bg-stone-900/60 hover:bg-gold/10 rounded-full px-4 sm:px-5 py-2 sm:py-2.5 active:scale-95 transition-all"
        >
          <span>←</span> Volver al obituario
        </Link>
        <h1 className="font-serif font-light text-3xl sm:text-5xl tracking-[0.12em] text-[#f2efe9] mt-5 sm:mt-7 mb-1.5 sm:mb-2">
          Familia {fam.apellido}
        </h1>
        {fam.lema && (
          <p className="text-xs sm:text-base font-light italic text-stone-400 px-3 max-w-lg mx-auto">
            «{fam.lema}»
          </p>
        )}
        <Ornament />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-8 pt-2">
        {personas.map((p) => (
          <PersonaCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}
