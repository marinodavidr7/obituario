export type DecoracionId =
  | "ninguna"
  | "beisbol"
  | "militar"
  | "musica"
  | "medicina"
  | "docente"
  | "campo"
  | "futbol"
  | "mar"
  | "fe";

export interface DecoracionTheme {
  id: DecoracionId;
  label: string;
  icon: string;
  badgeText: string;
  cornerIcons: [string, string, string, string];
  accentClass: string;
}

export const DECORACIONES: DecoracionTheme[] = [
  {
    id: "ninguna",
    label: "Clásico (sin emblema)",
    icon: "✦",
    badgeText: "",
    cornerIcons: ["✦", "✦", "✦", "✦"],
    accentClass: "border-gold/40 bg-gold/10 text-gold-soft",
  },
  {
    id: "beisbol",
    label: "Pelotero / Béisbol",
    icon: "⚾",
    badgeText: "En memoria del diamante",
    cornerIcons: ["⚾", "🧢", "🏟️", "🏆"],
    accentClass: "border-red-400/45 bg-red-500/15 text-red-200",
  },
  {
    id: "militar",
    label: "Policía / Militar",
    icon: "🎖️",
    badgeText: "Honor, valor y servicio",
    cornerIcons: ["🎖️", "🛡️", "⭐", "🦅"],
    accentClass: "border-sky-400/45 bg-sky-500/15 text-sky-200",
  },
  {
    id: "musica",
    label: "Músico / Cantante",
    icon: "🎵",
    badgeText: "Su melodía vive siempre",
    cornerIcons: ["🎵", "🎶", "🎸", "🎼"],
    accentClass: "border-amber-400/45 bg-amber-500/15 text-amber-200",
  },
  {
    id: "medicina",
    label: "Médico / Enfermería",
    icon: "🩺",
    badgeText: "Vocación de sanar y cuidar",
    cornerIcons: ["🩺", "⚕️", "🤍", "✨"],
    accentClass: "border-teal-400/45 bg-teal-500/15 text-teal-200",
  },
  {
    id: "docente",
    label: "Maestro / Educador",
    icon: "📚",
    badgeText: "Sembrador de sabiduría",
    cornerIcons: ["📚", "✒️", "🎓", "💡"],
    accentClass: "border-indigo-400/45 bg-indigo-500/15 text-indigo-200",
  },
  {
    id: "campo",
    label: "Agricultor / Campo",
    icon: "🌾",
    badgeText: "Fruto noble de la tierra",
    cornerIcons: ["🌾", "🌱", "🌻", "☀️"],
    accentClass: "border-lime-400/45 bg-lime-500/15 text-lime-200",
  },
  {
    id: "futbol",
    label: "Fútbol / Deporte",
    icon: "⚽",
    badgeText: "Pasión eterna en la cancha",
    cornerIcons: ["⚽", "🥇", "🏟️", "🏆"],
    accentClass: "border-emerald-400/45 bg-emerald-500/15 text-emerald-200",
  },
  {
    id: "mar",
    label: "Marino / Pescador",
    icon: "⚓",
    badgeText: "Rumbo eterno en calma",
    cornerIcons: ["⚓", "⛵", "🌊", "🧭"],
    accentClass: "border-cyan-400/45 bg-cyan-500/15 text-cyan-200",
  },
  {
    id: "fe",
    label: "Fe / Devoción",
    icon: "🕊️",
    badgeText: "En la paz del Señor",
    cornerIcons: ["🕊️", "✝️", "🕯️", "✨"],
    accentClass: "border-gold/50 bg-gold/15 text-gold-soft",
  },
];

export function getDecoracionInfo(id: string | null | undefined): DecoracionTheme {
  return DECORACIONES.find((d) => d.id === id) || DECORACIONES[0];
}
