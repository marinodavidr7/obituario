/**
 * Normalización del álbum de recuerdos (galería) de cada alma.
 *
 * Formato de almacenamiento en la columna JSONB `personas.galeria`:
 *   - Elemento legacy: string con la URL (sin comentario).
 *   - Elemento nuevo:   { url: string, comentario?: string | null }
 *
 * La app acepta ambos al leer; al escribir genera sólo el formato objeto
 * cuando hay comentario (y string si no lo hay, para no inflar registros).
 * `normalizarGaleria` debe usarse siempre antes de renderizar, contar o
 * extraer URLs de la galería.
 */
import { normalizarUrlImagen } from "@/lib/imageUrl";

export interface GaleriaMedia {
  url: string;
  comentario: string | null;
}

export function normalizarGaleria(items: unknown): GaleriaMedia[] {
  if (!Array.isArray(items)) return [];
  const out: GaleriaMedia[] = [];
  for (const raw of items) {
    if (typeof raw === "string") {
      const url = normalizarUrlImagen(raw.trim());
      if (url) out.push({ url, comentario: null });
      continue;
    }
    if (raw && typeof raw === "object") {
      const o = raw as Record<string, unknown>;
      const u = typeof o.url === "string" ? o.url.trim() : "";
      if (!u) continue;
      const url = normalizarUrlImagen(u);
      if (!url) continue;
      const comentario =
        typeof o.comentario === "string" && o.comentario.trim() ? o.comentario.trim() : null;
      out.push({ url, comentario });
    }
  }
  return out;
}

/** URLs planas de la galería (para limpieza de storage, auditoría, broadcast). */
export function galeriaUrls(items: unknown): string[] {
  return normalizarGaleria(items).map((i) => i.url);
}

