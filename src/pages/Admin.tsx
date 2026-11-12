import { useEffect, useState } from "react";
import Link from "@/components/Link";
import ConfirmModal from "@/components/ConfirmModal";
import ColorPickerGrid from "@/components/ColorPickerGrid";
import { useToast } from "@/components/toast";
import { loginAdmin, logoutAdmin, useAdmin } from "@/lib/auth";
import { getGeneralSanctuaryTheme, setGeneralSanctuaryTheme, THEMES, type ThemeId } from "@/lib/theme";
import {
  aprobarPersona,
  deleteDedicatoria,
  deleteFamilia,
  deletePersona,
  getConfig,
  listFamilias,
  listPersonas,
  listSolicitudesPendientes,
  listTodasDedicatorias,
  rechazarPersona,
  setConfig,
  stats,
} from "@/lib/db";
import { getTelegramConfig, guardarTelegramConfig, probarTelegram, verificarBotTelegram } from "@/lib/telegram";
import { guardarArchivo } from "@/lib/uploads";
import { iniciales } from "@/lib/utils";
import type { Dedicatoria, Familia, Persona, SanctuaryStats } from "@/types";

const pill =
  "px-4 sm:px-5 py-2.5 sm:py-2 rounded-full text-[11px] uppercase tracking-[0.18em] active:scale-95 transition-all text-center";

export default function Admin() {
  const authed = useAdmin();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const closeConfirm = () => setConfirmState((prev) => ({ ...prev, open: false }));

  const [familias, setFamilias] = useState<(Familia & { total: number; velas: number; flores: number; fotos: string[] })[]>([]);
  const [dedicatorias, setDedicatorias] = useState<(Dedicatoria & { persona_nombre: string })[]>([]);
  const [solicitudes, setSolicitudes] = useState<(Persona & { familia_apellido: string })[]>([]);
  const [s, setStats] = useState<SanctuaryStats>({ almas: 0, familias: 0, velas: 0, flores: 0, visitas: 0 });

  const [musicaGeneralUrl, setMusicaGeneralUrl] = useState<string>("");
  const [musicaGeneralTitulo, setMusicaGeneralTitulo] = useState<string>("");
  const [musicaVolumen, setMusicaVolumen] = useState<number>(() => {
    const v = parseInt(getConfig("musica_volumen") || "70", 10);
    return isNaN(v) ? 70 : v;
  });
  const [musicaGuardada, setMusicaGuardada] = useState(false);
  const [musicaBorrada, setMusicaBorrada] = useState(false);
  const [temaGeneral, setTemaGeneral] = useState<ThemeId>(getGeneralSanctuaryTheme);

  const [telegramToken, setTelegramToken] = useState<string>(() => getTelegramConfig().token);
  const [telegramChatId, setTelegramChatId] = useState<string>(() => getTelegramConfig().chatId);
  const [telegramBotInfo, setTelegramBotInfo] = useState<{ username?: string; firstName?: string } | null>(null);
  const [probandoTelegram, setProbandoTelegram] = useState(false);
  const [guardandoTelegram, setGuardandoTelegram] = useState(false);

  const refreshData = () => {
    setFamilias(listFamilias());
    setDedicatorias(listTodasDedicatorias(30));
    setSolicitudes(listSolicitudesPendientes());
    setStats(stats());
    setMusicaGeneralUrl(getConfig("musica_general_url") || "");
    setMusicaGeneralTitulo(getConfig("musica_general_titulo") || "");
    const v = parseInt(getConfig("musica_volumen") || "70", 10);
    setMusicaVolumen(isNaN(v) ? 70 : v);
    setTemaGeneral(getGeneralSanctuaryTheme());
    setTelegramToken(getTelegramConfig().token);
    setTelegramChatId(getTelegramConfig().chatId);
  };

  const handleCambiarTemaGeneral = (nuevoTema: ThemeId) => {
    setTemaGeneral(nuevoTema);
    setGeneralSanctuaryTheme(nuevoTema);
    const info = THEMES.find((t) => t.id === nuevoTema);
    toast(`Color general del obituario actualizado a "${info?.label || nuevoTema}"`, "success");
  };

  useEffect(() => {
    if (authed) {
      refreshData();
      window.addEventListener("panteon:db-updated", refreshData);
      return () => window.removeEventListener("panteon:db-updated", refreshData);
    }
  }, [authed]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setErrorMsg(null);
    try {
      const res = await loginAdmin(email, password);
      if (!res.ok) {
        setErrorMsg(res.error || "Credenciales incorrectas.");
      }
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarMusica = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const url = String(fd.get("musica_general_url") || "").trim();
    const titulo = String(fd.get("musica_general_titulo") || "").trim();
    const file = fd.get("musica_general_archivo") as File | null;
    const vol = parseInt(String(fd.get("musica_volumen") || "70"), 10);
    const finalVol = isNaN(vol) ? 70 : Math.min(100, Math.max(0, vol));

    let finalUrl = url;
    if (file && file.size > 0) {
      const uploaded = await guardarArchivo(file);
      if (uploaded) finalUrl = uploaded;
    }

    setConfig("musica_general_url", finalUrl || null);
    setConfig("musica_general_titulo", finalUrl ? (titulo || "Música del Santuario") : null);
    setConfig("musica_volumen", String(finalVol));
    setMusicaGeneralUrl(finalUrl);
    setMusicaGeneralTitulo(titulo);
    setMusicaVolumen(finalVol);
    setMusicaGuardada(true);
    setTimeout(() => setMusicaGuardada(false), 3000);
    window.dispatchEvent(new Event("panteon:db-updated"));
    toast(`Música y volumen maestro configurados al ${finalVol}%`, "success");
  };

  const handleBorrarMusica = () => {
    setConfig("musica_general_url", null);
    setConfig("musica_general_titulo", null);
    setMusicaGeneralUrl("");
    setMusicaGeneralTitulo("");
    setMusicaBorrada(true);
    setTimeout(() => setMusicaBorrada(false), 3000);
    window.dispatchEvent(new Event("panteon:db-updated"));
  };

  useEffect(() => {
    if (telegramToken && telegramToken.trim()) {
      verificarBotTelegram(telegramToken).then((res) => {
        if (res.ok) {
          setTelegramBotInfo({ username: res.username, firstName: res.firstName });
        } else {
          setTelegramBotInfo(null);
        }
      });
    } else {
      setTelegramBotInfo(null);
    }
  }, [telegramToken]);

  const handleGuardarTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoTelegram(true);
    try {
      guardarTelegramConfig(telegramToken, telegramChatId);
      window.dispatchEvent(new Event("panteon:db-updated"));
      toast("Configuración del Bot de Telegram guardada correctamente.", "success");
    } finally {
      setGuardandoTelegram(false);
    }
  };

  const handleProbarTelegram = async () => {
    if (!telegramToken.trim()) {
      toast("Ingresa el Bot Token primero", "error");
      return;
    }
    if (!telegramChatId.trim()) {
      toast("Ingresa el Chat ID donde deseas recibir los mensajes", "error");
      return;
    }
    setProbandoTelegram(true);
    try {
      const res = await probarTelegram(telegramToken, telegramChatId);
      if (res.ok) {
        toast("🕊️ ¡Mensaje enviado con éxito a Telegram! Revisa tu chat.", "success");
      } else {
        toast(`Error de Telegram: ${res.error}`, "error");
      }
    } finally {
      setProbandoTelegram(false);
    }
  };

  if (!authed) {
    return (
      <section className="fade-enter max-w-sm mx-auto pt-16 sm:pt-28 text-center px-4 pb-20">
        <span className="text-gold text-2xl">✦</span>
        <h1 className="font-serif text-3xl text-stone-100 mt-3 mb-1">Administrar Obituario</h1>
        <p className="text-xs text-stone-400 mb-6">
          Acceso reservado con autenticación segura de Supabase.
        </p>
        <form onSubmit={handleLogin} className="space-y-3.5 text-left">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-stone-400 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="correo@ejemplo.com"
              className="w-full bg-stone-900/80 border border-white/15 focus:border-gold rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-stone-400 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              placeholder="••••••••"
              className="w-full bg-stone-900/80 border border-white/15 focus:border-gold rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 leading-snug">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className={`${pill} w-full py-3 bg-gold/20 hover:bg-gold/30 border border-gold/60 text-gold-soft font-medium mt-2 disabled:opacity-50`}
          >
            {cargando ? "Iniciando sesión..." : "Entrar al Panel"}
          </button>
        </form>
      </section>
    );
  }

  const telegramConfig = getTelegramConfig();
  const cards = [
    { k: "Familias", v: familias.length, i: "✦" },
    { k: "Almas", v: s.almas, i: "◈" },
    { k: "Pendientes", v: solicitudes.length, i: "🕊️" },
    { k: "Velas", v: s.velas, i: "🕯️" },
    { k: "Flores", v: s.flores, i: "🌹" },
  ];

  return (
    <section className="fade-enter pt-3 sm:pt-10 pb-24 w-full max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-gold block">Panel de cuidado</span>
          <h1 className="font-serif font-light text-3xl sm:text-5xl tracking-[0.06em] text-[#f2efe9] mt-1">
            Administrar el obituario
          </h1>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-3">
          <Link
            href="/"
            className={`${pill} border border-white/10 text-stone-300 hover:text-gold-soft hover:border-gold/40`}
          >
            Ver sitio
          </Link>
          <Link
            href="/admin/nueva"
            className={`${pill} bg-gold/20 hover:bg-gold/30 border border-gold/60 text-gold-soft font-medium`}
          >
            + Inscribir
          </Link>
          <button
            onClick={() => logoutAdmin()}
            className={`${pill} w-full sm:w-auto border border-white/10 text-stone-400 hover:text-white col-span-2 sm:col-auto`}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* 1. SECCIÓN DESTACADA: SOLICITUDES DE FAMILIARES PENDIENTES */}
      {solicitudes.length > 0 && (
        <div className="mt-8 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/10 via-stone-900/80 to-stone-900/90 p-5 sm:p-6 shadow-[0_0_35px_rgba(245,158,11,0.15)] animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-amber-500/20">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 grid place-items-center text-base">
                🕊️
              </span>
              <div>
                <h2 className="font-serif text-2xl text-[#fbf8f0]">
                  Solicitudes Pendientes de Aprobación ({solicitudes.length})
                </h2>
                <p className="text-xs text-amber-200/80">
                  Familiares que han inscrito a un ser querido. Puedes corregir los datos o aprobar la publicación.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
              Requiere tu visto bueno
            </span>
          </div>

          <div className="divide-y divide-white/10 mt-2">
            {solicitudes.map((p) => (
              <div key={p.id} className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-full border border-gold/40 bg-stone-950 overflow-hidden shrink-0">
                    {p.foto ? (
                      <img
                        src={p.foto}
                        alt=""
                        style={{ objectPosition: p.foto_pos || "50% 20%" }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center font-serif text-lg text-gold/80">
                        {iniciales(p.nombre)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="font-serif text-xl text-stone-100">{p.nombre}</h3>
                      {p.apodo && <span className="text-xs italic text-gold">«{p.apodo}»</span>}
                      <span className="text-xs text-stone-400">· Familia {p.familia_apellido}</span>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {p.anios} {p.fechas ? `(${p.fechas})` : ""}
                    </p>
                    {p.epitafio && (
                      <p className="text-xs font-serif italic text-gold-soft/90 mt-1">“{p.epitafio}”</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-400 mt-2">
                      {p.solicitante && (
                        <span className="text-amber-200/90 font-medium">✍️ Enviado por: {p.solicitante}</span>
                      )}
                      {p.contacto && <span>📞 Contacto: {p.contacto}</span>}
                      {p.fecha_solicitud && <span className="text-stone-500">· {p.fecha_solicitud}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 self-end lg:self-center shrink-0">
                  <button
                    onClick={() => {
                      aprobarPersona(p.id);
                      refreshData();
                    }}
                    className="px-4 py-2 rounded-full bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/60 text-emerald-200 text-xs font-medium uppercase tracking-wider transition-all active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  >
                    ✅ Aprobar y Publicar
                  </button>

                  <Link
                    href={`/admin/editar/${p.id}`}
                    className="px-4 py-2 rounded-full bg-gold/15 hover:bg-gold/25 border border-gold/50 text-gold-soft text-xs uppercase tracking-wider transition-all active:scale-95"
                  >
                    ✏️ Corregir Datos
                  </Link>

                  <button
                    onClick={() => {
                      setConfirmState({
                        open: true,
                        title: "Rechazar y eliminar solicitud",
                        message: `¿Estás seguro de eliminar permanentemente la solicitud de inscripción de ${p.nombre}?`,
                        onConfirm: async () => {
                          await rechazarPersona(p.id);
                          refreshData();
                          closeConfirm();
                          toast("Solicitud de inscripción eliminada definitivamente", "delete");
                        },
                      });
                    }}
                    className="px-3.5 py-2 rounded-full border border-rose-500/30 hover:bg-rose-500/15 text-rose-300 text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span>🗑️</span>
                    <span>Rechazar y Eliminar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECCIÓN: BOT DE TELEGRAM Y ALERTAS MÓVILES */}
      <div className="mt-8 rounded-2xl border border-gold/30 bg-gradient-to-b from-stone-900/90 via-stone-900/70 to-stone-950 p-5 sm:p-6 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 grid place-items-center text-lg shrink-0">
              🤖
            </span>
            <div>
              <h2 className="font-serif text-2xl text-[#f4f1eb]">Bot de Telegram para Alertas Móviles</h2>
              <p className="text-xs text-stone-400">
                Recibe una notificación inmediata en tu Telegram cada vez que alguien solicite inscribir a un familiar.
              </p>
            </div>
          </div>
          {telegramBotInfo ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 rounded-full px-3 py-1 self-start sm:self-auto">
              ✦ Bot activo: @{telegramBotInfo.username}
            </span>
          ) : telegramToken ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-300 bg-amber-950/60 border border-amber-500/40 rounded-full px-3 py-1 self-start sm:self-auto">
              ✦ Verificando bot...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-stone-400 bg-stone-800 border border-white/10 rounded-full px-3 py-1 self-start sm:self-auto">
              Sin vincular
            </span>
          )}
        </div>

        <form onSubmit={handleGuardarTelegram} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-stone-300 mb-1.5">
                Bot Token de Telegram
              </label>
              <input
                type="text"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                placeholder="Ej: 8560777329:AAEeeq..."
                className="w-full bg-stone-950/70 border border-white/10 focus:border-gold/60 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder:text-stone-600 outline-none transition-colors font-mono"
              />
              {telegramBotInfo && (
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-emerald-400">
                  <span>✓ Bot verificado:</span>
                  <a
                    href={`https://t.me/${telegramBotInfo.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-gold-soft"
                  >
                    @{telegramBotInfo.username} ({telegramBotInfo.firstName})
                  </a>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-stone-300 mb-1.5">
                Telegram Chat ID (Personal o de Grupo)
              </label>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="Ej: 123456789 o -100..."
                className="w-full bg-stone-950/70 border border-white/10 focus:border-gold/60 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder:text-stone-600 outline-none transition-colors font-mono"
              />
              <p className="mt-1 text-[11px] text-stone-400">
                El ID numérico del usuario o grupo de Telegram donde llegarán los mensajes.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-950/60 border border-white/10 text-xs text-stone-400 leading-relaxed">
            <span className="text-gold font-medium block mb-1">💡 ¿Cómo vincular tu Telegram?</span>
            <ol className="list-decimal list-inside space-y-1 text-[11px]">
              <li>
                Abre el bot{" "}
                {telegramBotInfo?.username ? (
                  <a
                    href={`https://t.me/${telegramBotInfo.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-soft underline"
                  >
                    @{telegramBotInfo.username}
                  </a>
                ) : (
                  <span className="text-stone-300 font-mono">el bot</span>
                )}{" "}
                en Telegram y presiona <b>Iniciar (/start)</b>.
              </li>
              <li>
                Para saber tu Chat ID personal, puedes escribirle a{" "}
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold-soft underline"
                >
                  @userinfobot
                </a>{" "}
                o{" "}
                <a
                  href="https://t.me/myidbot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold-soft underline"
                >
                  @myidbot
                </a>{" "}
                y copiar el número <code>Id</code> que te responde.
              </li>
              <li>Pega el Chat ID arriba, pulsa <b>Guardar Configuración</b> y haz clic en <b>Enviar Mensaje de Prueba</b>.</li>
            </ol>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={guardandoTelegram}
              className={`${pill} bg-gold/20 hover:bg-gold/30 border border-gold/60 text-gold-soft font-medium disabled:opacity-50`}
            >
              {guardandoTelegram ? "Guardando..." : "Guardar Configuración"}
            </button>

            <button
              type="button"
              onClick={handleProbarTelegram}
              disabled={probandoTelegram || !telegramToken.trim() || !telegramChatId.trim()}
              className={`${pill} bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50 text-blue-200 font-medium disabled:opacity-40 flex items-center gap-1.5`}
            >
              <span>{probandoTelegram ? "Enviando..." : "🕊️ Enviar Mensaje de Prueba"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. SECCIÓN: COLOR Y TEMA GENERAL DEL PANTEÓN (ADMINISTRADOR) */}
      <div className="mt-8 rounded-2xl border border-gold/30 bg-gradient-to-b from-gold/[0.08] via-stone-900/70 to-stone-900/90 p-5 sm:p-6 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-gold/20 text-gold grid place-items-center text-lg shrink-0">
              🎨
            </span>
            <div>
              <h2 className="font-serif text-2xl text-[#f4f1eb]">Color General del Obituario</h2>
              <p className="text-xs text-stone-400">
                Selecciona la atmósfera que envolverá todo el santuario público.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gold bg-gold/15 px-3 py-1 rounded-full border border-gold/30 self-start sm:self-auto">
            ✦ Activo: {THEMES.find((t) => t.id === temaGeneral)?.label || "Por defecto"}
          </span>
        </div>

        <ColorPickerGrid value={temaGeneral} onChange={handleCambiarTemaGeneral} />
      </div>

      {/* 3. SECCIÓN: CONFIGURACIÓN DE MÚSICA GENERAL */}
      <div className="mt-8 rounded-2xl border border-gold/30 bg-gradient-to-b from-gold/[0.08] via-stone-900/70 to-stone-900/90 p-5 sm:p-6 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-gold/20 text-gold grid place-items-center text-lg shrink-0">
              🎵
            </span>
            <div>
              <h2 className="font-serif text-2xl text-[#f4f1eb]">Música General del Obituario</h2>
              <p className="text-xs text-stone-400">
                Música de fondo que acompaña toda la plataforma (inicio, mausoleos y almas sin melodía propia).
              </p>
            </div>
          </div>
          {musicaGeneralUrl ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gold bg-gold/15 px-3 py-1 rounded-full border border-gold/30 self-start sm:self-auto">
              ✦ Melodía activa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-stone-400 bg-stone-800 px-3 py-1 rounded-full border border-white/10 self-start sm:self-auto">
              ✦ Sintetizador ambiental sagrado (Por defecto)
            </span>
          )}
        </div>

        {musicaGuardada && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <span>✓</span> Música general del obituario guardada correctamente.
          </div>
        )}
        {musicaBorrada && (
          <div className="mt-4 p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
            <span>✓</span> Se ha restablecido al sintetizador ambiental sagrado por defecto.
          </div>
        )}

        <form onSubmit={handleGuardarMusica} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-stone-300 font-medium mb-1">
                Enlace de Música (YouTube o Audio MP3)
              </label>
              <input
                type="text"
                name="musica_general_url"
                defaultValue={musicaGeneralUrl}
                placeholder="https://www.youtube.com/watch?v=... o https://.../audio.mp3"
                className="w-full bg-stone-950/80 border border-white/15 focus:border-gold rounded-xl px-4 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-stone-300 font-medium mb-1">
                Título o Nombre de la Canción
              </label>
              <input
                type="text"
                name="musica_general_titulo"
                defaultValue={musicaGeneralTitulo}
                placeholder="Ej: Humbe - Fantasmas, Réquiem Sacro..."
                className="w-full bg-stone-950/80 border border-white/15 focus:border-gold rounded-xl px-4 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-stone-300 font-medium mb-1">
              O subir archivo de música desde tu computadora / teléfono (Opcional)
            </label>
            <input
              type="file"
              name="musica_general_archivo"
              accept="audio/*"
              className="w-full bg-stone-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-stone-400 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[11px] file:bg-gold/20 file:text-gold-soft hover:file:bg-gold/30 cursor-pointer"
            />
          </div>

          {/* Control Maestro de Volumen para todo el Panteón y las Almas */}
          <div className="p-4 rounded-xl bg-stone-950/70 border border-gold/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-wider text-stone-200 font-medium flex items-center gap-2">
                <span className="text-sm">🔊</span>
                <span>Nivel de Volumen Predeterminado (Control Administrador)</span>
              </label>
              <span className="font-mono text-xs text-gold font-bold bg-gold/15 px-2.5 py-0.5 rounded-full border border-gold/40 shadow-[0_0_10px_rgba(201,168,106,0.15)]">
                {musicaVolumen}%
              </span>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              El administrador define aquí el volumen maestro con el que iniciará y se escuchará la música en toda la plataforma:
              tanto para las canciones asignadas a cada ser querido como para la música general del santuario.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-stone-500 font-mono">0%</span>
              <input
                type="range"
                name="musica_volumen"
                min="0"
                max="100"
                step="5"
                value={musicaVolumen}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setMusicaVolumen(val);
                }}
                className="flex-1 h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-gold"
              />
              <span className="text-xs text-gold font-mono">100%</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-gold/20 hover:bg-gold/30 border border-gold/60 text-gold-soft text-xs font-medium uppercase tracking-wider active:scale-95 transition-all"
            >
              Guardar Configuración de Música y Volumen
            </button>

            {musicaGeneralUrl && (
              <button
                type="button"
                onClick={handleBorrarMusica}
                className="px-4 py-2.5 rounded-full border border-rose-500/30 text-rose-300/80 hover:text-rose-200 hover:bg-rose-500/15 hover:border-rose-500/50 text-xs uppercase tracking-wider active:scale-95 transition-all"
              >
                Restablecer a Sintetizador Ambiental
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
        {cards.map((c) => (
          <div key={c.k} className="rounded-2xl border border-gold/15 bg-stone-900/60 px-5 py-4">
            <div className="flex items-center justify-between text-gold/80 text-sm">
              <span className="text-[10px] uppercase tracking-[0.25em] text-stone-400">{c.k}</span>
              <span>{c.i}</span>
            </div>
            <div className="font-serif text-4xl text-stone-100 mt-2">{c.v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
        {familias.map((f) => {
          const personas = listPersonas(f.id);
          return (
            <div key={f.id} className="rounded-2xl border border-white/10 bg-stone-900/50 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-gold/[0.07] to-transparent">
                <div>
                  <h2 className="font-serif text-2xl text-gold-soft">{f.apellido}</h2>
                  <p className="text-xs italic text-stone-400">{f.lema}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Link
                    href={`/familia/${f.id}`}
                    className="text-[10px] uppercase tracking-[0.2em] text-stone-400 hover:text-gold-soft"
                  >
                    {personas.length} almas →
                  </Link>
                  {personas.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmState({
                          open: true,
                          title: "Eliminar familia vacía",
                          message: `¿Deseas eliminar el mausoleo de la familia "${f.apellido}"?`,
                          onConfirm: async () => {
                            await deleteFamilia(f.id);
                            refreshData();
                            closeConfirm();
                            toast(`Familia ${f.apellido} eliminada`, "delete");
                          },
                        });
                      }}
                      className="px-2 py-0.5 rounded border border-rose-500/30 text-[10px] uppercase text-rose-300 hover:bg-rose-500/20"
                      title="Eliminar familia"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
              <ul className="divide-y divide-white/5">
                {personas.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="w-10 h-10 rounded-full border border-gold/40 bg-stone-950 grid place-items-center font-serif text-gold/90 text-sm shrink-0">
                      {iniciales(p.nombre)}
                    </span>
                    <Link href={`/persona/${p.id}`} className="min-w-0 flex-1 group">
                      <div className="flex items-center gap-2">
                        <span className="block text-sm text-stone-100 group-hover:text-gold-soft truncate transition-colors">
                          {p.nombre}
                        </span>
                        {p.color && p.color !== "default" && (
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0 border border-white/25 shadow-sm"
                            style={{
                              backgroundColor: THEMES.find((t) => t.id === p.color)?.dotColor || "#c9a86a",
                            }}
                            title={`Color sagrado: ${THEMES.find((t) => t.id === p.color)?.label}`}
                          />
                        )}
                      </div>
                      <span className="block text-[11px] text-stone-500 tracking-wider">
                        {p.anios}
                        {p.apodo ? ` · ${p.apodo}` : ""}
                      </span>
                    </Link>
                    <span className="hidden sm:flex items-center gap-3 text-[11px] text-stone-400">
                      <span>🕯️ {p.velas}</span>
                      <span>🌹 {p.flores}</span>
                      <span>👁️ {p.visitas}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/editar/${p.id}`}
                        className="px-3 py-1.5 rounded-full border border-gold/30 text-[10px] uppercase tracking-[0.18em] text-gold-soft hover:bg-gold/15 hover:border-gold/60 transition-colors"
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmState({
                            open: true,
                            title: `Eliminar a ${p.nombre}`,
                            message: `Esta acción borrará permanentemente la lápida, dedicatorias, fotografías y ofrendas de ${p.nombre} del obituario y de Supabase.`,
                            onConfirm: async () => {
                              const res = await deletePersona(p.id);
                              refreshData();
                              closeConfirm();
                              if (res.error) {
                                toast(`Aviso: ${res.error}`, "warning");
                              } else {
                                toast(`${p.nombre} eliminado de la base de datos`, "delete");
                              }
                            },
                          });
                        }}
                        className="px-3 py-1.5 rounded-full border border-rose-500/40 text-[10px] uppercase tracking-[0.18em] text-rose-300 hover:text-rose-100 hover:border-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all flex items-center gap-1"
                      >
                        <span>🗑️</span>
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Moderación de Libro de Recuerdos y Dedicatorias */}
      <div className="mt-10 rounded-2xl border border-white/10 bg-stone-900/50 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 border-b border-white/10 bg-gradient-to-r from-gold/[0.07] to-transparent">
          <div>
            <h2 className="font-serif text-2xl text-gold-soft">Libro de Recuerdos y Dedicatorias</h2>
            <p className="text-xs text-stone-400">
              Protección automática contra groserías y spam activa · Mostrando las últimas {dedicatorias.length}{" "}
              dedicatorias
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-emerald-300/90 bg-emerald-950/50 border border-emerald-500/30 rounded-full px-3 py-1 self-start sm:self-auto">
            ✦ Filtro activo
          </span>
        </div>

        {dedicatorias.length === 0 ? (
          <p className="px-5 py-6 text-xs italic text-stone-500">No hay dedicatorias registradas todavía.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {dedicatorias.map((d) => (
              <li
                key={d.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-serif italic text-sm text-stone-200">“{d.texto}”</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-stone-400">
                    <span className="text-gold/90 font-medium">— {d.autor}</span>
                    <span>·</span>
                    <span>
                      Para:{" "}
                      <Link
                        href={`/persona/${d.persona_id}`}
                        className="text-stone-300 hover:text-gold-soft underline"
                      >
                        {d.persona_nombre}
                      </Link>
                    </span>
                    <span>·</span>
                    <span className="text-stone-500">{d.fecha}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setConfirmState({
                      open: true,
                      title: "Eliminar dedicatoria",
                      message: `¿Deseas eliminar permanentemente la dedicatoria firmada por "${d.autor}"?`,
                      onConfirm: async () => {
                        await deleteDedicatoria(d.id);
                        refreshData();
                        closeConfirm();
                        toast("Dedicatoria eliminada", "delete");
                      },
                    });
                  }}
                  className="px-3 py-1.5 rounded-full border border-rose-400/25 text-[10px] uppercase tracking-[0.18em] text-rose-300/80 hover:text-rose-200 hover:bg-rose-500/15 hover:border-rose-400/50 transition-colors shrink-0"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal de confirmación elegante */}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />
    </section>
  );
}
