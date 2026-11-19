export interface FlorOpcion {
  id: string;
  nombre: string;
  subtitulo: string;
  significado: string;
  img: string;
  badge?: string;
}

export const FLORES_OPCIONES: FlorOpcion[] = [
  {
    id: "lujo",
    nombre: "Rosas Rojas de Lujo",
    subtitulo: "Envoltura noble de cono con lazo de raso carmesí",
    significado: "Amor eterno, honor solemne y devoción profunda",
    img: "/img/flores_lujo_rojas.webp",
    badge: "Colección Exclusiva",
  },
  {
    id: "clasico",
    nombre: "Cúpula de Rosas Silvestres",
    subtitulo: "Ramo esférico tradicional con follaje verde fresco",
    significado: "Cariño inmortal, calidez y memoria viva",
    img: "/img/flores_ramo_rojo.webp",
    badge: "Tradicional",
  },
  {
    id: "ramo40",
    nombre: "Ramo Imperial de 40 Rosas",
    subtitulo: "Arreglo monumental de cuarenta rosas rojas seleccionadas",
    significado: "Veneración suprema, gratitud infinita y homenaje perpetuo",
    img: "/img/flores_ramo_40_rosas.webp",
    badge: "Monumento de Rosas",
  },
  {
    id: "brindis",
    nombre: "Ramo Armonía & Gratitud",
    subtitulo: "Composición primaveral de rosas pastel, lirios y flores del campo",
    significado: "Celebración por su vida compartida y recuerdo luminoso",
    img: "/img/flores_ramo_brindis.webp",
    badge: "Armonía",
  },
  {
    id: "lirios",
    nombre: "Lirios & Rosas de Pureza",
    subtitulo: "Ofrenda blanca inmaculada de lirios y rosas de paz",
    significado: "Paz celestial, serenidad y descanso bendito",
    img: "/img/flores_lirios_blancos.webp",
    badge: "Pureza",
  },
  {
    id: "centro",
    nombre: "Centro Floral de Luz Sagrada",
    subtitulo: "Arreglo ceremonial con flores blancas y luz perpetua",
    significado: "Guía de luz para su alma y bendición eterna",
    img: "/img/flores_centro_velas.webp",
    badge: "Luz Sagrada",
  },
  {
    id: "blanco",
    nombre: "Flores Blancas de Paz",
    subtitulo: "Arreglo celestial sereno con destellos de pureza",
    significado: "Descanso angelical y sosiego eterno",
    img: "/gif/Flores_blancas.gif",
    badge: "Paz Eterna",
  },
];

export function getFlorImg(florId?: string, fallbackIndex = 0): string {
  const match = FLORES_OPCIONES.find((f) => f.id === florId);
  if (match) return match.img;
  if (florId === "ramo40") return "/img/flores_ramo_40_rosas.webp";
  if (florId === "brindis") return "/img/flores_ramo_brindis.webp";
  if (florId === "lirios") return "/img/flores_lirios_blancos.webp";
  if (florId === "centro") return "/img/flores_centro_velas.webp";
  if (florId === "blanco") return "/gif/Flores_blancas.gif";
  return fallbackIndex % 2 === 0 ? "/img/flores_lujo_rojas.webp" : "/img/flores_ramo_rojo.webp";
}

export function getFlorNombre(florId?: string): string {
  const match = FLORES_OPCIONES.find((f) => f.id === florId);
  return match ? match.nombre : "Ramo de rosas en memoria";
}
