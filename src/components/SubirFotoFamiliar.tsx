import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/toast";
import { addFotoPendiente } from "@/lib/db";
import { notificarFotoPendienteTelegram } from "@/lib/telegram";
import { guardarArchivo } from "@/lib/uploads";
import { triggerHaptic } from "@/lib/haptics";

export default function SubirFotoFamiliar({
  personaId,
  personaNombre,
}: {
  personaId: string;
  personaNombre: string;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [remitente, setRemitente] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [captions, setCaptions] = useState<string[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  const previews = useMemo(() => archivos.map((f) => URL.createObjectURL(f)), [archivos]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  const setArchivoComentario = (i: number, v: string) =>
    setCaptions((c) => c.map((x, j) => (j === i ? v : x)));
  const quitarArchivo = (i: number) => {
    const rest = archivos.filter((_, j) => j !== i);
    setArchivos(rest);
    setCaptions((c) => c.filter((_, j) => j !== i));
    if (fileRef.current) {
      const dt = new DataTransfer();
      rest.forEach((f) => dt.items.add(f));
      fileRef.current.files = dt.files;
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (archivos.length === 0 || subiendo) return;

    setSubiendo(true);
    setMensajeExito("");
    let enviadas = 0;

    try {
      for (let i = 0; i < archivos.length; i++) {
        const url = await guardarArchivo(archivos[i]);
        if (url) {
          const pendiente = await addFotoPendiente(
            personaId,
            personaNombre,
            url,
            remitente.trim() || "Familiar",
            (captions[i] ?? "").trim() || null
          );
          await notificarFotoPendienteTelegram(pendiente).catch(() => {});
          enviadas++;
        }
      }

      if (enviadas > 0) {
        triggerHaptic("success");
        setArchivos([]);
        setCaptions([]);
        if (fileRef.current) fileRef.current.value = "";
        setMensajeExito(
          enviadas === 1
            ? "✅ Tu fotografía fue enviada y quedó en espera de aprobación del administrador."
            : `✅ Se enviaron ${enviadas} fotografías y quedaron en espera de aprobación del administrador.`
        );
        toast("Foto enviada a revisión del administrador", "success");
      } else {
        toast("No se pudo subir la imagen. Intenta de nuevo.", "warning");
      }
    } catch {
      toast("Error al subir la fotografía.", "warning");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="mt-4">
      {!abierto ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setAbierto(true);
              setMensajeExito("");
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 hover:bg-gold/20 border border-gold/35 text-gold-soft text-xs tracking-wider transition-all active:scale-95 cursor-pointer"
          >
            <span>📸</span>
            <span>Compartir una foto de recuerdo</span>
          </button>
          {archivos.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
              {previews.map((src, i) => (
                <div key={src} className="rounded-xl overflow-hidden border border-gold/25 bg-stone-950/70">
                  <div className="relative aspect-square group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => quitarArchivo(i)} aria-label="Quitar foto" className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/80 text-xs text-stone-200 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">✕</button>
                  </div>
                  <input
                    type="text"
                    name={`comentario_${i}`}
                    maxLength={140}
                    value={captions[i] ?? ""}
                    onChange={(e) => setArchivoComentario(i, e.target.value)}
                    placeholder="Comentario…"
                    aria-label={`Comentario de la foto ${i + 1}`}
                    className="w-full bg-stone-950 border-t border-gold/15 focus:border-gold/50 px-2 py-1.5 text-[10px] text-stone-200 placeholder:text-stone-600 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}

          {mensajeExito && (
            <span className="text-xs text-emerald-300">{mensajeExito}</span>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gold/25 bg-stone-900/70 p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h5 className="text-sm font-medium text-stone-100">
                📸 Enviar foto para el álbum de {personaNombre}
              </h5>
              <p className="text-[11px] text-stone-400">
                La fotografía pasará a revisión del administrador antes de publicarse.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="text-xs text-stone-400 hover:text-stone-200 px-2 py-1 cursor-pointer"
            >
              ✕ Cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              maxLength={60}
              value={remitente}
              onChange={(e) => setRemitente(e.target.value)}
              placeholder="Tu nombre o parentesco (ej: Prima Ana)"
              className="bg-stone-950 border border-white/10 focus:border-gold rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none"
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/mp4,video/webm,.mp4,.webm"
              multiple
              required
              onChange={(e) => {
                const list = Array.from(e.target.files || []);
                setArchivos(list);
                setCaptions(list.map(() => ""));
              }}
              className="bg-stone-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-stone-300 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[11px] file:bg-gold/20 file:text-gold-soft hover:file:bg-gold/30 cursor-pointer"
            />
          </div>

          {mensajeExito && (
            <div className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-500/30 rounded-lg px-3 py-2">
              {mensajeExito}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="px-3.5 py-1.5 rounded-full border border-white/10 text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={subiendo || archivos.length === 0}
              className="px-4 py-1.5 rounded-full bg-gold/20 hover:bg-gold/30 disabled:opacity-50 border border-gold/45 text-gold-soft text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              {subiendo ? "Enviando..." : "Enviar a aprobación"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
