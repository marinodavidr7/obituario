/**
 * Utilidades para normalizar y manejar URLs de imágenes en El Panteón.
 * Soporta la conversión automática de enlaces compartidos de Google Drive
 * y Dropbox a URLs directas cargables por <img>/<video>.
 *
 * Invariante importante fuera del código: el archivo debe estar compartido
 * como "Cualquier persona con el enlace puede ver" en Google Drive; si es
 * privado, lh3.../d/{id} devuelve 403 y la imagen simplemente no carga.
 */

/**
 * Extrae el ID de un archivo de Google Drive desde cualquier variante de URL compartida.
 */
export function extraerGoogleDriveId(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Patrón 1: /file/d/{id} (ej: drive.google.com/file/d/1nXZY.../view?usp=drive_link)
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }

  // Patrón 2: id={id} como parámetro de búsqueda (ej: /open?id=..., /uc?id=...)
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  // Patrón 3: lh3.googleusercontent.com/d/{id}
  const lh3Match = trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match && lh3Match[1]) {
    return lh3Match[1];
  }

  return null;
}

/**
 * Verifica si la URL pertenece a Google Drive.
 */
export function esGoogleDriveUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  return /drive\.google\.com|docs\.google\.com|googleusercontent\.com\/d\//i.test(url);
}

/**
 * Normaliza cualquier URL de imagen para que pueda renderizarse directamente en un <img>.
 * Convierte enlaces compartidos de Google Drive a su CDN directo (lh3.googleusercontent.com/d/{id}),
 * y enlaces de Dropbox a modo raw=1. Cualquier otra URL se devuelve sin tocar.
 * Acepta null/undefined/vacías (devuelve "").
 */
export function normalizarUrlImagen(url?: string | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // 1. Google Drive -> CDN directo de Google sin redirecciones
  if (esGoogleDriveUrl(trimmed)) {
    const driveId = extraerGoogleDriveId(trimmed);
    if (driveId) {
      return `https://lh3.googleusercontent.com/d/${driveId}`;
    }
  }

  // 2. Dropbox -> Convertir dl=0 a raw=1 para enlace directo de imagen
  if (trimmed.includes("dropbox.com")) {
    if (trimmed.includes("dl=0")) {
      return trimmed.replace("dl=0", "raw=1");
    }
    if (!trimmed.includes("raw=1")) {
      return trimmed.includes("?") ? `${trimmed}&raw=1` : `${trimmed}?raw=1`;
    }
  }

  return trimmed;
}

/**
 * Normaliza una lista de URLs (una por línea o en <img>/<video> múltiples),
 * descartando las vacías.
 */
export function normalizarUrlImagenArray(urls: readonly string[]): string[] {
  return (urls || [])
    .map((u) => normalizarUrlImagen(u))
    .filter((u) => u.length > 0);
}
