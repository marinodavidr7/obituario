/**
 * Limpieza de archivos del bucket `panteon-media` (`uploads/`).
 *
 * El Panteón guarda las imágenes/audio/video subidos aquí bajo `uploads/`.
 * Algunas referencias en la base de datos apuntan a URLs públicas del bucket,
 * por lo que se pueden extraer las claves del bucket a partir de esas URLs.
 *
 *  - `eliminarArchivosSubidos(urls)`   → borra los archivos en Storage de una lista de URLs (best-effort).
 *  - `auditarImagenesHuerfanas()`      → compara el bucket con las referencias en la DB (solo lee) y devuelve
 *                                        los archivos sin referencias (huérfanos).
 *  - `borrarImagenesHuerfanas(keys)`   → borra las claves del bucket indicadas.
 *
 * Todo protegido con isSupabaseConfigured: en modo local/offline son no-op.
 */
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const BUCKET = "panteon-media";
const PREFIX = "uploads";

export interface PersonaStorageFields {
  foto?: string | null;
  galeria?: Array<string | { url?: string | null } | null> | null;
  musica?: string | null;
  musicas_rotacion?: Array<{ url?: string | null } | null | undefined> | null | undefined;
}

/** Extrae la clave relativa al bucket a partir de una URL pública de Storage. */
export function extraerClaveStorageDeUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const limpio = url.split("?")[0].split("#")[0].trim();
  const marcador = `/${BUCKET}/`;
  const idx = limpio.indexOf(marcador);
  if (idx === -1) return null;
  const resto = limpio.slice(idx + marcador.length);
  const clave = decodeURIComponent(resto);
  if (!clave || clave.includes("..")) return null;
  return clave;
}

/** Extrae las claves del bucket de una lista de URLs (deduplicada). */
export function extraerClavesPanteon(urls: readonly (string | null | undefined)[]): string[] {
  const set = new Set<string>();
  for (const u of urls || []) {
    const k = extraerClaveStorageDeUrl(u);
    if (k && k.startsWith(`${PREFIX}/`)) set.add(k);
  }
  return Array.from(set);
}

/** Recolecta TODAS las URLs referenciadas por una persona. */
export function recolectarUrlsDePersona(p?: PersonaStorageFields | null): (string | null | undefined)[] {
  const urls: (string | null | undefined)[] = [p?.foto];
  if (Array.isArray(p?.galeria)) {
    for (const it of p.galeria) {
      const u = typeof it === "string" ? it : it?.url;
      if (typeof u === "string" && u) urls.push(u);
    }
  }
  if (p?.musica) urls.push(p.musica);
  if (Array.isArray(p?.musicas_rotacion)) {
    for (const t of p.musicas_rotacion) urls.push(t?.url);
  }
  return urls;
}

/** Borra los archivos del bucket correspondientes a las URLs dadas (best-effort). */
export async function eliminarArchivosSubidos(urls: readonly (string | null | undefined)[]): Promise<{ borradas: number; errores: string[] }> {
  const resultado = { borradas: 0, errores: [] as string[] };
  if (!isSupabaseConfigured) return resultado;

  const claves = extraerClavesPanteon(urls);
  if (claves.length === 0) return resultado;

  try {
    const { data, error } = await supabase.storage.from(BUCKET).remove(claves);
    if (error) {
      resultado.errores.push(error.message);
      return resultado;
    }
    resultado.borradas = Array.isArray(data) ? data.length : claves.length;
    return resultado;
  } catch (e: any) {
    resultado.errores.push(e?.message || "Error al borrar archivos de Supabase Storage");
    return resultado;
  }
}

export interface ArchivoHuerfano {
  name: string;
  fullPath: string;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Lista TODOS los archivos en uploads/ del bucket (paginado en bloques de 1000). */
async function listarTodosLosArchivos(): Promise<ArchivoHuerfano[]> {
  const acumulados: ArchivoHuerfano[] = [];
  let offset = 0;
  const LIMITE = 1000;
  while (true) {
    try {
      const { data, error } = await supabase.storage.from(BUCKET).list(PREFIX, {
        limit: LIMITE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error || !Array.isArray(data) || data.length === 0) break;
      for (const item of data) {
        if (!item?.name) continue;
        acumulados.push({
          name: String(item.name),
          fullPath: `${PREFIX}/${item.name}`,
          createdAt: item.created_at ?? null,
          updatedAt: item.updated_at ?? null,
        });
      }
      if (data.length < LIMITE) break;
      offset += LIMITE;
    } catch {
      break;
    }
  }
  return acumulados;
}

/**
 * Compara el bucket con las referencias guardadas en la base de datos.
 * Devuelve los archivos huérfanos (en bucket y no referenciados).
 */
export async function auditarImagenesHuerfanas(
  datos: {
    personas: PersonaStorageFields[];
    fotosPendientes: Array<{ url?: string | null }>;
    configValores?: Array<string | null | undefined>;
  }
): Promise<{ huerfanas: ArchivoHuerfano[]; referenciadas: number; error?: string }> {
  if (!isSupabaseConfigured) {
    return { huerfanas: [], referenciadas: 0, error: "Supabase no está configurado (modo local/offline)." };
  }

  try {
    // URLs referenciadas por personas (foto, galería, música, rotación)
    const urlsRef = new Set<string>();
    for (const p of datos.personas || []) {
      for (const u of recolectarUrlsDePersona(p)) {
        if (u) urlsRef.add(String(u));
      }
    }
    // URLs de fotos pendientes de aprobación
    for (const f of datos.fotosPendientes || []) {
      if (f?.url) urlsRef.add(String(f.url));
    }
    // Cualquier valor crudo de la tabla config que contenga URLs (por si acaso)
    for (const raw of datos.configValores || []) {
      if (typeof raw === "string") {
        for (const match of raw.matchAll(/https?:\/\/[^\s"'<>]+/g)) {
          urlsRef.add(match[0]);
        }
      }
    }

    const clavesRef = new Set(extraerClavesPanteon(Array.from(urlsRef)));
    const todos = await listarTodosLosArchivos();
    const huerfanas = todos.filter((a) => !clavesRef.has(a.fullPath));
    return { huerfanas, referenciadas: clavesRef.size };
  } catch (e: any) {
    return { huerfanas: [], referenciadas: 0, error: e?.message || "Error auditando imágenes" };
  }
}

/** Borra las claves indicadas del bucket. */
export async function borrarImagenesHuerfanas(keys: string[]): Promise<{ borradas: number; errores: string[] }> {
  const resultado = { borradas: 0, errores: [] as string[] };
  if (!isSupabaseConfigured) return resultado;

  const limpias = (keys || [])
    .map((k) => String(k || "").trim())
    .filter((k) => k.length > 0 && k.startsWith(`${PREFIX}/`) && !k.includes(".."));
  if (limpias.length === 0) return resultado;

  try {
    const { data, error } = await supabase.storage.from(BUCKET).remove(limpias);
    if (error) {
      resultado.errores.push(error.message);
      return resultado;
    }
    resultado.borradas = Array.isArray(data) ? data.length : limpias.length;
    return resultado;
  } catch (e: any) {
    resultado.errores.push(e?.message || "Error al borrar archivos");
    return resultado;
  }
}
