import {
  aprobarPersona,
  deleteDedicatoria,
  deletePersona,
  getFamilia,
  insertPersona,
  rechazarPersona,
  setConfig,
  slugify,
  updatePersona,
  upsertFamilia,
} from "@/lib/db";
import { guardarArchivo, guardarImagen } from "@/lib/uploads";
import { notificarSolicitudTelegram } from "@/lib/telegram";
import { navigate } from "@/lib/router";
import type { Dato, TrackRotacion, Video } from "@/types";

const clean = (arr: FormDataEntryValue[]) => arr.map((x) => String(x).trim());

function parsearRotacion(
  formData: FormData,
  s: (k: string) => string,
  musicaUnica?: string | null,
  tituloUnico?: string | null
): { tracks: TrackRotacion[]; inicio: string | null } {
  const urls = clean(formData.getAll("rotacion_url"));
  const titulos = clean(formData.getAll("rotacion_titulo"));
  const dias = clean(formData.getAll("rotacion_dias"));

  const tracks: TrackRotacion[] = [];
  for (let i = 0; i < urls.length; i++) {
    const u = urls[i];
    if (u) {
      tracks.push({
        id: `trk-${i + 1}-${Date.now().toString(36)}`,
        url: u,
        titulo: titulos[i] || `Melodía ${i + 1}`,
        duracion_dias: Math.max(1, parseInt(dias[i] || "7", 10) || 7),
      });
    }
  }

  if (tracks.length === 0 && musicaUnica) {
    tracks.push({
      id: "trk-1",
      url: musicaUnica,
      titulo: tituloUnico || "Música en su memoria",
      duracion_dias: 7,
    });
  }

  const inicio = s("musicas_inicio") || (tracks.length > 0 ? new Date().toISOString() : null);
  return { tracks, inicio };
}

export async function procesarPersonaFormData(formData: FormData) {
  const s = (k: string) => String(formData.get(k) ?? "").trim();
  const nuevaFamilia = s("nueva_familia");
  let familiaId = s("familia");

  if (nuevaFamilia) {
    familiaId = slugify(nuevaFamilia);
    upsertFamilia({ id: familiaId, apellido: nuevaFamilia });
  }

  const nombre = s("nombre");
  if (!nombre) throw new Error("El nombre es obligatorio");

  let id = s("id") || slugify(nombre);
  const eliminarFoto = s("eliminar_foto") === "1";
  const fotoArchivo = formData.get("foto_archivo") as File | null;
  const fotoSubida = await guardarImagen(fotoArchivo);
  const foto = eliminarFoto ? null : (fotoSubida || s("foto") || null);
  const foto_pos = s("foto_pos") || "50% 20%";

  const claves = clean(
    formData.getAll("dato_k").length > 0
      ? formData.getAll("dato_k")
      : formData.getAll("dato_clave")
  );
  const valores = clean(
    formData.getAll("dato_v").length > 0
      ? formData.getAll("dato_v")
      : formData.getAll("dato_valor")
  );
  const datos: Dato[] = claves
    .map((k, i) => [k, valores[i]] as Dato)
    .filter(([k, v]) => Boolean(k && v));

  const galeriaFiles = formData.getAll("galeria_archivos") as File[];
  const subidas: string[] = [];
  for (const f of galeriaFiles) {
    const u = await guardarImagen(f);
    if (u) subidas.push(u);
  }
  const urls = s("galeria")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const enlaces = clean(
    formData.getAll("video_url").length > 0
      ? formData.getAll("video_url")
      : formData.getAll("video_u")
  );
  const titulos = clean(
    formData.getAll("video_titulo").length > 0
      ? formData.getAll("video_titulo")
      : formData.getAll("video_t")
  );
  const videos: Video[] = enlaces
    .map((url, i) => ({ titulo: titulos[i] || "Vídeo", url }))
    .filter((v) => v.url);

  const eliminarMusica = s("eliminar_musica") === "1";
  const musicaArchivo = formData.get("musica_archivo") as File | null;
  const musicaSubida = await guardarArchivo(musicaArchivo);
  const musica = eliminarMusica ? null : (musicaSubida || s("musica") || null);
  const musica_titulo = eliminarMusica ? null : (s("musica_titulo") || null);
  const { tracks: musicas_rotacion, inicio: musicas_inicio } = eliminarMusica
    ? { tracks: [], inicio: null }
    : parsearRotacion(formData, s, musica, musica_titulo);

  return {
    id,
    familiaId,
    nombre,
    apodo: s("apodo") || null,
    anios: s("anios"),
    fechas: s("fechas") || null,
    epitafio: s("epitafio") || null,
    bio: s("bio") || null,
    foto,
    foto_pos,
    datos,
    galeria: [...subidas, ...urls],
    videos,
    musica,
    musica_titulo,
    musicas_rotacion,
    musicas_inicio,
    solicitante: s("solicitante") || null,
    contacto: s("contacto") || null,
    color: s("color") || null,
  };
}

export async function solicitarInscripcion(formData: FormData): Promise<void> {
  const s = (k: string) => String(formData.get(k) ?? "").trim();
  const consentimiento = s("consentimiento_terminos");
  if (consentimiento !== "1") {
    throw new Error(
      "Es obligatorio aceptar los Términos, Condiciones y Deslinde de Responsabilidad Familiar para inscribir a un ser querido."
    );
  }

  const data = await procesarPersonaFormData(formData);
  const fechaSolicitud = new Date().toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  insertPersona({
    id: data.id,
    familia_id: data.familiaId,
    nombre: data.nombre,
    apodo: data.apodo,
    anios: data.anios,
    fechas: data.fechas,
    epitafio: data.epitafio,
    foto: data.foto,
    foto_pos: data.foto_pos,
    bio: data.bio,
    datos: data.datos,
    galeria: data.galeria,
    videos: data.videos,
    musica: data.musica,
    musica_titulo: data.musica_titulo,
    musicas_rotacion: data.musicas_rotacion,
    musicas_inicio: data.musicas_inicio,
    estado: "pendiente",
    color: data.color,
    solicitante: data.solicitante,
    contacto: data.contacto,
    fecha_solicitud: fechaSolicitud,
  });

  try {
    await notificarSolicitudTelegram(data.id);
  } catch (err) {
    console.warn("Telegram notification:", err);
  }

  navigate(`/inscribir/gracias?id=${data.id}&nombre=${encodeURIComponent(data.nombre)}`);
}

export async function crearPersona(formData: FormData): Promise<void> {
  const data = await procesarPersonaFormData(formData);

  insertPersona({
    id: data.id,
    familia_id: data.familiaId,
    nombre: data.nombre,
    apodo: data.apodo,
    anios: data.anios,
    fechas: data.fechas,
    epitafio: data.epitafio,
    foto: data.foto,
    foto_pos: data.foto_pos,
    bio: data.bio,
    datos: data.datos,
    galeria: data.galeria,
    videos: data.videos,
    musica: data.musica,
    musica_titulo: data.musica_titulo,
    musicas_rotacion: data.musicas_rotacion,
    musicas_inicio: data.musicas_inicio,
    color: data.color,
    estado: "publicado",
  });

  navigate("/admin");
}

export async function editarPersona(id: string, formData: FormData): Promise<void> {
  const data = await procesarPersonaFormData(formData);

  updatePersona({
    id,
    familia_id: data.familiaId,
    nombre: data.nombre,
    apodo: data.apodo,
    anios: data.anios,
    fechas: data.fechas,
    epitafio: data.epitafio,
    foto: data.foto,
    foto_pos: data.foto_pos,
    bio: data.bio,
    datos: data.datos,
    galeria: data.galeria,
    videos: data.videos,
    musica: data.musica,
    musica_titulo: data.musica_titulo,
    musicas_rotacion: data.musicas_rotacion,
    musicas_inicio: data.musicas_inicio,
    color: data.color,
    estado: "publicado",
    solicitante: data.solicitante,
    contacto: data.contacto,
  });

  navigate("/admin");
}

export async function borrarPersona(id: string): Promise<void> {
  await deletePersona(id);
  navigate("/admin");
}

export async function borrarDedicatoria(id: number | string): Promise<void> {
  await deleteDedicatoria(id);
}

export function aprobarSolicitud(id: string): void {
  aprobarPersona(id);
}

export async function rechazarSolicitud(id: string): Promise<void> {
  await rechazarPersona(id);
}

export async function guardarMusicaGeneral(url: string, titulo: string): Promise<void> {
  setConfig("musica_general_url", url || null);
  setConfig("musica_general_titulo", titulo || null);
}
