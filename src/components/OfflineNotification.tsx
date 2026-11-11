import { useEffect, useState } from "react";

export default function OfflineNotification() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });
  const [showRestored, setShowRestored] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      setDismissed(false);
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
      setDismissed(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (dismissed) return null;

  // Banner cuando se pierde la conexión
  if (!isOnline) {
    return (
      <aside
        aria-live="polite"
        className="fixed top-14 sm:top-16 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-top-2 duration-300 pointer-events-auto"
      >
        <div className="flex items-center justify-between gap-2.5 px-4 py-2.5 rounded-2xl bg-stone-900/95 border border-amber-500/40 text-amber-200 text-xs shadow-[0_12px_35px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-amber-200 text-xs leading-snug">
                Modo sin conexión activado
              </p>
              <p className="text-[11px] text-stone-300 leading-snug truncate">
                Memorias y páginas visitadas siguen disponibles offline
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Cerrar aviso de sin conexión"
            className="p-1 rounded-md text-stone-400 hover:text-white hover:bg-white/10 text-xs transition-colors shrink-0"
          >
            ✕
          </button>
        </div>
      </aside>
    );
  }

  // Notificación breve cuando vuelve la conexión
  if (showRestored) {
    return (
      <aside
        aria-live="polite"
        className="fixed top-14 sm:top-16 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-top-2 duration-300 pointer-events-auto"
      >
        <div className="flex items-center justify-between gap-2.5 px-4 py-2.5 rounded-2xl bg-stone-900/95 border border-emerald-500/40 text-emerald-200 text-xs shadow-[0_12px_35px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-emerald-200 text-xs leading-snug">
                Conexión restablecida
              </p>
              <p className="text-[11px] text-stone-300 leading-snug truncate">
                Santuario sincronizado
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRestored(false)}
            aria-label="Cerrar aviso de conexión"
            className="p-1 rounded-md text-stone-400 hover:text-white hover:bg-white/10 text-xs transition-colors shrink-0"
          >
            ✕
          </button>
        </div>
      </aside>
    );
  }

  return null;
}
