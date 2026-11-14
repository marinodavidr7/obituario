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

const MESES_ES: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

export function parseFechaEspanol(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  // 1. Formato español: "4 de marzo de 1926" o "4 marzo 1926"
  const esMatch = s.match(
    /(\d{1,2})\s*(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s*(?:de|del)?\s*(\d{4})/i
  );
  if (esMatch) {
    const day = parseInt(esMatch[1], 10);
    const month = MESES_ES[esMatch[2].toLowerCase()];
    const year = parseInt(esMatch[3], 10);
    if (month !== undefined && day >= 1 && day <= 31 && year > 1800) {
      return new Date(year, month, day);
    }
  }

  // 2. Formato ISO YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return new Date(
      parseInt(isoMatch[1], 10),
      parseInt(isoMatch[2], 10) - 1,
      parseInt(isoMatch[3], 10)
    );
  }

  // 3. Formato DD/MM/YYYY o DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    return new Date(
      parseInt(dmyMatch[3], 10),
      parseInt(dmyMatch[2], 10) - 1,
      parseInt(dmyMatch[1], 10)
    );
  }

  return null;
}

export function parseFechasVida(
  fechas: string | null | undefined
): { nacimiento: Date | null; partida: Date | null } {
  if (!fechas) return { nacimiento: null, partida: null };
  const partes = fechas
    .split(/\s*(?:—|–|\s-\s|\s+al\s+|\s+a\s+)\s*/i)
    .map((x) => x.trim())
    .filter(Boolean);

  if (partes.length >= 2) {
    return {
      nacimiento: parseFechaEspanol(partes[0]),
      partida: parseFechaEspanol(partes[partes.length - 1]),
    };
  }
  return { nacimiento: null, partida: parseFechaEspanol(partes[0]) };
}

export function calcularTiempoDesdePartida(
  partida: Date,
  ahora = new Date()
): { texto: string; esAniversarioHoy: boolean; anios: number } | null {
  const inicio = new Date(partida.getFullYear(), partida.getMonth(), partida.getDate());
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  if (hoy < inicio) return null;

  let anios = hoy.getFullYear() - inicio.getFullYear();
  let meses = hoy.getMonth() - inicio.getMonth();
  let dias = hoy.getDate() - inicio.getDate();

  if (dias < 0) {
    meses -= 1;
    const diasMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
    dias += diasMesAnterior;
  }
  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }

  const esAniversarioHoy =
    anios > 0 &&
    hoy.getMonth() === inicio.getMonth() &&
    hoy.getDate() === inicio.getDate();

  if (anios === 0 && meses === 0 && dias === 0) {
    return { texto: "Partió hoy", esAniversarioHoy: false, anios: 0 };
  }

  const partes: string[] = [];
  if (anios > 0) partes.push(`${anios} ${anios === 1 ? "año" : "años"}`);
  if (meses > 0) partes.push(`${meses} ${meses === 1 ? "mes" : "meses"}`);
  if (anios === 0 && dias > 0) partes.push(`${dias} ${dias === 1 ? "día" : "días"}`);

  const texto = `Hace ${partes.join(" y ")}`;
  return { texto, esAniversarioHoy, anios };
}

export function calcularCumpleanos(
  nacimiento: Date,
  ahora = new Date()
): {
  esHoy: boolean;
  edadCumpliria: number;
  diasRestantes: number;
  fechaTexto: string;
} {
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const mes = nacimiento.getMonth();
  const dia = nacimiento.getDate();

  let proximo = new Date(hoy.getFullYear(), mes, dia);
  if (proximo < hoy) {
    proximo = new Date(hoy.getFullYear() + 1, mes, dia);
  }

  const diasRestantes = Math.round((proximo.getTime() - hoy.getTime()) / 86400000);
  const esHoy = diasRestantes === 0;
  const edadCumpliria = proximo.getFullYear() - nacimiento.getFullYear();
  const fechaTexto = nacimiento.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
  });

  return { esHoy, edadCumpliria, diasRestantes, fechaTexto };
}