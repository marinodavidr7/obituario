export type Dato = [string, string];
export type Video = { titulo: string; fuente?: string; url: string };

export type TrackRotacion = {
  id: string;
  titulo: string;
  url: string;
  duracion_dias: number;
};

export type TrackActivoInfo = {
  indice: number;
  total: number;
  diasRestantes: number;
  proximoTitulo?: string;
};

export type Persona = {
  id: string;
  familia_id: string;
  nombre: string;
  apodo: string | null;
  anios: string;
  fechas: string | null;
  epitafio: string | null;
  foto: string | null;
  foto_pos?: string | null;
  bio: string | null;
  datos: Dato[];
  galeria: string[];
  videos: Video[];
  visitas: number;
  velas: number;
  flores: number;
  flores_tipos?: string[];
  orden?: number;
  estado?: "publicado" | "pendiente" | "rechazado";
  solicitante?: string | null;
  contacto?: string | null;
  fecha_solicitud?: string | null;
  musica?: string | null;
  musica_titulo?: string | null;
  musicas_rotacion?: TrackRotacion[];
  musicas_inicio?: string | null;
  track_activo_info?: TrackActivoInfo;
  color?: string | null;
  apellido?: string;
};

export type Familia = {
  id: string;
  apellido: string;
  lema: string | null;
  orden?: number;
  total?: number;
  velas?: number;
  flores?: number;
  fotos?: string[];
};

export type Dedicatoria = {
  id: number | string;
  persona_id: string;
  autor: string;
  texto: string;
  fecha: string;
  persona_nombre?: string;
};

export type FotoPendiente = {
  id: string;
  persona_id: string;
  persona_nombre: string;
  url: string;
  remitente: string;
  fecha: string;
};

export type SanctuaryStats = {
  almas: number;
  familias: number;
  velas: number;
  flores: number;
  visitas: number;
};
