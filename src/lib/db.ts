import type {
  Dato,
  Dedicatoria,
  Familia,
  Persona,
  SanctuaryStats,
  TrackActivoInfo,
  TrackRotacion,
  Video,
} from "@/types";
import { initialDedicatorias, initialFamilias, initialPersonas } from "@/data/seed";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  initRealtime,
  registerRealtimeDbSyncHandlers,
  broadcastOfrenda,
  broadcastDedicatoria,
  broadcastDedicatoriaEliminada,
  broadcastPersonaActualizada,
  broadcastPersonaEliminada,
  broadcastFamiliaActualizada,
} from "./realtime";

export type { Dato, Dedicatoria, Familia, Persona, TrackActivoInfo, TrackRotacion, Video };

const STORAGE_KEY_FAMILIAS = "panteon_familias_v1";
const STORAGE_KEY_PERSONAS = "panteon_personas_v1";
const STORAGE_KEY_DEDICATORIAS = "panteon_dedicatorias_v1";
const STORAGE_KEY_CONFIG = "panteon_config_v1";

// Cache en memoria
let cachedFamilias: Familia[] = [];
let cachedPersonas: Persona[] = [];
let cachedDedicatorias: Dedicatoria[] = [];
let cachedConfig: Record<string, string> = {};

function initStorage() {
  if (typeof window === "undefined") {
    cachedFamilias = [...initialFamilias];
    cachedPersonas = [...initialPersonas];
    cachedDedicatorias = [...initialDedicatorias];
    return;
  }

  try {
    const rawF = localStorage.getItem(STORAGE_KEY_FAMILIAS);
    const parsedF = rawF ? JSON.parse(rawF) : null;
    cachedFamilias = Array.isArray(parsedF) ? parsedF : [...initialFamilias];

    const rawP = localStorage.getItem(STORAGE_KEY_PERSONAS);
    const parsedP = rawP ? JSON.parse(rawP) : null;
    cachedPersonas = Array.isArray(parsedP) ? parsedP : [...initialPersonas];

    const rawD = localStorage.getItem(STORAGE_KEY_DEDICATORIAS);
    const parsedD = rawD ? JSON.parse(rawD) : null;
    cachedDedicatorias = Array.isArray(parsedD) ? parsedD : [...initialDedicatorias];

    const rawC = localStorage.getItem(STORAGE_KEY_CONFIG);
    const parsedC = rawC ? JSON.parse(rawC) : null;
    cachedConfig = parsedC && typeof parsedC === "object" ? parsedC : {};
  } catch (e) {
    console.warn("[panteon/db] Error inicializando localStorage:", e);
    cachedFamilias = [...initialFamilias];
    cachedPersonas = [...initialPersonas];
    cachedDedicatorias = [...initialDedicatorias];
    cachedConfig = {};
  }
}

initStorage();

function saveState() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_FAMILIAS, JSON.stringify(cachedFamilias));
    localStorage.setItem(STORAGE_KEY_PERSONAS, JSON.stringify(cachedPersonas));
    localStorage.setItem(STORAGE_KEY_DEDICATORIAS, JSON.stringify(cachedDedicatorias));
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(cachedConfig));
    window.dispatchEvent(new Event("panteon:db-updated"));
  } catch (e) {
    console.error("[panteon/db] Error guardando estado local:", e);
  }
}

const SOUL_COLORS_KEY = "panteon_soul_colors";

export function getStoredSoulColors(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SOUL_COLORS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setStoredSoulColor(personaId: string, color: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    const map = getStoredSoulColors();
    if (color && color !== "default") {
      map[personaId] = color;
    } else {
      delete map[personaId];
    }
    localStorage.setItem(SOUL_COLORS_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn("[panteon/db] Error guardando color de alma local:", e);
  }
}

export async function syncFromSupabase(): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const [famRes, perRes, dedRes, cfgRes] = await Promise.all([
      supabase.from("familias").select("*").order("orden"),
      supabase.from("personas").select("*").order("orden"),
      supabase.from("dedicatorias").select("*").order("fecha", { ascending: false }),
      supabase.from("config").select("*"),
    ]);

    if (famRes.data) {
      cachedFamilias = famRes.data;
    }
    if (perRes.data) {
      // Preservar los colores configurados localmente por el administrador
      // si Supabase aún no tiene la columna 'color' o viene vacía
      const storedColors = getStoredSoulColors();
      const localColorMap = new Map<string, string | null | undefined>(
        cachedPersonas.map((p) => [p.id, p.color])
      );
      cachedPersonas = perRes.data.map((p: any) => ({
        ...p,
        color: p.color || storedColors[p.id] || localColorMap.get(p.id) || null,
      }));
    }
    if (dedRes.data) {
      cachedDedicatorias = dedRes.data;
    }
    if (cfgRes.data) {
      cachedConfig = {};
      cfgRes.data.forEach((r: { clave: string; valor: string }) => {
        cachedConfig[r.clave] = r.valor;
      });
    }

    saveState();
  } catch (err) {
    console.warn("[Supabase] Sincronización en segundo plano:", err);
  }
}

// Registrar manejadores para reflejar eventos Realtime de otros usuarios en la memoria local
registerRealtimeDbSyncHandlers({
  onOfrenda: (data) => {
    const p = cachedPersonas.find((x) => x.id === data.personaId);
    if (p) {
      p.velas = data.velas;
      p.flores = data.flores;
      if (Array.isArray(data.floresTipos)) {
        p.flores_tipos = data.floresTipos;
      }
      saveState();
    }
  },
  onDedicatoria: (data) => {
    if (!cachedDedicatorias.some((d) => String(d.id) === String(data.dedicatoria.id))) {
      cachedDedicatorias = [data.dedicatoria, ...cachedDedicatorias];
      saveState();
    }
  },
  onDedicatoriaEliminada: (data) => {
    cachedDedicatorias = cachedDedicatorias.filter((d) => String(d.id) !== String(data.id));
    saveState();
  },
  onPersonaActualizada: (persona) => {
    const idx = cachedPersonas.findIndex((x) => x.id === persona.id);
    if (idx >= 0) {
      cachedPersonas[idx] = { ...cachedPersonas[idx], ...persona };
    } else {
      cachedPersonas.push(persona);
    }
    saveState();
  },
  onPersonaEliminada: (id) => {
    cachedPersonas = cachedPersonas.filter((p) => p.id !== id);
    cachedDedicatorias = cachedDedicatorias.filter((d) => d.persona_id !== id);
    saveState();
  },
  onFamiliaActualizada: (fam) => {
    const idx = cachedFamilias.findIndex((f) => f.id === fam.id);
    if (idx >= 0) {
      cachedFamilias[idx] = { ...cachedFamilias[idx], ...fam };
    } else {
      cachedFamilias.push(fam);
    }
    saveState();
  },
});

// Iniciar sincronización y conexión en tiempo real si Supabase está disponible
if (typeof window !== "undefined" && isSupabaseConfigured) {
  syncFromSupabase();
  initRealtime();

  // Sincronización en segundo plano al recuperar el foco de la pestaña o volver a estar online
  window.addEventListener("focus", () => syncFromSupabase());
  window.addEventListener("online", () => {
    syncFromSupabase();
    initRealtime();
  });

  // Polling inteligente cada 25s cuando la pestaña está visible
  setInterval(() => {
    if (!document.hidden && navigator.onLine) {
      syncFromSupabase();
    }
  }, 25000);
}

export function getConfig(clave: string): string | null {
  return cachedConfig[clave] || null;
}

export function setConfig(clave: string, valor: string | null): void {
  if (valor === null || valor.trim() === "") {
    delete cachedConfig[clave];
    if (isSupabaseConfigured) {
      supabase.from("config").delete().eq("clave", clave).then();
    }
  } else {
    cachedConfig[clave] = valor.trim();
    if (isSupabaseConfigured) {
      supabase.from("config").upsert({ clave, valor: valor.trim() }).then();
    }
  }
  saveState();
}

export function calcularTrackActivo(
  tracks: TrackRotacion[],
  fechaInicioStr?: string | null
): {
  track: TrackRotacion | null;
  indice: number;
  total: number;
  diasRestantes: number;
  proximoTitulo?: string;
} {
  const validos = (tracks || []).filter((t) => t && t.url && t.url.trim());
  if (validos.length === 0) {
    return { track: null, indice: -1, total: 0, diasRestantes: 0 };
  }

  if (validos.length === 1) {
    return {
      track: validos[0],
      indice: 0,
      total: 1,
      diasRestantes: 9999,
    };
  }

  const duraciones = validos.map((t) => Math.max(1, Number(t.duracion_dias) || 7));
  const cicloTotalDias = duraciones.reduce((a, b) => a + b, 0);

  const ahora = Date.now();
  const inicioMs = fechaInicioStr ? new Date(fechaInicioStr).getTime() : ahora;
  const diffDias = Math.floor(Math.max(0, ahora - inicioMs) / (1000 * 60 * 60 * 24));
  const diaEnCiclo = diffDias % cicloTotalDias;

  let acumulado = 0;
  for (let i = 0; i < validos.length; i++) {
    const dur = duraciones[i];
    if (diaEnCiclo >= acumulado && diaEnCiclo < acumulado + dur) {
      const diasRestantes = acumulado + dur - diaEnCiclo;
      const proximoIdx = (i + 1) % validos.length;
      return {
        track: validos[i],
        indice: i,
        total: validos.length,
        diasRestantes,
        proximoTitulo: validos[proximoIdx].titulo || `Melodía ${proximoIdx + 1}`,
      };
    }
    acumulado += dur;
  }

  return {
    track: validos[0],
    indice: 0,
    total: validos.length,
    diasRestantes: duraciones[0],
  };
}

function hydratePersona(p: Persona): Persona {
  const rotacion = p.musicas_rotacion || [];
  if (rotacion.length > 0) {
    const activa = calcularTrackActivo(rotacion, p.musicas_inicio);
    if (activa.track) {
      return {
        ...p,
        musica: activa.track.url,
        musica_titulo: activa.track.titulo || p.musica_titulo,
        track_activo_info: {
          indice: activa.indice,
          total: activa.total,
          diasRestantes: activa.diasRestantes,
          proximoTitulo: activa.proximoTitulo,
        },
      };
    }
  }
  return p;
}

export function listFamilias(): (Familia & { total: number; velas: number; flores: number; fotos: string[] })[] {
  return cachedFamilias.map((f) => {
    const miembros = cachedPersonas.filter(
      (p) => p.familia_id === f.id && (p.estado === "publicado" || !p.estado)
    );
    const velas = miembros.reduce((acc, m) => acc + (m.velas || 0), 0);
    const flores = miembros.reduce((acc, m) => acc + (m.flores || 0), 0);
    const fotos = miembros
      .map((m) => m.foto)
      .filter(Boolean)
      .slice(0, 4) as string[];

    return {
      ...f,
      total: miembros.length,
      velas,
      flores,
      fotos,
    };
  });
}

export function getFamilia(id: string): Familia | undefined {
  if (!id) return undefined;
  const decoded = decodeURIComponent(id).trim().toLowerCase();
  return cachedFamilias.find((f) => f.id === id || f.id.toLowerCase() === decoded);
}

export function listPersonas(familiaId?: string, incluirNoPublicados = false): Persona[] {
  let list = cachedPersonas;
  if (familiaId) {
    list = list.filter((p) => p.familia_id === familiaId);
  }
  if (!incluirNoPublicados) {
    list = list.filter((p) => p.estado === "publicado" || !p.estado);
  }
  const storedColors = getStoredSoulColors();
  return list.map((p) => {
    const h = hydratePersona(p);
    if (!h.color && storedColors[h.id]) {
      h.color = storedColors[h.id];
    }
    return h;
  });
}

export function getPersona(id: string): Persona | undefined {
  if (!id) return undefined;
  const decoded = decodeURIComponent(id).trim().toLowerCase();
  const p = cachedPersonas.find(
    (x) => x.id === id || x.id.toLowerCase() === decoded || slugify(x.nombre) === decoded
  );
  if (!p) return undefined;
  const hydrated = hydratePersona(p);
  if (!hydrated.color) {
    const storedColors = getStoredSoulColors();
    if (storedColors[hydrated.id]) {
      hydrated.color = storedColors[hydrated.id];
    }
  }
  return hydrated;
}

export function listSolicitudesPendientes(): (Persona & { familia_apellido: string })[] {
  const mapFam = new Map(cachedFamilias.map((f) => [f.id, f.apellido]));
  return cachedPersonas
    .filter((p) => p.estado === "pendiente")
    .map((p) => ({
      ...hydratePersona(p),
      familia_apellido: mapFam.get(p.familia_id) || "Sin familia",
    }));
}

export function contarSolicitudesPendientes(): number {
  return cachedPersonas.filter((p) => p.estado === "pendiente").length;
}

export function aprobarPersona(id: string): boolean {
  const p = cachedPersonas.find((x) => x.id === id);
  if (!p) return false;
  p.estado = "publicado";
  saveState();
  if (isSupabaseConfigured) {
    supabase.from("personas").update({ estado: "publicado" }).eq("id", id).then();
  }
  return true;
}

export async function rechazarPersona(id: string): Promise<boolean> {
  const res = await deletePersona(id);
  return res.success;
}

export function listDedicatorias(personaId: string): Dedicatoria[] {
  return cachedDedicatorias
    .filter((d) => d.persona_id === personaId)
    .sort((a, b) => (new Date(b.fecha).getTime() || 0) - (new Date(a.fecha).getTime() || 0));
}

export function stats(): SanctuaryStats {
  const publicados = cachedPersonas.filter((p) => p.estado === "publicado" || !p.estado);
  const almas = publicados.length;
  const familias = cachedFamilias.length;
  const velas = publicados.reduce((acc, p) => acc + (p.velas || 0), 0);
  const flores = publicados.reduce((acc, p) => acc + (p.flores || 0), 0);
  const visitas = publicados.reduce((acc, p) => acc + (p.visitas || 0), 0);

  return { almas, familias, velas, flores, visitas };
}

export function addVisita(personaId: string): void {
  const p = cachedPersonas.find((x) => x.id === personaId);
  if (p) {
    p.visitas = (p.visitas || 0) + 1;
    saveState();
    if (isSupabaseConfigured) {
      supabase.rpc("increment_visita", { persona_id: personaId }).then(async ({ error }) => {
        if (error) {
          await supabase.from("personas").update({ visitas: p.visitas }).eq("id", personaId);
        }
      });
    }
  }
}

export function addOfrenda(
  personaId: string,
  tipo: "vela" | "flor",
  florTipo?: string
): { velas: number; flores: number; flores_tipos?: string[] } {
  const p = cachedPersonas.find((x) => x.id === personaId);
  if (!p) return { velas: 0, flores: 0 };

  if (tipo === "vela") {
    p.velas = (p.velas || 0) + 1;
  } else {
    p.flores = (p.flores || 0) + 1;
    const elegido = florTipo || "lujo";
    p.flores_tipos = [...(p.flores_tipos || []), elegido];
  }
  saveState();

  // Enviar a Supabase y emitir broadcast Realtime a todos los usuarios
  if (isSupabaseConfigured) {
    supabase
      .from("personas")
      .update({ velas: p.velas, flores: p.flores, flores_tipos: p.flores_tipos })
      .eq("id", personaId)
      .then();
  }

  broadcastOfrenda(personaId, p.velas, p.flores, p.flores_tipos, tipo, florTipo);

  return { velas: p.velas || 0, flores: p.flores || 0, flores_tipos: p.flores_tipos };
}

export function addDedicatoria(personaId: string, autor: string, texto: string): Dedicatoria {
  const fecha = new Date().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const id = Date.now().toString();
  const nueva: Dedicatoria = {
    id,
    persona_id: personaId,
    autor,
    texto,
    fecha,
  };

  cachedDedicatorias.unshift(nueva);
  saveState();

  if (isSupabaseConfigured) {
    supabase.from("dedicatorias").insert([nueva]).then();
  }

  broadcastDedicatoria(personaId, nueva);

  return nueva;
}

export function listTodasDedicatorias(limit = 50): (Dedicatoria & { persona_nombre: string })[] {
  const mapPer = new Map(cachedPersonas.map((p) => [p.id, p.nombre]));
  return cachedDedicatorias.slice(0, limit).map((d) => ({
    ...d,
    persona_nombre: mapPer.get(d.persona_id) || "Ser querido",
  }));
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function upsertFamilia(f: { id: string; apellido: string; lema?: string | null }): void {
  const idx = cachedFamilias.findIndex((item) => item.id === f.id);
  if (idx >= 0) {
    cachedFamilias[idx] = { ...cachedFamilias[idx], ...f };
  } else {
    cachedFamilias.push({
      id: f.id,
      apellido: f.apellido,
      lema: f.lema ?? null,
      orden: cachedFamilias.length + 1,
    });
  }
  saveState();
  if (isSupabaseConfigured) {
    supabase.from("familias").upsert(cachedFamilias[idx >= 0 ? idx : cachedFamilias.length - 1]).then();
  }
}

export function insertPersona(p: Omit<Persona, "visitas" | "velas" | "flores">): void {
  const nueva: Persona = {
    ...p,
    visitas: 0,
    velas: 0,
    flores: 0,
    foto_pos: p.foto_pos ?? "50% 50%",
    estado: p.estado ?? "publicado",
    solicitante: p.solicitante ?? null,
    contacto: p.contacto ?? null,
    fecha_solicitud: p.fecha_solicitud ?? new Date().toISOString(),
    musica: p.musica ?? null,
    musica_titulo: p.musica_titulo ?? null,
    musicas_rotacion: p.musicas_rotacion ?? [],
    musicas_inicio: p.musicas_inicio ?? null,
    color: p.color ?? null,
    datos: p.datos || [],
    galeria: p.galeria || [],
    videos: p.videos || [],
    orden: cachedPersonas.length + 1,
  };

  if (nueva.color) {
    setStoredSoulColor(nueva.id, nueva.color);
  }

  cachedPersonas.push(nueva);
  saveState();
  broadcastPersonaActualizada(nueva);

  if (isSupabaseConfigured) {
    supabase.from("personas").insert([nueva]).then(({ error }) => {
      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("color") || error.code === "PGRST204" || error.code === "42703") {
          console.warn("[Supabase] Tabla personas sin columna color, insertando sin ella:", error.message);
          const { color: _c, ...sinColor } = nueva;
          supabase.from("personas").insert([sinColor]).then();
        } else {
          console.error("[Supabase] Error al insertar persona:", error);
        }
      }
    });
  }
}

export function updatePersona(p: Omit<Persona, "visitas" | "velas" | "flores">): void {
  const idx = cachedPersonas.findIndex((x) => x.id === p.id);
  if (idx >= 0) {
    const actual = cachedPersonas[idx];
    const finalColor = p.color !== undefined ? p.color : actual.color ?? null;
    setStoredSoulColor(p.id, finalColor);

    cachedPersonas[idx] = {
      ...actual,
      ...p,
      foto: p.foto !== undefined ? p.foto : actual.foto,
      foto_pos: p.foto_pos !== undefined ? p.foto_pos : (actual.foto_pos ?? "50% 50%"),
      estado: p.estado !== undefined ? p.estado : (actual.estado ?? "publicado"),
      solicitante: p.solicitante !== undefined ? p.solicitante : actual.solicitante,
      contacto: p.contacto !== undefined ? p.contacto : actual.contacto,
      fecha_solicitud: p.fecha_solicitud !== undefined ? p.fecha_solicitud : actual.fecha_solicitud,
      musica: p.musica !== undefined ? p.musica : actual.musica,
      musica_titulo: p.musica_titulo !== undefined ? p.musica_titulo : actual.musica_titulo,
      musicas_rotacion: p.musicas_rotacion !== undefined ? p.musicas_rotacion : (actual.musicas_rotacion ?? []),
      musicas_inicio: p.musicas_inicio !== undefined ? p.musicas_inicio : actual.musicas_inicio,
      color: finalColor,
      datos: p.datos !== undefined ? p.datos : (actual.datos || []),
      galeria: p.galeria !== undefined ? p.galeria : (actual.galeria || []),
      videos: p.videos !== undefined ? p.videos : (actual.videos || []),
    };
    saveState();
    broadcastPersonaActualizada(cachedPersonas[idx]);

    if (isSupabaseConfigured) {
      supabase.from("personas").upsert(cachedPersonas[idx]).then(({ error }) => {
        if (error) {
          const msg = (error.message || "").toLowerCase();
          if (msg.includes("color") || error.code === "PGRST204" || error.code === "42703") {
            console.warn("[Supabase] Tabla personas sin columna color, guardando sin ella:", error.message);
            const { color: _c, ...sinColor } = cachedPersonas[idx];
            supabase.from("personas").upsert(sinColor).then();
          } else {
            console.error("[Supabase] Error al actualizar persona en Supabase:", error);
          }
        }
      });
    }
  }
}

export async function deletePersona(id: string): Promise<{ success: boolean; error?: string }> {
  setStoredSoulColor(id, null);
  const personaAEliminar = cachedPersonas.find((x) => x.id === id);
  cachedPersonas = cachedPersonas.filter((x) => x.id !== id);
  cachedDedicatorias = cachedDedicatorias.filter((d) => d.persona_id !== id);

  // Actualizar estadísticas de la familia afectada
  if (personaAEliminar) {
    const fam = cachedFamilias.find((f) => f.id === personaAEliminar.familia_id);
    if (fam) {
      const restantes = cachedPersonas.filter(
        (p) => p.familia_id === fam.id && (p.estado === "publicado" || !p.estado)
      );
      fam.total = restantes.length;
      fam.velas = restantes.reduce((acc, m) => acc + (m.velas || 0), 0);
      fam.flores = restantes.reduce((acc, m) => acc + (m.flores || 0), 0);
      fam.fotos = restantes.map((m) => m.foto).filter(Boolean).slice(0, 4) as string[];
    }
  }
  saveState();
  broadcastPersonaEliminada(id);

  if (isSupabaseConfigured) {
    try {
      // 1. Borrar dedicatorias asociadas en Supabase por integridad
      await supabase.from("dedicatorias").delete().eq("persona_id", id);

      // 2. Borrar permanentemente el alma de la tabla personas en Supabase
      const { error } = await supabase.from("personas").delete().eq("id", id);
      if (error) {
        console.error("[Supabase] Error al eliminar persona en la base de datos:", error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.error("[Supabase] Fallo al eliminar alma:", err);
      return { success: false, error: err?.message || "Error al eliminar" };
    }
  }
  return { success: true };
}

export async function deleteFamilia(id: string): Promise<{ success: boolean; error?: string }> {
  cachedFamilias = cachedFamilias.filter((f) => f.id !== id);
  const personasIds = cachedPersonas.filter((p) => p.familia_id === id).map((p) => p.id);
  cachedPersonas = cachedPersonas.filter((p) => p.familia_id !== id);
  cachedDedicatorias = cachedDedicatorias.filter((d) => !personasIds.includes(d.persona_id));
  saveState();

  if (isSupabaseConfigured) {
    try {
      if (personasIds.length > 0) {
        await supabase.from("dedicatorias").delete().in("persona_id", personasIds);
        await supabase.from("personas").delete().in("id", personasIds);
      }
      const { error } = await supabase.from("familias").delete().eq("id", id);
      if (error) {
        console.error("[Supabase] Error al eliminar familia en base de datos:", error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.error("[Supabase] Fallo al eliminar familia:", err);
      return { success: false, error: err?.message || "Error al eliminar" };
    }
  }
  return { success: true };
}

export async function deleteDedicatoria(id: string | number): Promise<{ success: boolean; error?: string }> {
  cachedDedicatorias = cachedDedicatorias.filter((x) => String(x.id) !== String(id));
  saveState();
  broadcastDedicatoriaEliminada(id);

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from("dedicatorias").delete().eq("id", id);
      if (error) {
        console.error("[Supabase] Error al eliminar dedicatoria en base de datos:", error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.error("[Supabase] Fallo al eliminar dedicatoria:", err);
      return { success: false, error: err?.message || "Error al eliminar" };
    }
  }
  return { success: true };
}
