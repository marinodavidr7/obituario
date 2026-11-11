"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface FotoCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onConfirm: (croppedFile: File, previewUrl: string, calculatedPos: string) => void;
  initialPos?: string;
}

export default function FotoCropModal({
  isOpen,
  imageSrc,
  onClose,
  onConfirm,
}: FotoCropModalProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [maskType, setMaskType] = useState<"arch" | "circle">("arch");
  const [isInteracting, setIsInteracting] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartDistRef = useRef<number | null>(null);
  const initialTouchScaleRef = useRef<number>(1);

  // Dimensiones del visor de recorte
  const CROP_W = 260;
  const CROP_H = maskType === "arch" ? 340 : 260;

  // Reset al abrir o cambiar imagen
  useEffect(() => {
    if (isOpen) {
      setScale(1.1);
      setOffset({ x: 0, y: 0 });
      setRotation(0);
      setImageLoaded(false);
    }
  }, [isOpen, imageSrc]);

  // Cargar imagen para obtener tamaño natural
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setImageLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Manejo de arrastre con ratón (Mouse Pan)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    setIsInteracting(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      setOffset({ x: newX, y: newY });
    },
    [offset]
  );

  const handleMouseUp = useCallback(() => {
    dragStartRef.current = null;
    setIsInteracting(false);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Manejo táctil móvil (Touch Pan y Pinch-to-zoom estilo TikTok)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      dragStartRef.current = { x: t.clientX - offset.x, y: t.clientY - offset.y };
      setIsInteracting(true);
    } else if (e.touches.length === 2) {
      // Inicio de pellizco con 2 dedos (Pinch to zoom)
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      initialTouchScaleRef.current = scale;
      setIsInteracting(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && dragStartRef.current) {
      const t = e.touches[0];
      const newX = t.clientX - dragStartRef.current.x;
      const newY = t.clientY - dragStartRef.current.y;
      setOffset({ x: newX, y: newY });
    } else if (e.touches.length === 2 && touchStartDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartDistRef.current;
      const newScale = Math.min(3.5, Math.max(0.8, initialTouchScaleRef.current * factor));
      setScale(newScale);
    }
  };

  const handleTouchEnd = () => {
    dragStartRef.current = null;
    touchStartDistRef.current = null;
    setIsInteracting(false);
  };

  // Zoom con rueda del ratón
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setScale((prev) => Math.min(3.5, Math.max(0.8, prev + delta)));
  };

  // Rotar 90 grados
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Restablecer posición y zoom
  const handleReset = () => {
    setScale(1.1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
  };

  // Exportar recorte a alta resolución en HTML5 Canvas
  const handleConfirm = async () => {
    if (!imageSrc || !naturalSize.w || !naturalSize.h) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;

    await new Promise((resolve) => {
      if (img.complete) resolve(true);
      else img.onload = () => resolve(true);
    });

    const isRotatedQuarter = rotation === 90 || rotation === 270;
    const imgEffectiveW = isRotatedQuarter ? naturalSize.h : naturalSize.w;
    const imgEffectiveH = isRotatedQuarter ? naturalSize.w : naturalSize.h;

    // Resolución de salida nítida en alta calidad
    const OUT_W = 900;
    const OUT_H = maskType === "arch" ? 1200 : 900;

    const canvas = document.createElement("canvas");
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Escala base para cubrir el visor
    const baseScale = Math.max(CROP_W / imgEffectiveW, CROP_H / imgEffectiveH);
    const factor = OUT_W / CROP_W;

    // Fondo oscuro pulido por si queda algún margen
    ctx.fillStyle = "#11151a";
    ctx.fillRect(0, 0, OUT_W, OUT_H);

    ctx.save();
    // Trasladar al centro del canvas con el desplazamiento aplicado por el usuario
    ctx.translate(OUT_W / 2 + offset.x * factor, OUT_H / 2 + offset.y * factor);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(baseScale * scale * factor, baseScale * scale * factor);

    // Dibujar centrado respecto al centro de la imagen original
    ctx.drawImage(img, -naturalSize.w / 2, -naturalSize.h / 2);
    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "retrato_ajustado.jpg", { type: "image/jpeg" });
        const previewUrl = URL.createObjectURL(blob);
        onConfirm(file, previewUrl, "50% 50%");
        onClose();
      },
      "image/jpeg",
      0.92
    );
  };

  if (!isOpen) return null;

  // Cálculo de escala base en el visor de pantalla
  const isRotatedQuarter = rotation === 90 || rotation === 270;
  const imgEffectiveW = isRotatedQuarter ? naturalSize.h : naturalSize.w;
  const imgEffectiveH = isRotatedQuarter ? naturalSize.w : naturalSize.h;
  const baseScale =
    naturalSize.w && naturalSize.h
      ? Math.max(CROP_W / imgEffectiveW, CROP_H / imgEffectiveH)
      : 1;

  const displayScale = baseScale * scale;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md rounded-3xl bg-[#0b0e13] border border-gold/40 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Cabecera estilo TikTok */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div>
            <h3 className="font-serif text-base text-stone-100 flex items-center gap-2">
              <span className="text-gold text-lg">✦</span>
              <span>Ajustar Foto de Perfil</span>
            </h3>
            <p className="text-[10px] text-stone-400">
              Arrastra y pellizca para centrar la cara del difunto
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-stone-400 hover:text-white flex items-center justify-center text-xs transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Selector de tipo de marco / vista */}
        <div className="flex items-center justify-center gap-2 pt-3 pb-1 px-4">
          <button
            type="button"
            onClick={() => setMaskType("arch")}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
              maskType === "arch"
                ? "bg-gold text-stone-950 shadow-[0_0_12px_rgba(201,168,106,0.3)] font-semibold"
                : "bg-white/5 text-stone-400 hover:text-stone-200"
            }`}
          >
            🏛️ Vista Lápida (Arco)
          </button>
          <button
            type="button"
            onClick={() => setMaskType("circle")}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
              maskType === "circle"
                ? "bg-gold text-stone-950 shadow-[0_0_12px_rgba(201,168,106,0.3)] font-semibold"
                : "bg-white/5 text-stone-400 hover:text-stone-200"
            }`}
          >
            ⭕ Vista Medalla (Círculo)
          </button>
        </div>

        {/* Visor interactivo de recorte */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          style={{ height: 380 }}
          className="relative w-full bg-[#050709] overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none my-1"
        >
          {/* Imagen transformada debajo */}
          {imageLoaded && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${displayScale})`,
                transformOrigin: "center center",
                transition: isInteracting ? "none" : "transform 0.08s ease-out",
                pointerEvents: "none",
              }}
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Ajuste de rostro"
                className="max-w-none pointer-events-none select-none"
                style={{
                  width: naturalSize.w,
                  height: naturalSize.h,
                }}
              />
            </div>
          )}

          {/* Máscara oscura con recorte transparente (Ventana de enfoque TikTok) */}
          <div
            style={{ width: CROP_W, height: CROP_H }}
            className={`relative pointer-events-none z-10 transition-all duration-200 ${
              maskType === "arch"
                ? "rounded-t-[140px] rounded-b-2xl"
                : "rounded-full"
            } border-2 border-gold/75 shadow-[0_0_0_9999px_rgba(5,7,9,0.85)]`}
          >
            {/* Guías de regla de tercios (visibles al interactuar o ajustar) */}
            <div
              className={`absolute inset-0 grid grid-cols-3 grid-rows-3 transition-opacity duration-200 ${
                isInteracting ? "opacity-60" : "opacity-25"
              }`}
            >
              <div className="border-r border-b border-gold/30" />
              <div className="border-r border-b border-gold/30" />
              <div className="border-b border-gold/30" />
              <div className="border-r border-b border-gold/30" />
              <div className="border-r border-b border-gold/30" />
              <div className="border-b border-gold/30" />
              <div className="border-r border-gold/30" />
              <div className="border-r border-gold/30" />
              <div />
            </div>

            {/* Punto de mira central sutil para encuadrar los ojos/nariz */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-40">
              <span className="absolute top-1/2 left-0 right-0 h-[1px] bg-gold" />
              <span className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-gold" />
            </div>
          </div>

          {/* Etiqueta flotante explicativa */}
          <div className="absolute bottom-2 z-20 px-3 py-1 rounded-full bg-stone-900/80 border border-white/10 text-[10px] text-stone-300 pointer-events-none backdrop-blur-sm">
            ✋ Arrastra para mover · 🔍 Rueda o barra para zoom
          </div>
        </div>

        {/* Barra de Controles y Zoom (TikTok Style) */}
        <div className="px-5 py-3 space-y-3 bg-[#0d1016] border-t border-white/10">
          {/* Control deslizante de zoom con botones - / + */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.8, s - 0.15))}
              className="w-8 h-8 rounded-full bg-stone-850 hover:bg-stone-800 border border-white/10 text-stone-200 flex items-center justify-center text-sm font-bold active:scale-95 transition-all"
              title="Alejar"
            >
              −
            </button>
            <div className="flex-1 flex items-center gap-2">
              <input
                type="range"
                min="0.8"
                max="3.2"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-gold"
              />
              <span className="text-[10px] font-mono text-gold-soft w-9 text-right">
                {Math.round(scale * 100)}%
              </span>
            </div>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(3.5, s + 0.15))}
              className="w-8 h-8 rounded-full bg-stone-850 hover:bg-stone-800 border border-white/10 text-stone-200 flex items-center justify-center text-sm font-bold active:scale-95 transition-all"
              title="Acercar"
            >
              +
            </button>
          </div>

          {/* Herramientas de rotar y centrar */}
          <div className="flex items-center justify-between text-xs text-stone-400">
            <button
              type="button"
              onClick={handleRotate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-850 hover:bg-stone-800 border border-white/10 text-stone-300 hover:text-white transition-colors"
            >
              <span>↺</span> <span>Rotar 90°</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-850 hover:bg-stone-800 border border-white/10 text-stone-300 hover:text-white transition-colors"
            >
              <span>⟲</span> <span>Centrar</span>
            </button>
          </div>
        </div>

        {/* Botones de acción principales */}
        <div className="flex items-center gap-3 p-4 bg-[#0a0d12] border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-full border border-white/15 hover:bg-white/5 text-xs uppercase tracking-wider text-stone-400 hover:text-stone-200 font-medium active:scale-95 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-full bg-gold hover:bg-gold-soft text-stone-950 text-xs uppercase tracking-wider font-semibold active:scale-95 transition-all shadow-[0_0_20px_rgba(201,168,106,0.35)]"
          >
            ✓ Aplicar Encuadre
          </button>
        </div>
      </div>
    </div>
  );
}
