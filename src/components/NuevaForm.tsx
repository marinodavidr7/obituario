"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import ColorPickerGrid from "@/components/ColorPickerGrid";
import TerminosModal from "@/components/TerminosModal";
import FotoCropModal from "@/components/FotoCropModal";
import { extractYouTubeId, parseYouTubeStartSeconds, iniciales } from "@/lib/utils";
import type { Persona } from "@/lib/db";

type Familia = { id: string; apellido: string };

const inp = "w-full box-border bg-stone-950/70 border border-white/12 focus:border-gold/70 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-stone-100 placeholder:text-stone-400 placeholder-stone-400 focus:outline-none transition-colors";
const lab = "block text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-1.5";

function Card({ n, titulo, nota, children }: { n: string; titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="w-full rounded-2xl border border-white/10 bg-stone-900/50 p-3.5 sm:p-7 shadow-lg">
      <header className="flex items-baseline gap-3 mb-4 sm:mb-5 pb-3 border-b border-white/5">
        <span className="font-serif text-gold text-lg">{n}</span>
        <h2 className="font-serif text-xl sm:text-2xl text-stone-100">{titulo}</h2>
        {nota && <span className="text-[11px] text-stone-500 ml-auto hidden sm:block">{nota}</span>}
      </header>
      {children}
    </section>
  );
}

function useObjectUrls(files: File[]) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return urls;
}

export default function NuevaForm({
  familias,
  action,
  error,
  personaInicial,
  esPublico = false,
}: {
  familias: Familia[];
  action: (fd: FormData) => void;
  error?: string;
  personaInicial?: Persona;
  esPublico?: boolean;
}) {
  const isEditing = Boolean(personaInicial);
  const estaPendiente = personaInicial?.estado === "pendiente";
  const [familiaSeleccionada, setFamiliaSeleccionada] = useState(personaInicial?.familia_id || familias[0]?.id || "");
  const [color, setColor] = useState<string>(personaInicial?.color || "default");
  const [nombre, setNombre] = useState(personaInicial?.nombre || "");
  const [apodo, setApodo] = useState(personaInicial?.apodo || "");
  const [anios, setAnios] = useState(personaInicial?.anios || "");
  const [fechas, setFechas] = useState(personaInicial?.fechas || "");
  const [epitafio, setEpitafio] = useState(personaInicial?.epitafio || "");
  const [bio, setBio] = useState(personaInicial?.bio || "");
  const [fotoUrl, setFotoUrl] = useState(personaInicial?.foto || "");
  const [fotoFile, setFotoFile] = useState<File[]>([]);
  const [galFiles, setGalFiles] = useState<File[]>([]);
  const [galUrls, setGalUrls] = useState(personaInicial?.galeria ? personaInicial.galeria.join("\n") : "");
  const [datos, setDatos] = useState(
    personaInicial?.datos?.length
      ? personaInicial.datos.map(([k, v]) => ({ k, v }))
      : [{ k: "Nacimiento", v: "" }, { k: "Oficio", v: "" }]
  );
  const [videos, setVideos] = useState(
    personaInicial?.videos?.length
      ? personaInicial.videos.map((v) => ({ t: v.titulo, u: v.url }))
      : [{ t: "", u: "" }]
  );
  type TrackItem = { id: string; titulo: string; url: string; dias: number };

  const [rotacionTracks, setRotacionTracks] = useState<TrackItem[]>(() => {
    if (personaInicial?.musicas_rotacion && personaInicial.musicas_rotacion.length > 0) {
      return personaInicial.musicas_rotacion.map((t, idx) => ({
        id: t.id || `trk-${idx + 1}`,
        titulo: t.titulo || "",
        url: t.url || "",
        dias: Number(t.duracion_dias) || 7,
      }));
    }
    if (personaInicial?.musica) {
      return [{
        id: "trk-1",
        titulo: personaInicial.musica_titulo || "Melodía de Semana 1",
        url: personaInicial.musica,
        dias: 7,
      }];
    }
    return [
      { id: "trk-1", titulo: "", url: "", dias: 7 },
    ];
  });

  const addRotacionTrack = () => {
    const nextIdx = rotacionTracks.length + 1;
    setRotacionTracks([
      ...rotacionTracks,
      { id: `trk-${Date.now()}`, titulo: `Semana ${nextIdx}`, url: "", dias: 7 },
    ]);
  };

  const updateRotacionTrack = (idx: number, patch: Partial<TrackItem>) => {
    setRotacionTracks((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item))
    );
  };

  const removeRotacionTrack = (idx: number) => {
    if (rotacionTracks.length <= 1) {
      setRotacionTracks([{ id: `trk-${Date.now()}`, titulo: "", url: "", dias: 7 }]);
      setEliminarMusica(true);
      return;
    }
    setRotacionTracks((prev) => prev.filter((_, i) => i !== idx));
  };

  const [musicaUrl, setMusicaUrl] = useState(personaInicial?.musica || "");
  const [musicaTitulo, setMusicaTitulo] = useState(personaInicial?.musica_titulo || "");
  const [musicaFile, setMusicaFile] = useState<File[]>([]);
  const [eliminarMusica, setEliminarMusica] = useState(false);
  const [eliminarFoto, setEliminarFoto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [showTerminosModal, setShowTerminosModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropModalSrc, setCropModalSrc] = useState<string>("");
  const [rawOriginalFile, setRawOriginalFile] = useState<File | null>(null);
  const [aceptaLegitimidad, setAceptaLegitimidad] = useState(!esPublico);
  const [aceptaTerminos, setAceptaTerminos] = useState(!esPublico);
  const [posX, setPosX] = useState(() => {
    const parts = (personaInicial?.foto_pos || "50% 50%").split(" ");
    return parseInt(parts[0], 10) || 50;
  });
  const [posY, setPosY] = useState(() => {
    const parts = (personaInicial?.foto_pos || "50% 50%").split(" ");
    return parseInt(parts[1] || parts[0], 10) || 50;
  });
  const fotoInput = useRef<HTMLInputElement>(null);
  const galInput = useRef<HTMLInputElement>(null);
  const musicaInput = useRef<HTMLInputElement>(null);

  const fotoSubidaUrl = useObjectUrls(fotoFile)[0];
  const fotoPrev = eliminarFoto ? "" : (fotoSubidaUrl || fotoUrl.trim());
  const fotoPos = `${posX}% ${posY}%`;
  const galPrev = useObjectUrls(galFiles);
  const galUrlList = galUrls.split("\n").map((l) => l.trim()).filter(Boolean);
  const musicaSubidaUrl = useObjectUrls(musicaFile)[0];
  const musicaPrev = eliminarMusica ? "" : (musicaSubidaUrl || musicaUrl.trim());

  function pick(input: HTMLInputElement | null, files: File[], setter: (f: File[]) => void, multiple: boolean) {
    const list = Array.from(input?.files ?? []);
    setter(multiple ? [...files, ...list] : list.slice(0, 1));
    if (input) {
      const dt = new DataTransfer();
      (multiple ? [...files, ...list] : list.slice(0, 1)).forEach((f) => dt.items.add(f));
      input.files = dt.files;
    }
  }

  function quitarGal(i: number) {
    const rest = galFiles.filter((_, j) => j !== i);
    setGalFiles(rest);
    if (galInput.current) {
      const dt = new DataTransfer();
      rest.forEach((f) => dt.items.add(f));
      galInput.current.files = dt.files;
    }
  }

  function quitarGalUrl(i: number) {
    const list = galUrls.split("\n").map((l) => l.trim()).filter(Boolean);
    const rest = list.filter((_, j) => j !== i);
    setGalUrls(rest.join("\n"));
  }

  return (
    <form
      action={action}
      onSubmit={() => setEnviando(true)}
      className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_420px] xl:grid-cols-[minmax(0,1.6fr)_460px] 2xl:grid-cols-[minmax(0,1.75fr)_480px] gap-6 lg:gap-8 xl:gap-10 items-start"
    >
      {isEditing && <input type="hidden" name="id" value={personaInicial!.id} />}
      <div className="space-y-6 min-w-0">
        {error && <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">Revisa la familia y el nombre.</p>}

        {/* Si es solicitud pública, pedimos datos de contacto */}
        {esPublico && (
          <Card n="✦" titulo="Tus Datos (Familiar o Solicitante)" nota="Para verificación y aviso">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={lab}>Tu nombre o parentesco *</label>
                <input
                  name="solicitante"
                  required
                  placeholder="Ej: Carlos García (Nieto)"
                  className={inp}
                />
              </div>
              <div>
                <label className={lab}>Teléfono, WhatsApp o Correo</label>
                <input
                  name="contacto"
                  placeholder="Ej: +34 600 000 000 o tu@correo.com"
                  className={inp}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Si el administrador está editando una solicitud pendiente, mostrar datos de quién la envió */}
        {isEditing && (personaInicial?.solicitante || personaInicial?.contacto) && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-gold-soft flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-semibold block mb-0.5">🕊️ Solicitud enviada por familiar:</span>
              <span>{personaInicial.solicitante || "Anónimo"} {personaInicial.contacto ? `· Contacto: ${personaInicial.contacto}` : ""}</span>
            </div>
            {personaInicial.fecha_solicitud && (
              <span className="text-[11px] text-stone-400">{personaInicial.fecha_solicitud}</span>
            )}
          </div>
        )}

        <Card n="I" titulo="Familia" nota="Elige una existente o crea un apellido nuevo">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={lab}>Familia existente</label>
              <select
                name="familia"
                className={inp}
                value={familiaSeleccionada}
                onChange={(e) => setFamiliaSeleccionada(e.target.value)}
              >
                {familias.map((f) => <option key={f.id} value={f.id}>{f.apellido}</option>)}
              </select>
            </div>
            <div>
              <label className={lab}>O nuevo apellido</label>
              <input name="nueva_familia" placeholder="Ej: Mendoza" className={inp} />
            </div>
            <div className="sm:col-span-2">
              <label className={lab}>Lema de la familia (solo si creas apellido)</label>
              <input name="lema" placeholder="La casa donde siempre se vuelve" className={inp} />
            </div>
          </div>
        </Card>

        <Card n="II" titulo="Quién fue">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={lab}>Nombre completo *</label>
              <input name="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lab}>Apodo cariñoso</label>
              <input name="apodo" value={apodo} onChange={(e) => setApodo(e.target.value)} placeholder="El abuelo Pepe" className={inp} />
            </div>
            <div>
              <label className={lab}>Años * (nacimiento — partida)</label>
              <input name="anios" required value={anios} onChange={(e) => setAnios(e.target.value)} placeholder="1934 — 2022" className={inp} />
            </div>
            <div>
              <label className={lab}>Fechas completas</label>
              <input name="fechas" value={fechas} onChange={(e) => setFechas(e.target.value)} placeholder="12 de abril de 1934 — 3 de mayo de 2022" className={inp} />
            </div>
            <div className="sm:col-span-2">
              <label className={lab}>Epitafio</label>
              <input name="epitafio" value={epitafio} onChange={(e) => setEpitafio(e.target.value)} placeholder="Su risa sigue sonando en el patio de la casa." className={inp} />
            </div>
            <div className="sm:col-span-2">
              <label className={lab}>Biografía y recuerdos</label>
              <textarea name="bio" rows={5} value={bio} onChange={(e) => setBio(e.target.value)} className={`${inp} resize-none`} placeholder="Cuenta su historia, sus costumbres, lo que más amaba..." />
            </div>
          </div>
        </Card>

        <Card n="III" titulo="Semblanza y raíces" nota="Datos que aparecen en la ficha">
          <div className="space-y-3">
            {datos.map((d, i) => (
              <div
                key={i}
                className="p-3 sm:p-0 rounded-2xl bg-stone-900/60 sm:bg-transparent border border-white/10 sm:border-none flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center transition-colors"
              >
                <div className="flex items-center gap-2 sm:w-48 shrink-0">
                  <input
                    name="dato_clave"
                    value={d.k}
                    onChange={(e) =>
                      setDatos(datos.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))
                    }
                    placeholder="Dato (ej. Nacimiento)"
                    className={`${inp} font-medium text-gold-soft`}
                  />
                  {/* Botón quitar en móvil */}
                  <button
                    type="button"
                    onClick={() => setDatos(datos.filter((_, j) => j !== i))}
                    aria-label="Quitar dato"
                    className="sm:hidden w-10 h-10 shrink-0 rounded-xl bg-white/5 border border-white/10 text-stone-400 hover:text-rose-300 hover:border-rose-400/40 active:scale-95 flex items-center justify-center transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 flex items-center gap-2">
                  <input
                    name="dato_valor"
                    value={d.v}
                    onChange={(e) =>
                      setDatos(datos.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))
                    }
                    placeholder="Valor (ej. 12 de abril de 1934 en Granada)"
                    className={`${inp} flex-1`}
                  />
                  {/* Botón quitar en desktop */}
                  <button
                    type="button"
                    onClick={() => setDatos(datos.filter((_, j) => j !== i))}
                    aria-label="Quitar dato"
                    className="hidden sm:flex w-10 h-10 shrink-0 rounded-xl border border-white/10 text-stone-400 hover:text-rose-300 hover:border-rose-400/40 active:scale-95 items-center justify-center transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDatos([...datos, { k: "", v: "" }])}
            className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/10 hover:bg-gold/20 border border-gold/30 text-xs uppercase tracking-[0.16em] text-gold-soft hover:text-white transition-all active:scale-95"
          >
            <span>+</span> Añadir dato
          </button>
        </Card>

        <Card n="IV" titulo="Álbum de recuerdos" nota="Sube archivos o pega enlaces">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className={lab}>Subir fotos desde tu equipo</label>
              <input ref={galInput} type="file" name="galeria_archivos" accept="image/*" multiple hidden onChange={() => pick(galInput.current, galFiles, setGalFiles, true)} />
              <button type="button" onClick={() => galInput.current?.click()} className="w-full rounded-xl border border-dashed border-gold/40 hover:border-gold hover:bg-gold/5 py-7 text-center transition-colors">
                <span className="block text-2xl text-gold">⬆</span>
                <span className="block text-sm text-stone-200 mt-1">Elegir fotos</span>
                <span className="block text-[11px] text-stone-500">JPG, PNG, WebP · hasta 10 MB cada una</span>
              </button>
            </div>
            <div>
              <label className={lab}>Fotos por enlace (una URL por línea)</label>
              <textarea name="galeria" rows={5} value={galUrls} onChange={(e) => setGalUrls(e.target.value)} placeholder={"https://...\nhttps://..."} className={`${inp} resize-none`} />
            </div>
          </div>
          {(galPrev.length > 0 || galUrlList.length > 0) && (
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2.5 mt-5">
              {galPrev.map((src, i) => (
                <div key={src} className="relative aspect-square rounded-lg overflow-hidden border border-gold/30 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => quitarGal(i)} aria-label="Quitar foto" className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/80 text-xs text-stone-200 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">✕</button>
                </div>
              ))}
              {galUrlList.map((src, i) => (
                <div key={src + i} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-stone-950 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.15")} />
                  <button
                    type="button"
                    onClick={() => quitarGalUrl(i)}
                    aria-label="Quitar foto"
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/80 hover:bg-rose-600 text-xs text-stone-200 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow"
                    title="Eliminar esta foto"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card n="V" titulo="Vídeos" nota="YouTube o TikTok">
          <div className="space-y-2.5">
            {videos.map((v, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1.6fr_auto] gap-2.5">
                <input name="video_titulo" value={v.t} onChange={(e) => setVideos(videos.map((x, j) => j === i ? { ...x, t: e.target.value } : x))} placeholder="Título (Cumpleaños 80)" className={inp} />
                <input name="video_url" type="text" value={v.u} onChange={(e) => setVideos(videos.map((x, j) => j === i ? { ...x, u: e.target.value } : x))} placeholder="https://youtube.com/..." className={inp} />
                <button type="button" onClick={() => setVideos(videos.length > 1 ? videos.filter((_, j) => j !== i) : [{ t: "", u: "" }])} aria-label="Quitar" className="h-10 w-10 rounded-xl border border-white/10 text-stone-500 hover:text-rose-300 hover:border-rose-400/40">✕</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setVideos([...videos, { t: "", u: "" }])} className="mt-3 text-[11px] uppercase tracking-[0.18em] text-gold-soft hover:text-white">+ Añadir vídeo</button>
        </Card>

        <Card
          n="VI"
          titulo="Músicas en su Memoria (Ciclo Rotativo Programado)"
          nota="Programa canciones por semanas y se repetirán en bucle continuo"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-gold/[0.07] border border-gold/30 text-xs text-stone-300 leading-relaxed space-y-1.5">
              <p className="font-serif text-sm text-gold-soft font-medium flex items-center gap-1.5">
                <span>🔄</span>
                <span>Programación de Canciones con Vencimiento y Repetición Cíclica</span>
              </p>
              <p className="text-[11px] text-stone-400">
                Puedes añadir varias canciones y asignarles un tiempo (ej: <b>Semana 1: Canción A</b>, <b>Semana 2: Canción B</b>, <b>Semana 3: Canción C</b>). Al terminar cada semana rotará automáticamente a la siguiente, y cuando finalice la última, <b>volverá a repetirse desde la primera en un ciclo sin fin</b>.
              </p>
            </div>

            <div className="space-y-4 divide-y divide-white/10">
              {rotacionTracks.map((trk, i) => {
                const isActive = personaInicial?.track_activo_info?.indice === i;
                const ytId = extractYouTubeId(trk.url);
                return (
                  <div key={trk.id} className="pt-4 first:pt-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-gold/20 text-gold-soft text-xs font-bold grid place-items-center">
                          {i + 1}
                        </span>
                        <span className="font-serif text-stone-200 text-sm font-medium">
                          Melodía #{i + 1} · Semana {i + 1}
                        </span>
                        {isActive && (
                          <span className="text-[10px] text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span>✦</span> Sonando hoy (vence en {personaInicial.track_activo_info?.diasRestantes} días)
                          </span>
                        )}
                      </div>

                      {rotacionTracks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRotacionTrack(i)}
                          className="text-stone-500 hover:text-rose-400 text-xs px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                        >
                          ✕ Quitar melodía
                        </button>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-[1.5fr_1fr] gap-3">
                      <div>
                        <label className={lab}>Título de la pieza / Dedicatoria</label>
                        <input
                          name="rotacion_titulo"
                          value={trk.titulo}
                          onChange={(e) => updateRotacionTrack(i, { titulo: e.target.value })}
                          placeholder={`Ej: Semana ${i + 1}: Humbe - Fantasmas`}
                          className={inp}
                        />
                      </div>

                      <div>
                        <label className={lab}>Duración antes de rotar</label>
                        <select
                          name="rotacion_dias"
                          value={trk.dias}
                          onChange={(e) => updateRotacionTrack(i, { dias: Number(e.target.value) || 7 })}
                          className={inp}
                        >
                          <option value="7">1 semana (7 días)</option>
                          <option value="14">2 semanas (14 días)</option>
                          <option value="21">3 semanas (21 días)</option>
                          <option value="30">1 mes (30 días)</option>
                          <option value="1">1 día (Prueba diaria)</option>
                          <option value="3">3 días</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={lab}>Enlace de YouTube o Audio en línea</label>
                      <input
                        name="rotacion_url"
                        type="text"
                        value={trk.url}
                        onChange={(e) => {
                          updateRotacionTrack(i, { url: e.target.value });
                          setEliminarMusica(false);
                        }}
                        placeholder="https://youtube.com/watch?v=... o https://.../cancion.mp3 (soporta &t=45s)"
                        className={inp}
                      />
                    </div>

                    {ytId && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-stone-950/60 border border-white/5 text-[11px] text-stone-400">
                        <span className="text-red-400 font-bold text-xs">▶ YouTube:</span>
                        <span className="truncate">ID: {ytId}</span>
                        {parseYouTubeStartSeconds(trk.url) ? (
                          <span className="text-gold text-[10px] bg-gold/10 px-1.5 py-0.5 rounded">
                            Inicia en {parseYouTubeStartSeconds(trk.url)}s
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={addRotacionTrack}
                className="rounded-full border border-gold/50 bg-gold/10 hover:bg-gold/20 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-gold-soft transition-all active:scale-95"
              >
                + Añadir otra melodía al ciclo rotativo (Semana {rotacionTracks.length + 1})
              </button>

              <input
                ref={musicaInput}
                type="file"
                name="musica_archivo"
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                hidden
                onChange={() => {
                  pick(musicaInput.current, musicaFile, setMusicaFile, false);
                  setEliminarMusica(false);
                }}
              />
              <button
                type="button"
                onClick={() => musicaInput.current?.click()}
                className="rounded-full border border-white/15 hover:border-gold/40 bg-stone-900/60 hover:bg-stone-900 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-stone-300 transition-colors"
              >
                {musicaFile.length ? "Archivo cargado" : "📁 Subir archivo MP3 local"}
              </button>
              {musicaFile.length > 0 && (
                <span className="text-xs text-stone-300">
                  {musicaFile[0].name} ({(musicaFile[0].size / (1024 * 1024)).toFixed(1)} MB)
                </span>
              )}
            </div>

            {(musicaPrev || rotacionTracks.some((t) => t.url && t.url.trim())) && !eliminarMusica && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEliminarMusica(true);
                    setMusicaUrl("");
                    setMusicaFile([]);
                    setRotacionTracks([{ id: `trk-${Date.now()}`, titulo: "", url: "", dias: 7 }]);
                    if (musicaInput.current) musicaInput.current.value = "";
                  }}
                  className="rounded-full border border-rose-500/40 bg-rose-950/30 hover:bg-rose-500/20 px-3.5 py-1.5 text-[11px] uppercase tracking-[0.16em] text-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🗑️</span> Quitar melodía y rotación
                </button>
              </div>
            )}

            <input type="hidden" name="musica" value={rotacionTracks[0]?.url || ""} />
            <input type="hidden" name="musica_titulo" value={rotacionTracks[0]?.titulo || ""} />
            <input type="hidden" name="eliminar_musica" value={eliminarMusica ? "1" : "0"} />
            <input type="hidden" name="musicas_inicio" value={personaInicial?.musicas_inicio || ""} />
          </div>
        </Card>

        {/* Sección VII: Consentimiento Legal y Deslinde de Responsabilidad para Familiares */}
        {esPublico && (
          <Card
            n="VII"
            titulo="Consentimiento Legal y Protección Familiar"
            nota="Declaración obligatoria para evitar litigios y proteger los derechos familiares"
          >
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 leading-relaxed">
                <p className="font-semibold text-amber-200 mb-1 flex items-center gap-1.5">
                  <span>⚖️</span> <span>Declaración de Buena Fe y Deslinde de Responsabilidad</span>
                </p>
                <p>
                  Para preservar la dignidad del difunto, evitar disputas entre familiares y prevenir cualquier
                  reclamación judicial por uso de imágenes o datos personales, es obligatorio que el solicitante confirme
                  su legitimidad y acepte los términos de uso y protección de la plataforma.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {/* Checkbox 1: Legitimidad y parentesco */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-white/10 bg-stone-950/60 hover:bg-stone-950/90 cursor-pointer transition-colors group">
                  <input
                    type="checkbox"
                    required
                    checked={aceptaLegitimidad}
                    onChange={(e) => setAceptaLegitimidad(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gold/40 text-gold focus:ring-gold/30 bg-stone-900 accent-[#c9a86a] shrink-0"
                  />
                  <div className="text-xs text-stone-300 leading-relaxed group-hover:text-stone-200">
                    <span className="font-medium text-stone-100 block mb-0.5">
                      1. Declaración de Legitimidad y Parentesco *
                    </span>
                    Declaro bajo fe de juramento que soy familiar directo (o representante debidamente facultado por la
                    familia) de la persona homenajeada, y cuento con la autorización moral y el consenso del núcleo
                    familiar para inscribir a este ser querido y hacer públicos sus recuerdos, semblanza y fotografías.
                  </div>
                </label>

                {/* Checkbox 2: Términos y deslinde de responsabilidad */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-white/10 bg-stone-950/60 hover:bg-stone-950/90 cursor-pointer transition-colors group">
                  <input
                    type="checkbox"
                    required
                    checked={aceptaTerminos}
                    onChange={(e) => setAceptaTerminos(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gold/40 text-gold focus:ring-gold/30 bg-stone-900 accent-[#c9a86a] shrink-0"
                  />
                  <div className="text-xs text-stone-300 leading-relaxed group-hover:text-stone-200">
                    <span className="font-medium text-stone-100 block mb-0.5">
                      2. Aceptación de Términos y Cláusula de Indemnidad *
                    </span>
                    He leído y acepto los{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowTerminosModal(true);
                      }}
                      className="text-gold underline underline-offset-2 hover:text-gold-soft font-medium"
                    >
                      Términos y Condiciones y Deslinde de Responsabilidad
                    </button>
                    . Entiendo que la plataforma actúa como memorial de buena fe y <b>asumo la responsabilidad
                    exclusiva por las fotos y datos aportados</b>, manteniendo indemne al Obituario Familiar y a sus
                    administradores ante cualquier disputa entre familiares o reclamaciones de terceros. Reconozco que
                    cualquier familiar directo con interés legítimo podrá solicitar en cualquier momento la corrección o
                    baja inmediata del perfil.
                  </div>
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-stone-400">
                <span className="flex items-center gap-1.5 text-stone-400">
                  <span className="text-emerald-400">✓</span> Retirada inmediata garantizada (24-48h) en caso de desacuerdo familiar.
                </span>
                <button
                  type="button"
                  onClick={() => setShowTerminosModal(true)}
                  className="text-gold-soft hover:underline font-medium text-[11px]"
                >
                  📖 Leer texto legal completo
                </button>
              </div>

              {/* Campos ocultos de consentimiento */}
              <input type="hidden" name="consentimiento_terminos" value={aceptaTerminos && aceptaLegitimidad ? "1" : "0"} />
              <input type="hidden" name="consentimiento_fecha" value={new Date().toISOString()} />
            </div>
          </Card>
        )}
      </div>

      {/* Columna lateral fija: retrato + ajuste de encuadre + color del altar + guardar */}
      <aside className="space-y-6 lg:sticky lg:top-20">
        <Card n="✦" titulo="Retrato y Encuadre">
          {/* Campo oculto con la posición del encuadre para guardar en base de datos */}
          <input type="hidden" name="foto_pos" value={fotoPos} />

          {/* Vistas previas de encuadre: Lápida en Arco y Medalla en Círculo */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="flex items-center justify-center gap-4">
              {/* Vista Lápida (Arco conmemorativo) */}
              <div className="flex flex-col items-center">
                <span className="block text-[10px] uppercase tracking-wider text-stone-400 text-center mb-1.5">
                  Lápida (Arco)
                </span>
                <div
                  onClick={() => {
                    if (fotoPrev) {
                      if (rawOriginalFile) {
                        setCropModalSrc(URL.createObjectURL(rawOriginalFile));
                      } else {
                        setCropModalSrc(fotoPrev);
                      }
                      setShowCropModal(true);
                    } else {
                      fotoInput.current?.click();
                    }
                  }}
                  title={fotoPrev ? "Haz clic para ajustar la cara estilo TikTok" : "Haz clic para subir foto"}
                  className="w-24 h-32 rounded-t-[50px] rounded-b-xl overflow-hidden border-2 border-gold/50 bg-[#11151a] shadow-xl relative cursor-pointer group active:scale-95 transition-transform"
                >
                  {fotoPrev ? (
                    <img
                      src={fotoPrev}
                      alt="Vista previa arco"
                      style={{ objectPosition: fotoPos }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-serif text-2xl text-gold/60">
                      {iniciales(nombre)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gold/15 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs text-gold-soft font-semibold backdrop-blur-[1px]">
                    <span>✂️ Ajustar</span>
                  </div>
                </div>
              </div>

              {/* Vista Medalla (Círculo de fichas) */}
              <div className="flex flex-col items-center">
                <span className="block text-[10px] uppercase tracking-wider text-stone-400 text-center mb-1.5">
                  Medalla (Círculo)
                </span>
                <div
                  onClick={() => {
                    if (fotoPrev) {
                      if (rawOriginalFile) {
                        setCropModalSrc(URL.createObjectURL(rawOriginalFile));
                      } else {
                        setCropModalSrc(fotoPrev);
                      }
                      setShowCropModal(true);
                    } else {
                      fotoInput.current?.click();
                    }
                  }}
                  title={fotoPrev ? "Haz clic para ajustar la cara estilo TikTok" : "Haz clic para subir foto"}
                  className="portrait-ring w-24 h-24 rounded-full mx-auto cursor-pointer relative shadow-xl active:scale-95 transition-transform overflow-hidden group"
                >
                  {fotoPrev ? (
                    <img
                      src={fotoPrev}
                      alt="Vista previa círculo"
                      style={{ objectPosition: fotoPos }}
                      className="portrait-inner object-cover w-full h-full"
                    />
                  ) : (
                    <div className="portrait-inner font-serif text-2xl text-gold/80">{iniciales(nombre)}</div>
                  )}
                  <div className="absolute inset-0 bg-gold/15 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs text-gold-soft font-semibold backdrop-blur-[1px]">
                    <span>✂️ Ajustar</span>
                  </div>
                </div>
              </div>
            </div>

            {fotoPrev ? (
              <button
                type="button"
                onClick={() => {
                  if (rawOriginalFile) {
                    setCropModalSrc(URL.createObjectURL(rawOriginalFile));
                  } else {
                    setCropModalSrc(fotoPrev);
                  }
                  setShowCropModal(true);
                }}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/25 via-gold/30 to-amber-500/25 hover:from-amber-500/35 hover:to-gold/45 border border-gold/70 text-gold-soft text-xs font-semibold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(201,168,106,0.25)] active:scale-95 transition-all cursor-pointer"
              >
                <span>✂️</span>
                <span>Ajustar Foto de Perfil (Estilo TikTok)</span>
              </button>
            ) : (
              <p className="text-[11px] text-stone-400 text-center italic mt-1">
                ✦ Sube una foto para encuadrar el rostro con zoom y arrastre táctil
              </p>
            )}
          </div>

          <div className="mt-5 space-y-3">
            <input
              ref={fotoInput}
              type="file"
              name="foto_archivo"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setRawOriginalFile(f);
                  const tempUrl = URL.createObjectURL(f);
                  setCropModalSrc(tempUrl);
                  setShowCropModal(true);
                  setEliminarFoto(false);
                }
              }}
            />
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fotoInput.current?.click()}
                className="w-full rounded-full border border-gold/50 bg-gold/10 hover:bg-gold/20 py-2.5 text-[11px] uppercase tracking-[0.18em] text-gold-soft transition-colors cursor-pointer"
              >
                {fotoFile.length ? "Cambiar foto" : (personaInicial?.foto && !eliminarFoto ? "Reemplazar foto del difunto" : "Subir foto del difunto")}
              </button>
              {(fotoPrev || (personaInicial?.foto && !eliminarFoto)) && (
                <button
                  type="button"
                  onClick={() => {
                    setEliminarFoto(true);
                    setFotoUrl("");
                    setFotoFile([]);
                    setRawOriginalFile(null);
                    if (fotoInput.current) fotoInput.current.value = "";
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 underline underline-offset-4 text-center cursor-pointer"
                >
                  Quitar foto
                </button>
              )}
            </div>
            {fotoFile.length > 0 && <p className="text-[11px] text-stone-400 truncate text-center">{fotoFile[0].name}</p>}
            {isEditing && personaInicial?.foto && !fotoFile.length && !eliminarFoto && (
              <p className="text-[11px] text-emerald-400/90 text-center">
                ✓ Retrato actual conservado. Si deseas ajustarlo, pulsa «Ajustar Foto de Perfil (Estilo TikTok)».
              </p>
            )}
            <div>
              <label className={lab}>…o enlace de la foto</label>
              <input
                name="foto"
                type="text"
                value={fotoUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setFotoUrl(val);
                  if (!val.trim() && !fotoFile.length) {
                    setEliminarFoto(true);
                  } else {
                    setEliminarFoto(false);
                  }
                }}
                placeholder="https://..."
                className={inp}
              />
              <p className="text-[11px] text-stone-500 mt-1.5">Si borras el texto del enlace y guardas, la foto se eliminará.</p>
            </div>
            <input type="hidden" name="eliminar_foto" value={eliminarFoto ? "1" : "0"} />
          </div>
        </Card>

        {/* Sección de Selección de Color del Altar para este ser querido */}
        <Card n="VII" titulo="Color Sagrado del Altar y Lápida" nota="Atmósfera personalizada">
          <p className="text-xs text-stone-400 mb-3">
            Cuando un familiar o visitante abra la ficha de este ser querido, el santuario adoptará el color que elijas aquí:
          </p>
          <ColorPickerGrid value={color} onChange={setColor} name="color" showDesc={false} />
        </Card>

        {estaPendiente ? (
          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-gold/40 text-xs text-gold-soft">
              <span className="font-semibold block mb-0.5">⏳ Solicitud en revisión</span>
              <span>Puedes corregir cualquier dato y pulsar el botón para autorizarla en el obituario.</span>
            </div>
            <button
              type="submit"
              name="accion_publicar"
              value="publicar"
              disabled={enviando}
              className="w-full rounded-full bg-emerald-600/30 hover:bg-emerald-600/45 disabled:opacity-60 border border-emerald-500/70 py-3.5 text-[12px] uppercase tracking-[0.18em] text-emerald-200 font-medium transition-all active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              {enviando ? "Guardando…" : "✅ Guardar y Publicar en Obituario"}
            </button>
            <button
              type="submit"
              name="accion_publicar"
              value="mantener_pendiente"
              disabled={enviando}
              className="w-full rounded-full bg-stone-900 hover:bg-stone-800 disabled:opacity-60 border border-white/15 py-2.5 text-[11px] uppercase tracking-[0.16em] text-stone-300 transition-colors"
            >
              Guardar sin publicar (mantener en revisión)
            </button>
          </div>
        ) : esPublico ? (
          <div className="space-y-3">
            {(!aceptaLegitimidad || !aceptaTerminos) && (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-200/90 text-center leading-relaxed">
                ⚠️ Para enviar la inscripción, debes marcar las 2 casillas obligatorias de la Sección VII (Legitimidad y Términos Legales).
              </div>
            )}
            <p className="text-[11px] text-stone-400 text-center">
              Al enviar, tu solicitud quedará en estado <b>En revisión</b>. El administrador la revisará y autorizará en breve.
            </p>
            <button
              type="submit"
              disabled={enviando || !aceptaLegitimidad || !aceptaTerminos}
              className="w-full rounded-full bg-gold/25 hover:bg-gold/35 disabled:opacity-40 disabled:cursor-not-allowed border border-gold/70 py-3.5 text-[12px] uppercase tracking-[0.2em] text-gold-soft font-medium transition-all active:scale-95 shadow-[0_0_25px_rgba(201,168,106,0.25)]"
            >
              {enviando ? "Enviando solicitud…" : "🕊️ Enviar para Revisión"}
            </button>
          </div>
        ) : (
          <button
            disabled={enviando}
            className="w-full rounded-full bg-gold/25 hover:bg-gold/35 disabled:opacity-60 border border-gold/70 py-3.5 text-[12px] uppercase tracking-[0.22em] text-gold-soft transition-colors"
          >
            {enviando ? "Guardando cambios…" : (isEditing ? "Guardar Cambios" : "Guardar en el Obituario")}
          </button>
        )}
      </aside>

      {/* Modal flotante de Términos y Condiciones Legales */}
      <TerminosModal
        isOpen={showTerminosModal}
        onClose={() => setShowTerminosModal(false)}
        onAccept={() => {
          setAceptaLegitimidad(true);
          setAceptaTerminos(true);
        }}
      />

      {/* Modal interactivo de ajuste de rostro y recorte estilo TikTok */}
      <FotoCropModal
        isOpen={showCropModal}
        imageSrc={cropModalSrc}
        onClose={() => setShowCropModal(false)}
        onConfirm={(croppedFile) => {
          setFotoFile([croppedFile]);
          if (fotoInput.current) {
            const dt = new DataTransfer();
            dt.items.add(croppedFile);
            fotoInput.current.files = dt.files;
          }
          setPosX(50);
          setPosY(50);
          setEliminarFoto(false);
        }}
      />
    </form>
  );
}
