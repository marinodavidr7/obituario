import { useEffect, useState } from "react";
import Link from "@/components/Link";
import Ornament from "@/components/Ornament";
import PanteonTabsView from "@/components/PanteonTabsView";
import { listFamilias, listPersonas, stats } from "@/lib/db";
import type { Familia, Persona, SanctuaryStats } from "@/types";

export default function Home() {
  const [familias, setFamilias] = useState<(Familia & { total: number; velas: number; flores: number; fotos: string[] })[]>([]);
  const [personas, setPersonas] = useState<(Persona & { apellido: string })[]>([]);
  const [s, setStats] = useState<SanctuaryStats>({ almas: 0, familias: 0, velas: 0, flores: 0, visitas: 0 });

  const loadData = () => {
    const fList = listFamilias();
    const st = stats();
    const mapFamilias = new Map(fList.map((f) => [f.id, f.apellido]));
    const pList = listPersonas().map((p) => ({
      ...p,
      apellido: mapFamilias.get(p.familia_id) || "",
    }));

    setFamilias(fList);
    setStats(st);
    setPersonas(pList);
  };

  useEffect(() => {
    loadData();
    window.addEventListener("panteon:db-updated", loadData);
    return () => window.removeEventListener("panteon:db-updated", loadData);
  }, []);

  return (
    <section className="fade-enter pb-10 sm:pb-8">
      <header className="text-center pt-6 sm:pt-16 pb-3 px-2">
        <p className="text-[10px] sm:text-[11px] tracking-[0.35em] sm:tracking-[0.42em] uppercase text-gold/85 mb-3 sm:mb-4">
          En memoria de quienes nos precedieron
        </p>
        <h1 className="font-serif font-light text-3xl sm:text-6xl md:text-7xl tracking-[0.12em] sm:tracking-[0.14em] text-[#f2efe9]">
          Obituario Familiar
        </h1>
        <Ornament />
        <p className="max-w-lg mx-auto text-xs sm:text-base font-light leading-relaxed text-stone-400 px-3">
          Un santuario sereno para volver a visitarlos. Elige un apellido, contempla sus memorias y mantén viva su historia.
        </p>

        {/* Resumen de devoción / Estadísticas rápidas: Full width en móvil, píldora compacta en desktop */}
        <div className="mt-5 sm:mt-7 w-full sm:w-auto sm:inline-flex items-center justify-center">
          <div className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-x-4 gap-y-2.5 sm:gap-7 px-3.5 sm:px-6 py-2.5 sm:py-2.5 rounded-2xl sm:rounded-full bg-stone-900/85 backdrop-blur-md border border-gold/25 text-[11px] sm:text-xs text-stone-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-4 h-4 flex items-center justify-center text-gold text-xs shrink-0 select-none">✦</span>
              <span className="leading-none"><b className="text-gold-soft font-semibold">{s.almas}</b> almas</span>
            </div>
            <span className="text-white/20 hidden sm:inline select-none">•</span>
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-4 h-4 flex items-center justify-center text-xs shrink-0 select-none">🕯️</span>
              <span className="leading-none"><b className="text-gold-soft font-semibold">{s.velas}</b> velas</span>
            </div>
            <span className="text-white/20 hidden sm:inline select-none">•</span>
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-4 h-4 flex items-center justify-center text-xs shrink-0 select-none">🌹</span>
              <span className="leading-none"><b className="text-rose-200 font-semibold">{s.flores}</b> ofrendas</span>
            </div>
            <span className="text-white/20 hidden sm:inline select-none">•</span>
            <div className="flex items-center justify-center gap-1.5 text-stone-400">
              <span className="w-4 h-4 flex items-center justify-center text-xs shrink-0 select-none">👁️</span>
              <span className="leading-none"><b className="text-stone-200 font-semibold">{s.visitas}</b> visitas</span>
            </div>
          </div>
        </div>

        {/* Botón de inscripción pública: Full width en móvil, botón compacto en desktop */}
        <div className="mt-4 flex items-center justify-center w-full sm:w-auto">
          <Link
            href="/inscribir"
            className="w-full sm:w-auto text-center inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 rounded-full bg-gold/15 hover:bg-gold/25 active:scale-95 border border-gold/50 text-gold-soft text-xs uppercase tracking-[0.18em] transition-all shadow-[0_0_20px_rgba(201,168,106,0.15)] font-medium"
          >
            <span>🕊️</span> Inscribir a un Ser Querido
          </Link>
        </div>
      </header>

      {/* Selector de modo de vista: Por Apellidos / Todas las Almas / Línea del Tiempo */}
      <PanteonTabsView familias={familias} todasLasPersonas={personas} />
    </section>
  );
}
