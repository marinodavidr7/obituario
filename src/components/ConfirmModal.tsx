import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Sí, Eliminar Definitivamente",
  cancelText = "Cancelar",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Telón de fondo con desenfoque elegante */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => {
          triggerHaptic("light");
          onCancel();
        }}
      />

      {/* Tarjeta de diálogo estilo MENUQR */}
      <div className="modal-enter relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#0e1218] shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Línea superior acentuada */}
        <div className="h-1 w-full bg-gradient-to-r from-rose-500 via-rose-400 to-rose-600" />

        <div className="p-5 sm:p-6 relative">
          {/* Botón cerrar esquina */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onCancel();
            }}
            className="absolute top-4 right-4 text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icono de advertencia */}
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center mb-4">
            {variant === "danger" ? <Trash2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>

          <h3 className="text-lg sm:text-xl font-serif text-white tracking-wide font-normal">
            {title}
          </h3>

          <p className="text-xs sm:text-[13px] text-stone-300 font-sans leading-relaxed mt-2 pr-2">
            {message}
          </p>
        </div>

        {/* Pie de acciones estilo MENUQR */}
        <div className="px-5 sm:px-6 py-3.5 bg-stone-950/70 border-t border-white/10 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onCancel();
            }}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white border border-white/10 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("heavy");
              onConfirm();
            }}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-950/50 cursor-pointer active:scale-95 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
