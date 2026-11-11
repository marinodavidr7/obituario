import { useEffect, useState } from "react";
import Link from "@/components/Link";
import Stars from "@/components/Stars";
import Buscador from "@/components/Buscador";
import MobileBottomNav from "@/components/MobileBottomNav";
import AudioPlayer from "@/components/AudioPlayer";
import OfflineNotification from "@/components/OfflineNotification";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/toast";
import { getConfig } from "@/lib/db";
import { useRoute } from "@/lib/router";

// Vistas
import Home from "@/pages/Home";
import PersonaView from "@/pages/PersonaView";
import FamiliaView from "@/pages/FamiliaView";
import Inscribir from "@/pages/Inscribir";
import InscribirGracias from "@/pages/InscribirGracias";
import Admin from "@/pages/Admin";
import AdminNueva from "@/pages/AdminNueva";
import AdminEditar from "@/pages/AdminEditar";
import Terminos from "@/pages/Terminos";
import NotFound from "@/pages/NotFound";

export default function App() {
  const route = useRoute();
  const [musicaGeneralUrl, setMusicaGeneralUrl] = useState<string | null>(() => getConfig("musica_general_url"));
  const [musicaGeneralTitulo, setMusicaGeneralTitulo] = useState<string | null>(() => getConfig("musica_general_titulo"));
  const [adminVolume, setAdminVolume] = useState<number>(() => {
    const v = parseInt(getConfig("musica_volumen") || "70", 10);
    return (isNaN(v) ? 70 : v) / 100;
  });

  const updateGeneralMusic = () => {
    setMusicaGeneralUrl(getConfig("musica_general_url"));
    setMusicaGeneralTitulo(getConfig("musica_general_titulo"));
    const v = parseInt(getConfig("musica_volumen") || "70", 10);
    setAdminVolume((isNaN(v) ? 70 : v) / 100);
  };

  useEffect(() => {
    updateGeneralMusic();
    window.addEventListener("panteon:db-updated", updateGeneralMusic);
    return () => window.removeEventListener("panteon:db-updated", updateGeneralMusic);
  }, []);

  // Garantizar que al navegar entre secciones la vista siempre se monte desde arriba
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [route.name, "id" in route ? route.id : ""]);

  let viewContent = <NotFound />;

  switch (route.name) {
    case "home":
      viewContent = <Home />;
      break;
    case "persona":
      viewContent = <PersonaView id={route.id} />;
      break;
    case "familia":
      viewContent = <FamiliaView id={route.id} />;
      break;
    case "inscribir":
      viewContent = <Inscribir />;
      break;
    case "inscribir-gracias":
      viewContent = <InscribirGracias />;
      break;
    case "terminos":
      viewContent = <Terminos />;
      break;
    case "admin":
      viewContent = <Admin />;
      break;
    case "admin-nueva":
      viewContent = <AdminNueva />;
      break;
    case "admin-editar":
      viewContent = <AdminEditar id={route.id} />;
      break;
    default:
      viewContent = <NotFound />;
      break;
  }

  return (
    <ToastProvider>
      <div className="selection:bg-gold/30 selection:text-gold-soft font-sans min-h-[100dvh] flex flex-col antialiased">
        <Stars />
        <OfflineNotification />

        {/* Barra superior con soporte para Safe Area Top (Notch / Dynamic Island) */}
        <nav className="sticky top-0 z-40 backdrop-blur-md bg-stone-950/80 border-b border-gold/15 pt-[env(safe-area-inset-top)]">
          <div className="w-full px-4 sm:px-8 xl:px-12 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 sm:gap-2 group shrink-0 active:scale-95 transition-transform my-auto py-1 min-w-0"
            >
              <span className="text-gold text-base sm:text-lg leading-none transition-transform duration-300 group-hover:scale-110 select-none shrink-0">
                ✦
              </span>
              <span className="font-serif text-sm sm:text-xl tracking-widest text-stone-100 leading-none select-none truncate">
                OBITUARIO <span className="hidden xs:inline">FAMILIAR</span>
              </span>
            </Link>

            {/* Buscador inteligente, reproductor y enlaces rápidos */}
            <div className="flex items-center gap-2 sm:gap-3.5 my-auto">
              <AudioPlayer
                generalUrl={musicaGeneralUrl}
                generalTitulo={musicaGeneralTitulo}
                adminVolume={adminVolume}
              />
              <Buscador />

              <Link
                href="/inscribir"
                className="hidden md:inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-gold-soft border border-gold/40 hover:border-gold hover:bg-gold/15 bg-gold/5 rounded-full px-3.5 py-1.5 transition-colors shrink-0"
              >
                <span>🕊️</span> Inscribir ser querido
              </Link>

              <Link
                href="/admin"
                className="hidden sm:inline-block text-[10px] uppercase tracking-[0.25em] text-stone-500 hover:text-gold-soft transition-colors shrink-0"
              >
                Administrar
              </Link>
            </div>
          </div>
        </nav>

        {/* Contenido principal con espaciado vertical armónico y safe area para el menú móvil */}
        <main className="relative z-10 flex-1 w-full px-3.5 sm:px-6 lg:px-8 xl:px-12 pb-[max(7rem,calc(5.5rem+env(safe-area-inset-bottom)))] sm:pb-8 pt-2">
          <ErrorBoundary key={route.name + (("id" in route && route.id) || "")}>
            {viewContent}
          </ErrorBoundary>
        </main>

        {/* Pie de página noble con botones táctiles generosos y textos legibles */}
        <footer className="relative z-10 w-full border-t border-white/10 pt-5 pb-[max(7rem,calc(5.5rem+env(safe-area-inset-bottom)))] sm:pb-6 px-4 text-center">
          <p className="tracking-[0.22em] uppercase font-serif text-xs text-stone-400 font-medium mb-3">
            ✦ Obituario Familiar · En Memoria Perpetua ✦
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 max-w-xl mx-auto">
            <Link
              href="/terminos"
              className="inline-flex items-center justify-center min-h-[42px] px-4 py-2.5 rounded-full bg-stone-900/80 hover:bg-gold/10 border border-white/15 hover:border-gold/50 text-xs sm:text-sm text-stone-200 hover:text-gold-soft transition-all active:scale-95 shadow-sm"
            >
              ⚖️ Términos, Condiciones y Deslinde
            </Link>
            <Link
              href="/inscribir"
              className="inline-flex items-center justify-center min-h-[42px] px-4 py-2.5 rounded-full bg-gold/15 hover:bg-gold/25 border border-gold/45 hover:border-gold text-xs sm:text-sm text-gold-soft font-medium transition-all active:scale-95 shadow-[0_0_15px_rgba(201,168,106,0.15)]"
            >
              🕊️ Inscribir Ser Querido
            </Link>
          </div>
          <p className="text-[11px] text-stone-500 mt-2.5 font-light">
            Santuario digital memorial para la veneración respetuosa de las almas.
          </p>
        </footer>

        {/* Barra de navegación inferior móvil */}
        <MobileBottomNav />
      </div>
    </ToastProvider>
  );
}
