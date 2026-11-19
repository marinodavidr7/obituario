import { useEffect, useRef, useState } from "react";
import Link from "@/components/Link";
import { normalizarUrlImagen } from "@/lib/imageUrl";

import Altar from "@/components/Altar";
import CompartirHomenaje from "@/components/CompartirHomenaje";
import Dedicatorias from "@/components/Dedicatorias";
import EscudoPolicia from "@/components/EscudoPolicia";
import Gallery from "@/components/Gallery";
import SubirFotoFamiliar from "@/components/SubirFotoFamiliar";
import Videos from "@/components/Videos";
import { PersonaViewSkeleton } from "@/components/Skeleton";
import PersonaAudioWatcher from "@/components/PersonaAudioWatcher";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/toast";
import { applySoulTheme, clearSoulTheme, getGeneralSanctuaryTheme } from "@/lib/theme";
import { addVisita, deletePersona, esPerfilPolicial, getDecoracionPersona, getFamilia, getPersona, getVinculosPersona, listDedicatorias, listPersonas, personasSelectColumns } from "@/lib/db";
import BiografiaLiteraria from "@/components/BiografiaLiteraria";
import { getDecoracionInfo } from "@/lib/decoraciones";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAdmin } from "@/lib/auth";
import { navigate } from "@/lib/router";
import {
  calcularCumpleanos,
  calcularTiempoDesdePartida,
  extractYouTubeId,
  iniciales,
  parseFechasVida,
} from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";
import type { Dedicatoria, Familia, Persona } from "@/types";

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="flex items-center gap-3 text-[11px] font-medium tracking-[0.3em] uppercase text-gold mb-4">
      <span>{children}</span>
      <span className="flex-1 h-px bg-gradient-to-r from-gold/30 to-transparent" />
    </h4>
  );
}

export default function PersonaView({ id }: { id: string }) {
  const toast = useToast();

  const getPersonaSync = (targetId: string): Persona | null => {
    let p = getPersona(targetId);
    if (!p) {
      const decoded = decodeURIComponent(targetId || "");
      if (decoded !== targetId) {
        p = getPersona(decoded);
      }
    }
    if (!p) return null;
    return {
      ...p,
      datos: Array.isArray(p.datos) ? p.datos : [],
      galeria: Array.isArray(p.galeria) ? p.galeria : [],
      videos: Array.isArray(p.videos) ? p.videos : [],
      velas: Number(p.velas) || 0,
      flores: Number(p.flores) || 0,
      visitas: Number(p.visitas) || 0,
    };
  };

  const getFamiliaSync = (p: Persona | null): Familia => {
    if (!p) {
      return {
        id: "familia",
        apellido: "Familia",
        lema: null,
        total: 1,
        velas: 0,
        flores: 0,
        fotos: [],
      };
    }
    const f = getFamilia(p.familia_id);
    if (f) return f;
    return {
      id: p.familia_id || "familia",
      apellido: p.nombre?.split(" ").slice(-1)[0] || "Familia",
      lema: null,
      total: 1,
      velas: Number(p.velas) || 0,
      flores: Number(p.flores) || 0,
      fotos: p.foto ? [p.foto] : [],
    };
  };

  const [persona, setPersona] = useState<Persona | null>(() => getPersonaSync(id));
  const [familia, setFamilia] = useState<Familia>(() => getFamiliaSync(getPersonaSync(id)));
  const [hermanos, setHermanos] = useState<Persona[]>(() => {
    const p = getPersonaSync(id);
    if (!p) return [];
    const h = listPersonas(p.familia_id);
    return h.length > 0 ? h : [p];
  });
  const [dedicatorias, setDedicatorias] = useState<Dedicatoria[]>(() => listDedicatorias(id));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [cargando, setCargando] = useState<boolean>(() => !getPersonaSync(id));
  const esAdmin = useAdmin();

  // Swipe horizontal en móvil para navegar entre lápidas de familiares (declarados en el top level)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);

  useEffect(() => {
    const handleAudioState = (e: Event) => {
      const custom = e as CustomEvent<{ isPlaying: boolean }>;
      if (typeof custom.detail?.isPlaying === "boolean") {
        setIsAudioPlaying(custom.detail.isPlaying);
      }
    };
    window.addEventListener("panteon:audio-state", handleAudioState);
    return () => window.removeEventListener("panteon:audio-state", handleAudioState);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function cargarSerQuerido() {
      let p = getPersona(id);

      // Si no está en caché inmediato, buscar decodificando o consultando Supabase
      if (!p) {
        const decoded = decodeURIComponent(id || "");
        if (decoded !== id) {
          p = getPersona(decoded);
        }
      }

      if (!p && isSupabaseConfigured) {
        try {
          const cols = await personasSelectColumns();
          const { data } = await supabase.from("personas").select(cols).eq("id", id).maybeSingle();
          if (data && !isCancelled) {
            p = data as any;
          }
        } catch (e) {
          console.warn("[PersonaView] Error consultando persona en Supabase:", e);
        }
      }

      if (isCancelled) return;
      setCargando(false);

      if (!p) {
        setPersona(null);
        return;
      }

      const pNormalizado: Persona = {
        ...p,
        datos: Array.isArray(p.datos) ? p.datos : [],
        galeria: Array.isArray(p.galeria) ? p.galeria : [],
        videos: Array.isArray(p.videos) ? p.videos : [],
        velas: Number(p.velas) || 0,
        flores: Number(p.flores) || 0,
        visitas: Number(p.visitas) || 0,
      };

      setPersona(pNormalizado);

      // Aplicar el color sagrado asignado a este ser querido (o paleta institucional si es Policía Nacional)
      const policialInfo = esPerfilPolicial(pNormalizado);
      const colorDestino = policialInfo.es_policia
        ? "policia-nacional"
        : p.color && p.color !== "default"
        ? p.color
        : getGeneralSanctuaryTheme();
      applySoulTheme(colorDestino);

      let f = getFamilia(p.familia_id);
      if (!f) {
        f = {
          id: p.familia_id || "familia",
          apellido: p.nombre?.split(" ").slice(-1)[0] || "Familia",
          lema: null,
          total: 1,
          velas: p.velas || 0,
          flores: p.flores || 0,
          fotos: p.foto ? [p.foto] : [],
        };
      }
      setFamilia(f);

      const h = listPersonas(p.familia_id);
      setHermanos(h.length > 0 ? h : [pNormalizado]);

      const d = listDedicatorias(p.id);
      setDedicatorias(Array.isArray(d) ? d : []);
    }

    cargarSerQuerido();
    addVisita(id);

    // Escuchar actualizaciones de db (por ej. sincro de Supabase o nuevas ofrendas)
    const onDbUpdate = () => {
      cargarSerQuerido();
    };
    window.addEventListener("panteon:db-updated", onDbUpdate);

    return () => {
      isCancelled = true;
      window.removeEventListener("panteon:db-updated", onDbUpdate);
      // Restaurar el color general del santuario al salir de la ficha del difunto
      clearSoulTheme();
    };
  }, [id]);

  if (cargando && !persona) {
    return <PersonaViewSkeleton />;
  }

  if (!persona) {
    return (
      <div className="py-24 text-center">
        <p className="font-serif text-2xl text-stone-300 mb-4">Ser querido no encontrado en el santuario.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gold/40 text-gold-soft text-xs uppercase tracking-widest"
        >
          Volver al Santuario
        </Link>
      </div>
    );
  }

  const p = persona;
  const fam = familia || getFamiliaSync(p);
  const idx = hermanos.findIndex((x) => x.id === p.id);
  const hasMultipleHermanos = idx >= 0 && hermanos.length > 1;
  const prev = hasMultipleHermanos ? hermanos[(idx - 1 + hermanos.length) % hermanos.length] : null;
  const next = hasMultipleHermanos ? hermanos[(idx + 1) % hermanos.length] : null;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      setSwipeOffset(0);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - touchStartY.current;

    // Resistencia elástica solo si el movimiento es predominantemente horizontal
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      setSwipeOffset(Math.max(-60, Math.min(60, diffX * 0.4)));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    touchStartX.current = null;
    touchStartY.current = null;
    setSwipeOffset(0);

    // Umbral de 50px con predominancia horizontal para no interferir con scroll vertical
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.35) {
      if (diffX < 0 && next && next.id !== p.id) {
        // Deslizar hacia la izquierda -> Siguiente familiar
        triggerHaptic("selection");
        navigate(`/persona/${next.id}`);
      } else if (diffX > 0 && prev && prev.id !== p.id) {
        // Deslizar hacia la derecha -> Anterior familiar
        triggerHaptic("selection");
        navigate(`/persona/${prev.id}`);
      }
    }
  };

  const navBtn =
    "w-9 h-9 rounded-full bg-stone-950/80 border border-white/15 hover:border-gold/50 text-stone-300 hover:text-gold-soft grid place-items-center active:scale-90 transition-transform";

  return (
    <article
      className="fade-enter pt-3 sm:pt-6 pb-20 w-full mx-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Reproductor automático para la música asignada a este ser querido */}
      <PersonaAudioWatcher musica={p.musica} titulo={p.musica_titulo} nombre={p.nombre} />

      <div className="flex items-center justify-between gap-2 mb-5 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href={`/familia/${fam.id}`}
            className="inline-flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs tracking-[0.16em] sm:tracking-[0.22em] uppercase text-stone-400 hover:text-gold-soft border border-white/10 hover:border-gold/40 bg-stone-900/60 rounded-full px-3.5 sm:px-5 py-2 sm:py-2.5 active:scale-95 transition-all truncate"
          >
            <span>←</span> <span className="truncate">Familia {fam.apellido}</span>
          </Link>
          {esAdmin && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href={`/admin/editar/${p.id}`}
                className="inline-flex items-center gap-1 text-[11px] sm:text-xs tracking-[0.16em] uppercase text-gold-soft border border-gold/40 hover:border-gold hover:bg-gold/15 bg-gold/5 rounded-full px-3 sm:px-4 py-2 sm:py-2.5 active:scale-95 transition-all shrink-0"
              >
                <span>✎</span> Editar
              </Link>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] sm:text-xs tracking-[0.16em] uppercase text-rose-300 border border-rose-500/40 hover:bg-rose-500/20 bg-rose-950/30 rounded-full px-3 sm:px-4 py-2 sm:py-2.5 active:scale-95 transition-all shrink-0"
              >
                <span>🗑️</span> Eliminar
              </button>
            </div>
          )}
        </div>
        {hasMultipleHermanos && prev && next && (
          <div className="flex gap-1.5 sm:gap-2 shrink-0">
            <Link href={`/persona/${prev.id}`} title="Anterior familiar" className={navBtn}>
              ‹
            </Link>
            <Link href={`/persona/${next.id}`} title="Siguiente familiar" className={navBtn}>
              ›
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,28%)_1fr] xl:grid-cols-[380px_1fr] 2xl:grid-cols-[440px_1fr] gap-6 sm:gap-8 xl:gap-12 2xl:gap-16 items-start">
        <aside className="lg:sticky lg:top-24 min-w-0">
          {(() => {
            const policial = esPerfilPolicial(p);
            const dec = getDecoracionInfo(getDecoracionPersona(p.id));
            return (
              <div
                className={`relative w-56 xs:w-64 sm:w-60 lg:w-72 xl:w-80 2xl:w-[350px] mx-auto ${
                  policial.es_policia ? "mt-6 sm:mt-4" : ""
                }`}
              >
                {policial.es_policia && (
                  <div className="absolute -top-4 inset-x-0 z-20 flex justify-center pointer-events-none">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#181e24]/90 border border-[#d4af37]/55 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.65)] whitespace-nowrap w-max select-none">
                      <EscudoPolicia className="w-5 h-5 shrink-0" />
                      <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.2em] text-[#e6c770] leading-none">
                        Policía Nacional RD
                      </span>
                    </div>
                  </div>
                )}
                <div
                  style={{
                    transform: `translateX(${swipeOffset}px)`,
                    transition: swipeOffset === 0 ? "transform 250ms ease-out" : "none",
                  }}
                  className={`w-full aspect-[3/4] rounded-t-[130px] xs:rounded-t-[150px] sm:rounded-t-[140px] xl:rounded-t-[180px] rounded-b-2xl overflow-hidden border-2 ${
                    policial.es_policia ? "border-[#d4af37]/75" : "border-gold/50"
                  } bg-gradient-to-b from-[#2b323b] to-[#11151a] shadow-2xl grid place-items-center relative`}
                >
                  {p.foto ? (
                    <img
                      src={normalizarUrlImagen(p.foto, 900)}
                      alt={`Retrato de ${p.nombre}`}
                      style={{ objectPosition: p.foto_pos || "50% 20%" }}
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                      className={`w-full h-full object-cover ${
                        policial.es_policia || p.foto.toLowerCase().includes(".gif") ? "" : "grayscale-[20%]"
                      } contrast-105 transition-opacity duration-300`}
                    />
                  ) : (
                    <span className="font-serif text-5xl sm:text-6xl text-gold/80">{iniciales(p.nombre)}</span>
                  )}
                  <div className="absolute inset-0 shadow-[inset_0_-60px_60px_-25px_rgba(0,0,0,0.8)] pointer-events-none" />
                  {policial.es_policia ? (
                    <span className="absolute bottom-3.5 right-3.5 z-20 w-12 h-12 rounded-full bg-[#0a121f]/85 border border-[#d4af37]/75 backdrop-blur-md grid place-items-center shadow-xl pointer-events-none">
                      <EscudoPolicia className="w-8 h-8" />
                    </span>
                  ) : dec.id !== "ninguna" ? (
                    <>
                      <span className="absolute top-3 left-3 w-8 h-8 rounded-full bg-stone-950/80 border border-gold/40 backdrop-blur-sm grid place-items-center text-base shadow-lg pointer-events-none">
                        {dec.cornerIcons[0]}
                      </span>
                      <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-stone-950/80 border border-gold/40 backdrop-blur-sm grid place-items-center text-base shadow-lg pointer-events-none">
                        {dec.cornerIcons[1]}
                      </span>
                      <span className="absolute bottom-3 left-3 w-8 h-8 rounded-full bg-stone-950/80 border border-gold/40 backdrop-blur-sm grid place-items-center text-base shadow-lg pointer-events-none">
                        {dec.cornerIcons[2]}
                      </span>
                      <span className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-stone-950/80 border border-gold/40 backdrop-blur-sm grid place-items-center text-base shadow-lg pointer-events-none">
                        {dec.cornerIcons[3]}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })()}

          {/* Indicador visual de swipe táctil en móvil */}
          {hasMultipleHermanos && prev && next && (
            <div className="flex sm:hidden items-center justify-between text-[11px] text-stone-400 mt-3 px-3 py-1.5 rounded-full bg-stone-900/70 border border-white/10 select-none max-w-[280px] mx-auto shadow-sm">
              <Link
                href={`/persona/${prev.id}`}
                className="flex items-center gap-1 text-gold-soft active:scale-95 py-0.5"
                aria-label={`Anterior familiar: ${prev.nombre || ""}`}
              >
                <span>‹</span>
                <span className="truncate max-w-[85px]">{prev.nombre ? prev.nombre.split(" ")[0] : ""}</span>
              </Link>
              <span className="text-[10px] text-stone-400 uppercase tracking-widest flex items-center gap-1 font-sans">
                <span>↔</span> Desliza
              </span>
              <Link
                href={`/persona/${next.id}`}
                className="flex items-center gap-1 text-gold-soft active:scale-95 py-0.5"
                aria-label={`Siguiente familiar: ${next.nombre || ""}`}
              >
                <span className="truncate max-w-[85px]">{next.nombre ? next.nombre.split(" ")[0] : ""}</span>
                <span>›</span>
              </Link>
            </div>
          )}

          <div className="text-center pt-5 sm:pt-6">
            <div className="flex flex-wrap items-center justify-center gap-2.5 mb-1.5">
              <span className="text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.28em] text-gold/85">
                {esPerfilPolicial(p).es_policia
                  ? "En honor al servicio y la patria"
                  : `Obituario de la Familia ${fam.apellido}`}
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl text-[#f4f1eb] tracking-wide leading-tight">
              {p.nombre}
            </h1>
            {(() => {
              const policial = esPerfilPolicial(p);
              const dec = getDecoracionInfo(getDecoracionPersona(p.id));
              if (policial.es_policia) {
                return (
                  <div className="mt-2.5 flex justify-center">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.06em] px-4 py-1.5 rounded-full border border-[#d4af37]/45 bg-[#1b2126]/85 text-[#e6c770] shadow-[0_0_15px_rgba(212,175,55,0.12)]">
                      <span>🛡️</span>
                      <span>
                        {policial.rango
                          ? `Policía Nacional • ${policial.rango}`
                          : "Policía Nacional • Guardia de Honor"}
                      </span>
                    </span>
                  </div>
                );
              }
              if (dec.id === "ninguna") return null;
              return (
                <div className="mt-2 flex justify-center">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] px-3 py-1 rounded-full border ${dec.accentClass}`}
                  >
                    <span>{dec.icon}</span>
                    <span>{dec.badgeText}</span>
                  </span>
                </div>
              );
            })()}
            {p.apodo && <p className="text-xs sm:text-sm italic text-gold mt-1">«{p.apodo}»</p>}
            {p.fechas && (
              <div className="inline-flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs tracking-[0.1em] text-stone-300 mt-2.5 sm:mt-3 px-3.5 sm:px-4 py-1.5 rounded-full border border-white/10 bg-stone-950/50">
                ✦ {p.fechas}
              </div>
            )}
            {(() => {
              const { nacimiento, partida } = parseFechasVida(p.fechas);
              const tiempo = partida ? calcularTiempoDesdePartida(partida) : null;
              const cumple = nacimiento ? calcularCumpleanos(nacimiento) : null;
              if (!tiempo && !cumple) return null;
              return (
                <div className="mt-2.5 flex flex-col items-center gap-2">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {tiempo && (
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full border ${
                          tiempo.esAniversarioHoy
                            ? "border-amber-400/50 bg-amber-500/15 text-amber-200 font-medium"
                            : "border-white/10 bg-stone-900/70 text-stone-300"
                        }`}
                      >
                        <span>{tiempo.esAniversarioHoy ? "🕯️" : "🕊️"}</span>
                        <span>
                          {tiempo.esAniversarioHoy
                            ? `Hoy se cumplen ${tiempo.anios} ${tiempo.anios === 1 ? "año" : "años"} de su partida`
                            : `${tiempo.texto} de su partida`}
                        </span>
                      </span>
                    )}
                    {cumple && !cumple.esHoy && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full border border-white/10 bg-stone-900/70 text-stone-300">
                        <span>🎂</span>
                        <span>
                          Natalicio: {cumple.fechaTexto} ·{" "}
                          {cumple.diasRestantes === 1
                            ? "mañana"
                            : `en ${cumple.diasRestantes} días`}
                        </span>
                      </span>
                    )}
                  </div>
                  {cumple?.esHoy && (
                    <div className="w-full rounded-xl border border-gold/45 bg-gradient-to-r from-amber-500/15 via-gold/15 to-amber-500/15 px-3.5 py-2.5 text-xs text-gold-soft shadow-[0_0_20px_rgba(201,168,106,0.2)]">
                      🎂✨ <b>Hoy celebramos su cumpleaños en memoria</b> ({cumple.edadCumpliria} años). Enciende una vela o déjale una dedicatoria especial.
                    </div>
                  )}
                </div>
              );
            })()}
            {p.epitafio && (
              <blockquote style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }} className="text-[15px] sm:text-[17px] font-normal leading-relaxed tracking-wide text-[#f3e6cb] mt-3.5 sm:mt-4 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-gold/15">
                “{p.epitafio}”
              </blockquote>
            )}
            {p.musica && (
              <div className="mt-3 flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("panteon:toggle-play"));
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold/40 hover:border-gold/70 bg-gold/10 hover:bg-gold/20 text-gold-soft text-xs shadow-[0_0_15px_rgba(201,168,106,0.15)] active:scale-95 transition-all cursor-pointer group"
                  title={isAudioPlaying ? "Pausar música" : "Reproducir música"}
                  aria-label={isAudioPlaying ? "Pausar música" : "Reproducir música"}
                >
                  <span className="text-xs text-gold flex items-center justify-center w-4 h-4 rounded-full bg-gold/20 group-hover:bg-gold/30">
                    {isAudioPlaying ? "❚❚" : "▶"}
                  </span>
                  <span className="font-serif italic">
                    {p.musica_titulo ? `Música en su memoria: «${p.musica_titulo}»` : "Música en su memoria"}
                  </span>
                  {extractYouTubeId(p.musica) && (
                    <span className="text-[10px] uppercase font-sans tracking-wider text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded-full">
                      YouTube
                    </span>
                  )}
                </button>
                {p.track_activo_info && p.track_activo_info.total > 1 && (
                  <span className="text-[10px] text-stone-400 font-sans tracking-wider flex items-center gap-1.5 bg-stone-900/60 px-2.5 py-0.5 rounded-full border border-white/5">
                    <span className="text-gold text-xs">🔄</span>
                    <span>
                      Semana {p.track_activo_info.indice + 1} de {p.track_activo_info.total}
                    </span>
                    <span>·</span>
                    <span className="text-amber-300/90">
                      Vence en {p.track_activo_info.diasRestantes}{" "}
                      {p.track_activo_info.diasRestantes === 1 ? "día" : "días"}
                    </span>
                    {p.track_activo_info.proximoTitulo && (
                      <>
                        <span>·</span>
                        <span className="text-stone-400 truncate max-w-[140px]">
                          Próxima: {p.track_activo_info.proximoTitulo}
                        </span>
                      </>
                    )}
                  </span>
                )}
              </div>
            )}
            {p.bio && <BiografiaLiteraria bio={p.bio} />}
            <CompartirHomenaje
              personaId={p.id}
              nombre={p.nombre}
              anios={p.anios}
              familiaApellido={fam.apellido}
            />
          </div>

          {Array.isArray(p.datos) && p.datos.length > 0 && (
            <section className="mt-6 sm:mt-8">
              <Titulo>Semblanza y Raíces</Titulo>
              <dl style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }} className="divide-y divide-white/[0.06] border border-gold/15 rounded-2xl overflow-hidden bg-[#0b0e12]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                {p.datos.map((item, idx) => {
                  const k = Array.isArray(item) ? item[0] : (item as any)?.k;
                  const v = Array.isArray(item) ? item[1] : (item as any)?.v;
                  if (!k || !v) return null;
                  return (
                    <div
                      key={k + idx}
                      className="grid grid-cols-[110px_1fr] sm:grid-cols-[150px_1fr] gap-3 sm:gap-5 px-4 py-3 sm:px-5 sm:py-3.5 items-baseline"
                    >
                      <dt className="text-[9px] sm:text-[10px] tracking-[0.22em] uppercase text-gold-soft/75 leading-snug">
                        {k}
                      </dt>
                      <dd className="text-[13px] sm:text-[15px] text-stone-100 font-light leading-snug break-words">
                        {v}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          )}

          {(() => {
            const vinculos = getVinculosPersona(p.id)
              .map((v) => ({ ...v, persona: getPersona(v.persona_id) }))
              .filter((v): v is { persona_id: string; relacion: string; persona: Persona } =>
                Boolean(v.persona && (v.persona.estado === "publicado" || !v.persona.estado))
              );
            if (vinculos.length === 0) return null;
            return (
              <section className="mt-6 sm:mt-8">
                <Titulo>Árbol de Memorias</Titulo>
                <div className="space-y-2">
                  {vinculos.map((v) => (
                    <Link
                      key={`${v.persona_id}-${v.relacion}`}
                      href={`/persona/${v.persona.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-white/10 hover:border-gold/45 bg-stone-900/60 hover:bg-stone-900 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-gold/30 bg-stone-950 shrink-0 grid place-items-center text-xs font-serif text-gold">
                        {v.persona.foto ? (
                          <img
                            src={normalizarUrlImagen(v.persona.foto, 96)}
                            alt={v.persona.nombre}
                            style={{ objectPosition: v.persona.foto_pos || "50% 20%" }}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          iniciales(v.persona.nombre)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="inline-block text-[9px] uppercase tracking-[0.18em] text-gold-soft bg-gold/10 border border-gold/25 px-2 py-0.5 rounded-full mb-0.5">
                          {v.relacion}
                        </span>
                        <p className="text-xs sm:text-sm font-serif text-stone-100 group-hover:text-gold-soft truncate">
                          {v.persona.nombre}
                        </p>
                        <p className="text-[10px] text-stone-400">{v.persona.anios}</p>
                      </div>
                      <span className="text-stone-500 group-hover:text-gold text-xs pr-1">→</span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })()}
        </aside>

        <div className="min-w-0 space-y-6 sm:space-y-9">
          <section>
            <Titulo>Álbum de Recuerdos ({p.galeria.length})</Titulo>
            {p.galeria.length > 0 ? (
              <Gallery fotos={p.galeria} nombre={p.nombre} />
            ) : (
              <p className="text-xs text-stone-500 italic">
                Aún no hay fotografías en el álbum. Los familiares pueden compartir recuerdos para aprobación.
              </p>
            )}
            <SubirFotoFamiliar personaId={p.id} personaNombre={p.nombre} />
          </section>
          {p.videos.length > 0 && (
            <section>
              <Videos videos={p.videos} nombre={p.nombre} />
            </section>
          )}
          <Altar
            personaId={p.id}
            velas={p.velas}
            flores={p.flores}
            visitas={p.visitas}
            floresTipos={p.flores_tipos}
            nombre={p.nombre}
            esPolicia={esPerfilPolicial(p).es_policia}
            honores={esPerfilPolicial(p).honores}
          />
          <section>
            <Titulo>Libro de Recuerdos y Dedicatorias</Titulo>
            <Dedicatorias personaId={p.id} nombre={p.nombre} inicial={dedicatorias} esAdmin={esAdmin} />
          </section>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title={`¿Eliminar a ${p.nombre}?`}
        message={`Esta acción borrará permanentemente la lápida de ${p.nombre}, junto con todas sus fotografías, recuerdos, dedicatorias y ofrendas en Supabase.`}
        confirmText="Sí, Eliminar Definitivamente"
        onConfirm={async () => {
          const res = await deletePersona(p.id);
          setConfirmOpen(false);
          if (res.error) {
            toast(`Aviso: ${res.error}`, "warning");
          } else {
            toast(`${p.nombre} ha sido eliminado de la base de datos`, "delete");
          }
          navigate("/");
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </article>
  );
}
