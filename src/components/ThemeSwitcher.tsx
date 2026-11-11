import { useState, useRef, useEffect } from "react";
import { useTheme, THEMES, type ThemeId } from "@/lib/theme";
import { Palette, Check } from "lucide-react";

export default function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  if (compact) {
    // Versión compacta para barra de navegación (4 puntos directos de selección)
    return (
      <div
        className="flex items-center gap-1.5 p-1 rounded-full bg-stone-900/80 border border-white/10 backdrop-blur-md shadow-sm"
        title="Cambiar color del tema"
      >
        {THEMES.map((t) => {
          const isActive = theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={`relative w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-transform active:scale-90 flex items-center justify-center ${
                isActive ? "scale-110 shadow-[0_0_10px_rgba(255,255,255,0.4)]" : "opacity-75 hover:opacity-100 hover:scale-105"
              }`}
              style={{
                backgroundColor: t.dotColor,
                border: t.id === "blanco" ? "1.5px solid #cbd5e1" : "1.5px solid rgba(255,255,255,0.2)",
              }}
              aria-label={`Tema ${t.label}`}
              title={t.label}
            >
              {isActive && (
                <Check
                  className={`w-3 h-3 ${
                    t.id === "blanco" ? "text-stone-900" : "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                  }`}
                  strokeWidth={3}
                />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Versión menú desplegable elegante
  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-stone-900/80 hover:border-gold/50 text-stone-300 text-xs transition-all active:scale-95"
        aria-label="Abrir selector de color"
      >
        <span
          className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0"
          style={{ backgroundColor: activeTheme.dotColor }}
        />
        <span className="hidden md:inline text-[11px] uppercase tracking-wider font-medium">
          {activeTheme.label}
        </span>
        <Palette className="w-3.5 h-3.5 text-stone-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-white/15 bg-[#0e1218]/95 p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1.5 border-b border-white/10 mb-1">
            <span className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold block">
              Paleta de Color
            </span>
          </div>
          <div className="space-y-1">
            {THEMES.map((t) => {
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors ${
                    isActive
                      ? "bg-white/10 text-white font-medium"
                      : "text-stone-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                      style={{
                        backgroundColor: t.dotColor,
                        border: t.id === "blanco" ? "1.5px solid #94a3b8" : "1.5px solid rgba(255,255,255,0.2)",
                      }}
                    />
                    <div className="text-left truncate">
                      <span className="block truncate">{t.label}</span>
                      <span className="text-[10px] text-stone-400 block truncate">{t.desc}</span>
                    </div>
                  </div>
                  {isActive && <Check className="w-3.5 h-3.5 text-gold shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
