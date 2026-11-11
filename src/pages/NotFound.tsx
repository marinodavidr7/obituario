import Link from "@/components/Link";
import Ornament from "@/components/Ornament";

export default function NotFound() {
  return (
    <section className="fade-enter max-w-md mx-auto pt-20 text-center px-4 pb-24">
      <span className="text-4xl">✦</span>
      <h1 className="font-serif text-3xl text-stone-100 mt-4 mb-2">Página no encontrada</h1>
      <Ornament />
      <p className="text-xs text-stone-400 mb-8">
        El rincón del santuario que buscas no existe o ha sido trasladado.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gold/20 hover:bg-gold/30 border border-gold/50 text-gold-soft text-xs uppercase tracking-widest transition-all"
      >
        Volver al Obituario
      </Link>
    </section>
  );
}
