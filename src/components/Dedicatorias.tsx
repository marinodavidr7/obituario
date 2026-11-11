import { useEffect, useState } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/toast";
import type { Dedicatoria } from "@/types";
import { addDedicatoria, deleteDedicatoria } from "@/lib/db";
import { validarDedicatoria } from "@/lib/moderacion";
import { triggerHaptic } from "@/lib/haptics";

export default function Dedicatorias({
  personaId,
  nombre,
  inicial,
  esAdmin = false,
}: {
  personaId: string;
  nombre: string;
  inicial: Dedicatoria[];
  esAdmin?: boolean;
}) {
  const toast = useToast();
  const [lista, setLista] = useState(inicial);
  const [autor, setAutor] = useState("");
  const [texto, setTexto] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);

  useEffect(() => {
    setLista(inicial || []);
  }, [inicial]);

  // Escuchar nuevas dedicatorias o borrados en tiempo real desde Supabase
  useEffect(() => {
    const handleRealtimeDedicatoria = (e: Event) => {
      const custom = e as CustomEvent<{ personaId: string; dedicatoria: Dedicatoria }>;
      if (custom.detail?.personaId === personaId && custom.detail.dedicatoria) {
        setLista((prev) => {
          if (prev.some((d) => String(d.id) === String(custom.detail.dedicatoria.id))) {
            return prev;
          }
          return [custom.detail.dedicatoria, ...prev];
        });
      }
    };

    const handleRealtimeDedicatoriaEliminada = (e: Event) => {
      const custom = e as CustomEvent<{ id: string | number }>;
      if (custom.detail?.id != null) {
        setLista((prev) => prev.filter((d) => String(d.id) !== String(custom.detail.id)));
      }
    };

    window.addEventListener("panteon:realtime-dedicatoria", handleRealtimeDedicatoria);
    window.addEventListener("panteon:realtime-dedicatoria-eliminada", handleRealtimeDedicatoriaEliminada);
    return () => {
      window.removeEventListener("panteon:realtime-dedicatoria", handleRealtimeDedicatoria);
      window.removeEventListener("panteon:realtime-dedicatoria-eliminada", handleRealtimeDedicatoriaEliminada);
    };
  }, [personaId]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setExito("");

    // Trampa anti-bots (honeypot)
    if (honeypot) return;

    // Validación inmediata en cliente (groserías, enlaces, longitud)
    const check = validarDedicatoria(autor, texto);
    if (!check.ok) {
      triggerHaptic("heavy");
      setError("error" in check ? check.error : "Texto inválido");
      return;
    }

    setEnviando(true);
    try {
      const nueva = addDedicatoria(personaId, check.autorLimpio, check.textoLimpio);
      triggerHaptic("success");
      setLista((l) => [nueva, ...l]);
      setAutor("");
      setTexto("");
      setExito("Tu dedicatoria ha sido inscrita con respeto en su memoria.");
      setTimeout(() => setExito(""), 4000);
    } catch {
      setError("No se pudo publicar. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  function borrar(id: number | string) {
    setDeletingId(id);
  }

  async function handleConfirmBorrar() {
    if (deletingId == null) return;
    triggerHaptic("heavy");
    const res = await deleteDedicatoria(deletingId);
    setLista((l) => l.filter((item) => String(item.id) !== String(deletingId)));
    setDeletingId(null);
    if (res.error) {
      toast(`Aviso: ${res.error}`, "warning");
    } else {
      toast("Dedicatoria eliminada de la base de datos", "delete");
    }
  }

  return (
    <div>
      <form onSubmit={enviar} className="bg-stone-900/60 border border-white/10 rounded-xl p-3.5 sm:p-4 mb-5">
        {/* Campo oculto anti-spam para bots */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="hidden"
          aria-hidden="true"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-3">
          <input
            required
            minLength={2}
            maxLength={80}
            value={autor}
            onChange={(e) => {
              setAutor(e.target.value);
              if (error) setError("");
            }}
            placeholder="Tu nombre o parentesco (ej: Tu nieto Carlos)"
            className="bg-stone-950 border border-white/10 focus:border-gold rounded-lg px-3 py-2 text-base sm:text-xs text-stone-200 focus:outline-none"
          />
          <input
            required
            minLength={4}
            maxLength={600}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              if (error) setError("");
            }}
            placeholder="Escribe una anécdota, oración o palabra de cariño..."
            className="sm:col-span-2 bg-stone-950 border border-white/10 focus:border-gold rounded-lg px-3 py-2 text-base sm:text-xs text-stone-200 focus:outline-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
          <span className="text-[10px] sm:text-[11px] text-stone-500">
            ✦ Espacio protegido: se filtran automáticamente palabras ofensivas y spam.
          </span>
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={enviando}
              className="w-full sm:w-auto px-5 py-2.5 sm:py-1.5 rounded-full bg-gold/15 hover:bg-gold/25 active:scale-95 disabled:opacity-50 border border-gold/40 text-gold-soft text-xs sm:text-[11px] uppercase tracking-widest transition-all shrink-0"
            >
              {enviando ? "Publicando..." : "Publicar dedicatoria"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3.5 py-2 text-xs text-rose-200">
            ⚠️ {error}
          </div>
        )}
        {exito && (
          <div className="mt-3 rounded-lg border border-gold/30 bg-gold/10 px-3.5 py-2 text-xs text-gold-soft">
            ✦ {exito}
          </div>
        )}
      </form>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-3.5">
        {lista.length === 0 && (
          <p className="col-span-full text-xs italic text-stone-500 py-3">
            Aún no hay dedicatorias. Sé el primero en compartir un recuerdo de {nombre}.
          </p>
        )}
        {lista.map((r) => (
          <article key={r.id} className="p-3.5 sm:p-4 rounded-xl bg-stone-950/60 border border-white/5 group">
            <p className="font-serif italic text-sm sm:text-base text-stone-200 leading-relaxed">“{r.texto}”</p>
            <div className="mt-2.5 flex items-center justify-between text-[10px] sm:text-[11px] text-stone-400">
              <span className="text-gold/90 font-medium">— {r.autor}</span>
              <div className="flex items-center gap-3">
                <span>{r.fecha}</span>
                {esAdmin && (
                  <button
                    type="button"
                    onClick={() => borrar(r.id)}
                    className="text-[10px] uppercase tracking-wider text-rose-400/80 hover:text-rose-300 border border-rose-500/20 hover:border-rose-400/50 rounded-full px-2.5 py-0.5 active:scale-90 transition-transform"
                    title="Eliminar dedicatoria"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <ConfirmModal
        open={deletingId !== null}
        title="¿Eliminar esta dedicatoria?"
        message="Esta dedicatoria se borrará permanentemente del libro de recuerdos y de la base de datos de Supabase."
        confirmText="Sí, Eliminar Definitivamente"
        onConfirm={handleConfirmBorrar}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
