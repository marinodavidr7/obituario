import { useState } from "react";
import Link from "@/components/Link";
import NuevaForm from "@/components/NuevaForm";
import Ornament from "@/components/Ornament";
import { listFamilias } from "@/lib/db";
import { solicitarInscripcion } from "@/lib/actions";

export default function Inscribir() {
  const familias = listFamilias().map((f) => ({ id: f.id, apellido: f.apellido }));
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async (fd: FormData) => {
    try {
      setError(undefined);
      await solicitarInscripcion(fd);
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al enviar la solicitud.");
    }
  };

  return (
    <section className="fade-enter pt-3 sm:pt-8 pb-12 w-full max-w-[1720px] 2xl:max-w-[1920px] mx-auto px-1 sm:px-4">
      <div className="text-center pb-6 mb-6 border-b border-white/10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[11px] sm:text-xs tracking-[0.2em] uppercase text-stone-400 hover:text-gold-soft border border-white/10 hover:border-gold/40 bg-stone-900/60 rounded-full px-4 py-2 active:scale-95 transition-all mb-4"
        >
          <span>←</span> Volver al Obituario
        </Link>
        <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.35em] text-gold block mb-1">
          Homenaje y Memoria Eterna
        </span>
        <h1 className="font-serif font-light text-3xl sm:text-5xl tracking-[0.08em] text-[#f2efe9]">
          Inscribir a un Ser Querido
        </h1>
        <Ornament />
        <p className="max-w-xl mx-auto text-xs sm:text-sm font-light leading-relaxed text-stone-400 px-3">
          Completa los datos de tu familiar con devoción. Una vez enviada, la solicitud quedará en revisión
          y el guardián del obituario autorizará su descanso en el santuario en breve.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/30 text-xs text-gold-soft">
          <span>🕊️</span> <span>Proceso de revisión respetuoso · Notificación automática</span>
        </div>
      </div>

      <NuevaForm familias={familias} action={handleSubmit} error={error} esPublico={true} />
    </section>
  );
}
