import { useState } from "react";
import { useToast } from "@/components/toast";
import { triggerHaptic } from "@/lib/haptics";

export default function CompartirHomenaje({
  personaId,
  nombre,
  anios,
  familiaApellido,
}: {
  personaId: string;
  nombre: string;
  anios: string;
  familiaApellido?: string;
}) {
  const toast = useToast();
  const [qrAbierto, setQrAbierto] = useState(false);
  const [descargando, setDescargando] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/#/persona/${personaId}`
      : `https://obituariocloud.vercel.app/#/persona/${personaId}`;

  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=12&data=${encodeURIComponent(shareUrl)}`;

  function compartirWhatsApp() {
    triggerHaptic("light");
    const mensaje = [
      `🕯️ *En memoria de ${nombre}* (${anios})`,
      familiaApellido ? `Familia ${familiaApellido}` : "",
      "",
      "Te invito a visitar su altar digital, encender una vela y dejar una dedicatoria:",
      shareUrl,
    ]
      .filter((line) => line !== undefined)
      .join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, "_blank", "noopener,noreferrer");
  }

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      triggerHaptic("success");
      toast("Enlace copiado al portapapeles", "success");
    } catch {
      toast("No se pudo copiar el enlace", "warning");
    }
  }

  async function descargarTarjetaQR() {
    if (descargando) return;
    setDescargando(true);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("No se pudo cargar el QR"));
        img.src = qrImgUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = 760;
      canvas.height = 980;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas no disponible");

      // Fondo oscuro elegante
      ctx.fillStyle = "#0b0e14";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Marco dorado doble
      ctx.strokeStyle = "#c9a86a";
      ctx.lineWidth = 4;
      ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);
      ctx.strokeStyle = "rgba(201, 168, 106, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(42, 42, canvas.width - 84, canvas.height - 84);

      ctx.textAlign = "center";

      // Encabezado
      ctx.fillStyle = "#c9a86a";
      ctx.font = "600 20px Georgia, serif";
      ctx.fillText("✦  EN MEMORIA DE  ✦", canvas.width / 2, 110);

      // Nombre
      ctx.fillStyle = "#f4f1eb";
      ctx.font = "bold 40px Georgia, serif";
      ctx.fillText(nombre.slice(0, 32), canvas.width / 2, 175);

      // Años y familia
      ctx.fillStyle = "#b8b0a2";
      ctx.font = "24px Georgia, serif";
      ctx.fillText(
        familiaApellido ? `${anios}  ·  Familia ${familiaApellido}` : anios,
        canvas.width / 2,
        220
      );

      // Caja blanca para el QR
      const qrSize = 420;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 275;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(qrX - 18, qrY - 18, qrSize + 36, qrSize + 36);
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      // Pie de tarjeta
      ctx.fillStyle = "#e5cfa0";
      ctx.font = "italic 24px Georgia, serif";
      ctx.fillText("Escanea para visitar su altar digital", canvas.width / 2, 795);

      ctx.fillStyle = "#9c9488";
      ctx.font = "19px sans-serif";
      ctx.fillText("Encender una vela · Enviar flores · Leer dedicatorias", canvas.width / 2, 835);

      ctx.fillStyle = "rgba(201, 168, 106, 0.7)";
      ctx.font = "16px sans-serif";
      ctx.fillText("Obituario Familiar", canvas.width / 2, 910);

      const link = document.createElement("a");
      const slug = nombre
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "");
      link.download = `QR-${slug || "homenaje"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      triggerHaptic("success");
      toast("Tarjeta QR descargada lista para imprimir", "success");
    } catch {
      window.open(qrImgUrl, "_blank", "noopener,noreferrer");
      toast("QR abierto en nueva pestaña", "info");
    } finally {
      setDescargando(false);
    }
  }

  return (
    <>
      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={compartirWhatsApp}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 text-[11px] uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
        >
          <span>📲</span>
          <span>WhatsApp</span>
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setQrAbierto(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-gold/35 bg-gold/10 hover:bg-gold/20 text-gold-soft text-[11px] uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
        >
          <span>🔲</span>
          <span>Código QR</span>
        </button>
      </div>

      {qrAbierto && (
        <div
          className="fixed inset-0 z-[110] grid place-items-center bg-black/85 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setQrAbierto(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-gold/35 bg-[#0e1217] p-6 text-center shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-left">
                <p className="text-[10px] uppercase tracking-[0.25em] text-gold/80">
                  QR para misas y placas
                </p>
                <h3 className="font-serif text-xl text-stone-100 mt-0.5">{nombre}</h3>
                <p className="text-xs text-stone-400">{anios}</p>
              </div>
              <button
                type="button"
                onClick={() => setQrAbierto(false)}
                className="w-8 h-8 rounded-full border border-white/15 text-stone-400 hover:text-white grid place-items-center cursor-pointer"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="mx-auto w-56 h-56 rounded-xl bg-white p-3 grid place-items-center shadow-inner">
              <img
                src={qrImgUrl}
                alt={`Código QR de ${nombre}`}
                className="w-full h-full object-contain"
              />
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              Ideal para imprimir en recordatorios de misa, novenarios o placas conmemorativas.
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={descargando}
                onClick={descargarTarjetaQR}
                className="w-full py-2.5 rounded-full bg-gold/20 hover:bg-gold/30 border border-gold/50 text-gold-soft text-xs uppercase tracking-wider font-medium active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {descargando ? "Generando tarjeta..." : "⬇️ Descargar Tarjeta QR (PNG)"}
              </button>
              <button
                type="button"
                onClick={copiarEnlace}
                className="w-full py-2 rounded-full border border-white/15 hover:border-gold/40 text-stone-300 hover:text-white text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                📋 Copiar enlace directo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
