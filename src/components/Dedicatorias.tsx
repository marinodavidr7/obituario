import { useEffect, useState } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/toast";
import type { Dedicatoria } from "@/types";
import { addDedicatoria, deleteDedicatoria, updateDedicatoria } from "@/lib/db";
import { validarDedicatoria } from "@/lib/moderacion";
import { corregirOrtografiaIA } from "@/lib/telegram";
import { triggerHaptic } from "@/lib/haptics";
import { formatearFecha } from "@/lib/utils";

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
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editAutor, setEditAutor] = useState("");
  const [editTexto, setEditTexto] = useState("");
  const [guardandoEdit, setGuardandoEdit] = useState(false);

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
      const iaRes = await corregirOrtografiaIA(check.textoLimpio);
      const textoFinal = iaRes.ok && iaRes.textoCorregido ? iaRes.textoCorregido : check.textoLimpio;
      const nueva = addDedicatoria(personaId, check.autorLimpio, textoFinal);
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

  async function handleCorregirOrtografia() {
    if (texto.trim().length < 4 || corrigiendo) return;
    setCorrigiendo(true);
    try {
      const res = await corregirOrtografiaIA(texto);
      if (res.ok && res.textoCorregido) {
        setTexto(res.textoCorregido);
        toast("Ortografía revisada y corregida con IA", "success");
      } else {
        toast("No se pudo conectar con la IA en este momento", "warning");
      }
    } finally {
      setCorrigiendo(false);
    }
  }

  function iniciarEdicion(d: Dedicatoria) {
    setEditingId(d.id);
    setEditAutor(d.autor);
    setEditTexto(d.texto);
  }

  async function guardarEdicion(id: number | string) {
    if (!editAutor.trim() || !editTexto.trim() || guardandoEdit) return;
    setGuardandoEdit(true);
    try {
      const res = await updateDedicatoria(id, editAutor, editTexto);
      if (res.success) {
        setLista((prev) =>
          prev.map((item) =>
            String(item.id) === String(id)
              ? { ...item, autor: editAutor.trim(), texto: editTexto.trim() }
              : item
          )
        );
        setEditingId(null);
        toast("Dedicatoria actualizada correctamente", "success");
      } else {
        toast(res.error || "No se pudo actualizar la dedicatoria", "warning");
      }
    } finally {
      setGuardandoEdit(false);
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
            ✦ Espacio protegido: la IA corrige automáticamente la ortografía y filtra spam.
          </span>
          <div className="flex items-center justify-end gap-2">
            {texto.trim().length >= 4 && (
              <button
                type="button"
                onClick={handleCorregirOrtografia}
                disabled={corrigiendo || enviando}
                className="px-3.5 py-2 sm:py-1.5 rounded-full bg-indigo-500/15 hover:bg-indigo-500/25 active:scale-95 disabled:opacity-50 border border-indigo-400/35 text-indigo-200 text-xs sm:text-[11px] uppercase tracking-wider transition-all shrink-0 cursor-pointer"
                title="Corregir faltas de ortografía y tildes con IA"
              >
                {corrigiendo ? "Corrigiendo..." : "✨ Corregir ortografía"}
              </button>
            )}
            <button
              type="submit"
              disabled={enviando || corrigiendo}
              className="w-full sm:w-auto px-5 py-2.5 sm:py-1.5 rounded-full bg-gold/15 hover:bg-gold/25 active:scale-95 disabled:opacity-50 border border-gold/40 text-gold-soft text-xs sm:text-[11px] uppercase tracking-widest transition-all shrink-0 cursor-pointer"
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
          <article
            key={r.id}
            className="p-4 sm:p-5 rounded-2xl bg-stone-950/70 border border-white/10 hover:border-pink-500/25 shadow-lg backdrop-blur-sm transition-all group flex flex-col justify-between"
          >
            {editingId !== null && String(editingId) === String(r.id) ? (
              <div className="space-y-3">
                <input
                  value={editAutor}
                  onChange={(e) => setEditAutor(e.target.value)}
                  placeholder="Autor"
                  className="w-full bg-stone-900 border border-white/15 focus:border-gold rounded-lg px-3 py-1.5 text-xs text-stone-100 focus:outline-none"
                />
                <textarea
                  rows={3}
                  value={editTexto}
                  onChange={(e) => setEditTexto(e.target.value)}
                  placeholder="Texto de la dedicatoria"
                  className="w-full bg-stone-900 border border-white/15 focus:border-gold rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none"
                />
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 rounded-full border border-white/15 text-stone-400 hover:text-stone-200 text-[11px] uppercase tracking-wider cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={guardandoEdit}
                    onClick={() => guardarEdicion(r.id)}
                    className="px-4 py-1 rounded-full bg-gold/20 hover:bg-gold/30 border border-gold/50 text-gold-soft text-[11px] uppercase tracking-wider cursor-pointer disabled:opacity-50"
                  >
                    {guardandoEdit ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="font-sans text-[14.5px] sm:text-[15.5px] text-stone-100 font-normal leading-relaxed tracking-normal select-text break-words">
                  “{r.texto}”
                </p>
                <div className="mt-3.5 pt-2.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-pink-300 font-medium tracking-wide">
                    — {r.autor}
                  </span>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-stone-400 text-[11px] sm:text-xs font-sans">
                      {formatearFecha(r.fecha)}
                    </span>
                    {esAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => iniciarEdicion(r)}
                          className="text-[10px] uppercase tracking-wider text-gold-soft hover:text-gold border border-gold/30 hover:border-gold/60 rounded-full px-2.5 py-0.5 active:scale-95 transition-all cursor-pointer"
                          title="Editar dedicatoria"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => borrar(r.id)}
                          className="text-[10px] uppercase tracking-wider text-rose-400 hover:text-rose-200 border border-rose-500/30 hover:border-rose-400/60 rounded-full px-2.5 py-0.5 active:scale-95 transition-all cursor-pointer"
                          title="Eliminar dedicatoria"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
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
