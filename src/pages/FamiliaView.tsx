import { useEffect, useState } from "react";
import Link from "@/components/Link";
import Ornament from "@/components/Ornament";
import PersonaCard from "@/components/PersonaCard";
import { getFamilia, listPersonas } from "@/lib/db";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Familia, Persona } from "@/types";

export default function FamiliaView({ id }: { id: string }) {
  // Resuelve inmediatamente la familia de forma síncrona para que el header nunca falle en el primer render
  const resolveFamilia = (famId: string): Familia => {
    let f = getFamilia(famId);
    if (!f) {
      const decoded = decodeURIComponent(famId || "");
      f = getFamilia(decoded);
    }
    if (f) return f;

    const pList = listPersonas(famId);
    const primer = pList[0];
    const apellido = primer ? primer.nombre.split(" ").slice(-1)[0] : famId;
    return {
      id: famId,
      apellido: apellido ? apellido.charAt(0).toUpperCase() + apellido.slice(1) : "Familia",
      lema: null,
      total: pList.length,
      velas: 0,
      flores: 0,
      fotos: [],
    };
  };

  const [familia, setFamilia] = useState<Familia>(() => resolveFamilia(id));
  const [personas, setPersonas] = useState<Persona[]>(() => {
    let pList = listPersonas(id);
    if (pList.length === 0) {
      pList = listPersonas(decodeURIComponent(id || ""));
    }
    return pList;
  });

  useEffect(() => {
    let isCancelled = false;

    const refrescar = async () => {
      let f = getFamilia(id);
      if (!f) {
        const decoded = decodeURIComponent(id || "");
        f = getFamilia(decoded);
      }

      if (!f && isSupabaseConfigured) {
        try {
          const { data } = await supabase.from("familias").select("*").eq("id", id).maybeSingle();
          if (data && !isCancelled) {
            f = data;
          }
        } catch (e) {
          console.warn("[FamiliaView] Error consultando familia:", e);
        }
      }

      if (isCancelled) return;
      setFamilia(f || resolveFamilia(id));

      let pList = listPersonas(id);
      if (pList.length === 0) {
        pList = listPersonas(decodeURIComponent(id || ""));
      }
      setPersonas(pList);
    };

    refrescar();
    window.addEventListener("panteon:db-updated", refrescar);
    return () => {
      isCancelled = true;
      window.removeEventListener("panteon:db-updated", refrescar);
    };
  }, [id]);

  const fam = familia;

  return (
    <section className="fade-enter pb-20 w-full flex flex-col items-center">
      {/* 2. Header: 'Volver al obituario' y 'Familia García' garantizado siempre centrado y montado desde el primer frame */}
      <div className="w-full text-center pt-3 sm:pt-8 pb-5 sm:pb-7 flex flex-col items-center justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 text-[11px] sm:text-xs tracking-[0.18em] sm:tracking-[0.22em] uppercase text-stone-400 hover:text-gold-soft border border-white/10 hover:border-gold/40 bg-stone-900/60 hover:bg-gold/10 rounded-full px-4 sm:px-5 py-2 sm:py-2.5 active:scale-95 transition-all shadow-sm"
        >
          <span>←</span> Volver al obituario
        </Link>
        <h1 className="font-serif font-light text-3xl sm:text-5xl tracking-[0.12em] text-[#f2efe9] mt-4 sm:mt-6 mb-1.5 sm:mb-2">
          Familia {fam.apellido}
        </h1>
        {fam.lema && (
          <p className="text-xs sm:text-base font-light italic text-stone-400 px-3 max-w-lg mx-auto">
            «{fam.lema}»
          </p>
        )}
        <div className="flex justify-center mt-2">
          <Ornament />
        </div>
      </div>

      {/* 1. Contenedor de Lápidas: Centrado absoluto con Flexbox y Grid (justify-content: center; align-items: center;) */}
      <div className="w-full flex justify-center items-center px-2 sm:px-4">
        {personas.length === 1 ? (
          // Cuando hay 1 solo familiar, centrado exacto tipo santuario memorial
          <div className="w-full max-w-[210px] xs:max-w-[230px] sm:max-w-[270px] flex justify-center items-center pt-1 sm:pt-2">
            <PersonaCard p={personas[0]} />
          </div>
        ) : (
          // Cuando hay varios familiares, cuadrícula centrada con justify-center
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 justify-center justify-items-center gap-3 sm:gap-8 pt-1 sm:pt-2 w-full max-w-7xl">
            {personas.map((p) => (
              <div key={p.id} className="w-full max-w-[230px] sm:max-w-[270px] flex justify-center">
                <PersonaCard p={p} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
