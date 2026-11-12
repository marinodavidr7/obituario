import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function iniciales(nombre: string): string {
  return (
    (nombre || "")
      .split(/\s+/)
      .filter((p) => p.length > 2)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "✦"
  );
}

export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/)|music\.youtube\.com\/watch\?v=)([^#&?]{11})/
  );
  if (match && match[1]) return match[1];

  try {
    const u = new URL(trimmed);
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1).split(/[?#&]/)[0] || null;
    }
    if (u.hostname.includes("youtube.com")) {
      return u.searchParams.get("v") || u.pathname.split("/").pop() || null;
    }
  } catch {}
  return null;
}

export function parseYouTubeStartSeconds(url: string | null | undefined): number | null {
  if (!url) return null;
  const trimmed = url.trim();
  try {
    const m = trimmed.match(/[?&#](?:t|start)=([^&#]+)/);
    if (!m) return null;
    const t = m[1];

    if (/^\d+s?$/i.test(t)) {
      return parseInt(t, 10);
    }

    let total = 0;
    const h = t.match(/(\d+)h/i);
    const min = t.match(/(\d+)m/i);
    const s = t.match(/(\d+)s/i);

    if (h) total += parseInt(h[1], 10) * 3600;
    if (min) total += parseInt(min[1], 10) * 60;
    if (s) total += parseInt(s[1], 10);

    return total > 0 ? total : null;
  } catch {}
  return null;
}

export function embedVideo(url: string): { tipo: "youtube" | "tiktok" | "otro"; embed: string | null } {
  const ytId = extractYouTubeId(url);
  if (ytId) {
    const start = parseYouTubeStartSeconds(url);
    const startParam = start ? `&start=${start}` : "";
    return { tipo: "youtube", embed: `https://www.youtube.com/embed/${ytId}?rel=0${startParam}` };
  }
  try {
    const u = new URL(url);
    if (u.hostname.includes("tiktok.com")) {
      const m = u.pathname.match(/video\/(\d+)/);
      return { tipo: "tiktok", embed: m ? `https://www.tiktok.com/embed/v2/${m[1]}` : null };
    }
  } catch {}
  return { tipo: "otro", embed: null };
}

/**
 * Formatea fechas crudas (ISO timestamps como "2026-11-12T00:00:00+00:00", timestamps numéricos, etc.)
 * a un formato humano, cálido y elegante en español (ej. "12 de noviembre de 2026").
 */
export function formatearFecha(fechaRaw: string | number | undefined | null): string {
  if (!fechaRaw) return "";
  const trimmed = String(fechaRaw).trim();

  // Si tiene formato YYYY-MM-DD o ISO string (ej. "2026-11-12T00:00:00+00:00" o "2026-11-12")
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const date = new Date(Date.UTC(year, month, day));
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  // Si es un timestamp numérico (ej. 1794497701489 o "1794497701489")
  if (/^\d{10,13}$/.test(trimmed)) {
    const d = new Date(parseInt(trimmed, 10));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  }

  // Si ya contiene un mes legible en español
  if (/(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i.test(trimmed)) {
    return trimmed;
  }

  // Intento general con Date
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return trimmed;
}