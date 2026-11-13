import { useEffect, useState } from "react";
import { useRoute } from "@/lib/router";
import Link from "@/components/Link";
import { triggerHaptic } from "@/lib/haptics";

export default function MobileBottomNav() {
  const route = useRoute();
  const [hiddenByModal, setHiddenByModal] = useState(false);

  useEffect(() => {
    const onOpen = () => setHiddenByModal(true);
    const onClose = () => setHiddenByModal(false);
    window.addEventListener("panteon:modal-opened", onOpen);
    window.addEventListener("panteon:modal-closed", onClose);
    return () => {
      window.removeEventListener("panteon:modal-opened", onOpen);
      window.removeEventListener("panteon:modal-closed", onClose);
    };
  }, []);

  const isHome = route.name === "home";
  const isInscribir = route.name.startsWith("inscribir");
  const isAdmin = route.name.startsWith("admin");
  const isFamilia = route.name === "familia";
  const isPersona = route.name === "persona";

  if (isPersona) return null;

  return (
    <nav
      aria-label="Navegación móvil"
      className={`sm:hidden fixed bottom-2 left-3 right-3 max-w-md mx-auto z-40 bg-[#0a0d13]/98 backdrop-blur-2xl border border-gold/25 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.95),0_0_20px_rgba(201,168,106,0.12)] pt-1.5 pb-[max(0.6rem,calc(0.45rem+env(safe-area-inset-bottom)))] px-2 transition-all duration-300 ${
        hiddenByModal ? "opacity-0 pointer-events-none translate-y-16" : "opacity-100 translate-y-0"
      }`}
    >
      <div className="grid grid-cols-4 items-center justify-around text-center gap-1">
        {/* 1. Inicio / Obituario */}
        <Link
          href="/"
          onClick={() => triggerHaptic("light")}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
            isHome
              ? "text-gold font-medium bg-gold/10"
              : "text-stone-400 hover:text-stone-200 active:scale-95"
          }`}
        >
          <span className="text-base leading-none h-5 flex items-center justify-center">🏛️</span>
          <span className="text-[10px] tracking-wider uppercase font-sans mt-0.5 leading-tight">
            Obituario
          </span>
          <span className="h-1 flex items-center justify-center mt-0.5">
            {isHome ? (
              <span className="w-1 h-1 rounded-full bg-gold shadow-[0_0_6px_rgba(201,168,106,0.9)]" />
            ) : (
              <span className="w-1 h-1 rounded-full opacity-0 pointer-events-none" />
            )}
          </span>
        </Link>

        {/* 2. Inscribir (Registro Familiar) */}
        <Link
          href="/inscribir"
          onClick={() => triggerHaptic("selection")}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
            isInscribir
              ? "text-gold font-medium bg-gold/10"
              : "text-stone-400 hover:text-stone-200 active:scale-95"
          }`}
        >
          <span className="text-base leading-none h-5 flex items-center justify-center">🕊️</span>
          <span className="text-[10px] tracking-wider uppercase font-sans mt-0.5 leading-tight">
            Inscribir
          </span>
          <span className="h-1 flex items-center justify-center mt-0.5">
            {isInscribir ? (
              <span className="w-1 h-1 rounded-full bg-gold shadow-[0_0_6px_rgba(201,168,106,0.9)]" />
            ) : (
              <span className="w-1 h-1 rounded-full opacity-0 pointer-events-none" />
            )}
          </span>
        </Link>

        {/* 3. Seres Queridos / Santuario */}
        <Link
          href="/#almas"
          onClick={() => {
            triggerHaptic("light");
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("switch-tab-todos"));
            }
          }}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
            isFamilia || isPersona
              ? "text-gold font-medium bg-gold/10"
              : "text-stone-400 hover:text-stone-200 active:scale-95"
          }`}
        >
          <span className="text-base leading-none h-5 flex items-center justify-center">🕯️</span>
          <span className="text-[10px] tracking-wider uppercase font-sans mt-0.5 leading-tight">
            Almas
          </span>
          <span className="h-1 flex items-center justify-center mt-0.5">
            {isFamilia || isPersona ? (
              <span className="w-1 h-1 rounded-full bg-gold shadow-[0_0_6px_rgba(201,168,106,0.9)]" />
            ) : (
              <span className="w-1 h-1 rounded-full opacity-0 pointer-events-none" />
            )}
          </span>
        </Link>

        {/* 4. Administrar */}
        <Link
          href="/admin"
          onClick={() => triggerHaptic("light")}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
            isAdmin
              ? "text-gold font-medium bg-gold/10"
              : "text-stone-400 hover:text-stone-200 active:scale-95"
          }`}
        >
          <span className="text-base leading-none h-5 flex items-center justify-center">⚙️</span>
          <span className="text-[10px] tracking-wider uppercase font-sans mt-0.5 leading-tight">
            Admin
          </span>
          <span className="h-1 flex items-center justify-center mt-0.5">
            {isAdmin ? (
              <span className="w-1 h-1 rounded-full bg-gold shadow-[0_0_6px_rgba(201,168,106,0.9)]" />
            ) : (
              <span className="w-1 h-1 rounded-full opacity-0 pointer-events-none" />
            )}
          </span>
        </Link>
      </div>
    </nav>
  );
}
