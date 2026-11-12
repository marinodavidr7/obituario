import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, Check } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { actualizarFamilia } from "@/lib/db";
import { useToast } from "@/components/toast";
import type { Familia } from "@/types";

interface EditarFamiliaModalProps {
  open: boolean;
  familia: Familia | null;
  onClose: () => void;
  onSaved?: (fam: Familia) => void;
}

export default function EditarFamiliaModal({
  open,
  familia,
  onClose,
  onSaved,
}: EditarFamiliaModalProps) {
  const toast = useToast();
  const [apellido, setApellido] = useState("");
  const [lema, setLema] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (familia) {
      setApellido(familia.apellido || "");
      setLema(familia.lema || "");
      setError("");
    }
  }, [familia, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !familia) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const apellidoTrim = apellido.trim();
    if (!apellidoTrim) {
      setError("Por favor ingresa un apellido familiar.");
      return;
    }

    setGuardando(true);
    setError("");
    try {
      const res = await actualizarFamilia(familia.id, apellidoTrim, lema.trim() || null);
      if (res.success) {
        triggerHaptic("success");
        toast(`Familia ${apellidoTrim} actualizada correctamente`, "success");
        if (onSaved) {
          onSaved({ ...familia, apellido: apellidoTrim, lema: lema.trim() || null });
        }
        onClose();
      } else {
        setError(res.error || "No se pudo actualizar la familia.");
      }
    } catch (err: any) {
      setError(err?.message || "Error al conectar con la base de datos.");
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => {
          triggerHaptic("light");
          onClose();
        }}
      />

      <div className="modal-enter relative w-full max-w-md rounded-2xl border border-gold/30 bg-[#0e1218] shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-gold/40 via-gold to-gold/60" />

        <div className="p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-200 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <span className="p-2 rounded-xl bg-gold/15 text-gold border border-gold/30">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-serif text-xl sm:text-2xl text-stone-100">
                Editar Familia
              </h3>
              <p className="text-xs text-stone-400">
                Actualizar apellido familiar y lema
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-300 font-medium mb-1.5">
                Apellido Familiar
              </label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => {
                  setApellido(e.target.value);
                  setError("");
                }}
                placeholder="Ej: Alcántara, Gómez, Martínez"
                className="w-full bg-stone-950/80 border border-white/15 focus:border-gold/70 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder:text-stone-600 outline-none transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-300 font-medium mb-1.5">
                Lema o Frase Familiar <span className="text-stone-500 font-normal lowercase">(opcional)</span>
              </label>
              <input
                type="text"
                value={lema}
                onChange={(e) => setLema(e.target.value)}
                placeholder="Ej: La casa donde siempre se vuelve"
                className="w-full bg-stone-950/80 border border-white/15 focus:border-gold/70 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder:text-stone-600 outline-none transition-colors italic font-serif"
              />
            </div>

            <div className="p-3 rounded-xl bg-stone-900/60 border border-white/10 text-[11px] text-stone-400 leading-relaxed">
              ✦ <span className="text-stone-300 font-medium">Nota:</span> Al cambiar el apellido, todas las almas, fichas y búsquedas de este mausoleo se actualizarán en tiempo real.
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/30 text-xs text-rose-300">
                ⚠️ {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onClose();
                }}
                className="px-4 py-2 rounded-full border border-white/10 text-stone-300 hover:text-white text-xs uppercase tracking-wider transition-colors active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando || !apellido.trim()}
                className="px-5 py-2 rounded-full bg-gold/20 hover:bg-gold/30 border border-gold/60 text-gold-soft font-medium text-xs uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{guardando ? "Guardando..." : "Guardar Cambios"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
