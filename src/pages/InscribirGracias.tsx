import Link from "@/components/Link";
import Ornament from "@/components/Ornament";

export default function InscribirGracias() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.hash.split("?")[1] : "");
  const nombre = params.get("nombre");

  return (
    <section className="fade-enter max-w-lg mx-auto pt-12 sm:pt-20 text-center pb-20">
      <div className="w-16 h-16 rounded-full bg-gold/15 border border-gold/40 mx-auto flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(201,168,106,0.3)] mb-5">
        🕊️
      </div>

      <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-gold block mb-2">
        En memoria y devoción
      </span>

      <h1 className="font-serif font-light text-3xl sm:text-4xl text-[#f5f2eb] tracking-wide">
        Solicitud en Revisión
      </h1>

      <Ornament />

      <p className="text-sm sm:text-base font-serif italic text-gold-soft mt-1">
        {nombre ? `«La memoria de ${nombre} ha sido recibida con respeto»` : "La memoria ha sido recibida con respeto"}
      </p>

      <div className="mt-6 p-5 rounded-2xl bg-stone-900/70 border border-white/10 text-xs text-stone-300 leading-relaxed text-left space-y-2.5">
        <p className="flex items-start gap-2">
          <span className="text-gold text-base leading-none">✦</span>
          <span>El guardián del obituario ha recibido la notificación y revisará los datos cuidadosamente.</span>
        </p>
        <p className="flex items-start gap-2">
          <span className="text-gold text-base leading-none">✦</span>
          <span>Una vez autorizada, su lápida quedará iluminada para que toda la familia pueda volver a visitarle y depositar ofrendas.</span>
        </p>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/"
          className="w-full sm:w-auto px-6 py-3 rounded-full bg-gold/25 hover:bg-gold/35 border border-gold/60 text-gold-soft text-xs uppercase tracking-[0.2em] font-medium transition-all active:scale-95"
        >
          Volver al Obituario
        </Link>
        <Link
          href="/inscribir"
          className="w-full sm:w-auto px-6 py-3 rounded-full bg-stone-900 hover:bg-stone-800 border border-white/15 text-stone-300 text-xs uppercase tracking-[0.16em] transition-colors"
        >
          Inscribir a otro familiar
        </Link>
      </div>
    </section>
  );
}
