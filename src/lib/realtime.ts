import { isSupabaseConfigured, supabase } from "./supabase";
import type { Dedicatoria, Familia, Persona } from "@/types";

const REALTIME_CHANNEL_NAME = "panteon-santuario-realtime";

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isInitialized = false;

// Callbacks internos para sincronizar con la caché de db.ts
let onRealtimeOfrendaCallback:
  | ((data: {
      personaId: string;
      velas: number;
      flores: number;
      floresTipos?: string[];
      tipo?: "vela" | "flor";
      florNombre?: string;
    }) => void)
  | null = null;

let onRealtimeDedicatoriaCallback:
  | ((data: { personaId: string; dedicatoria: Dedicatoria }) => void)
  | null = null;

let onRealtimeDedicatoriaEliminadaCallback:
  | ((data: { id: string | number }) => void)
  | null = null;

let onRealtimePersonaActualizadaCallback: ((persona: Persona) => void) | null = null;
let onRealtimePersonaEliminadaCallback: ((id: string) => void) | null = null;
let onRealtimeFamiliaActualizadaCallback: ((familia: Familia) => void) | null = null;

export function registerRealtimeDbSyncHandlers(handlers: {
  onOfrenda: typeof onRealtimeOfrendaCallback;
  onDedicatoria: typeof onRealtimeDedicatoriaCallback;
  onDedicatoriaEliminada: typeof onRealtimeDedicatoriaEliminadaCallback;
  onPersonaActualizada: typeof onRealtimePersonaActualizadaCallback;
  onPersonaEliminada: typeof onRealtimePersonaEliminadaCallback;
  onFamiliaActualizada: typeof onRealtimeFamiliaActualizadaCallback;
}) {
  onRealtimeOfrendaCallback = handlers.onOfrenda;
  onRealtimeDedicatoriaCallback = handlers.onDedicatoria;
  onRealtimeDedicatoriaEliminadaCallback = handlers.onDedicatoriaEliminada;
  onRealtimePersonaActualizadaCallback = handlers.onPersonaActualizada;
  onRealtimePersonaEliminadaCallback = handlers.onPersonaEliminada;
  onRealtimeFamiliaActualizadaCallback = handlers.onFamiliaActualizada;
}

/**
 * Inicializa la conexión en tiempo real (Supabase Realtime Broadcast & Postgres Changes)
 */
export function initRealtime(): void {
  if (typeof window === "undefined" || !isSupabaseConfigured || isInitialized) {
    return;
  }
  isInitialized = true;

  try {
    realtimeChannel = supabase.channel(REALTIME_CHANNEL_NAME, {
      config: {
        broadcast: { ack: false, self: false },
      },
    });

    // 1. ESCUCHAR BROADCASTS EN TIEMPO REAL (Latencia 0 sin requerir permisos de replicación en Postgres)
    realtimeChannel
      .on("broadcast", { event: "ofrenda" }, (payload) => {
        const data = payload.payload;
        if (data && data.personaId) {
          onRealtimeOfrendaCallback?.(data);
          window.dispatchEvent(new CustomEvent("panteon:realtime-ofrenda", { detail: data }));
          window.dispatchEvent(new Event("panteon:db-updated"));
        }
      })
      .on("broadcast", { event: "dedicatoria" }, (payload) => {
        const data = payload.payload;
        if (data && data.personaId && data.dedicatoria) {
          onRealtimeDedicatoriaCallback?.(data);
          window.dispatchEvent(new CustomEvent("panteon:realtime-dedicatoria", { detail: data }));
          window.dispatchEvent(new Event("panteon:db-updated"));
        }
      })
      .on("broadcast", { event: "dedicatoria-eliminada" }, (payload) => {
        const data = payload.payload;
        if (data && data.id != null) {
          onRealtimeDedicatoriaEliminadaCallback?.(data);
          window.dispatchEvent(new CustomEvent("panteon:realtime-dedicatoria-eliminada", { detail: data }));
          window.dispatchEvent(new Event("panteon:db-updated"));
        }
      })
      .on("broadcast", { event: "persona-actualizada" }, (payload) => {
        const data = payload.payload;
        if (data && data.id) {
          onRealtimePersonaActualizadaCallback?.(data);
          window.dispatchEvent(new CustomEvent("panteon:realtime-persona-actualizada", { detail: data }));
          window.dispatchEvent(new Event("panteon:db-updated"));
        }
      })
      .on("broadcast", { event: "persona-eliminada" }, (payload) => {
        const data = payload.payload;
        if (data && data.id) {
          onRealtimePersonaEliminadaCallback?.(data.id);
          window.dispatchEvent(new CustomEvent("panteon:realtime-persona-eliminada", { detail: data }));
          window.dispatchEvent(new Event("panteon:db-updated"));
        }
      })
      .on("broadcast", { event: "familia-actualizada" }, (payload) => {
        const data = payload.payload;
        if (data && data.id) {
          onRealtimeFamiliaActualizadaCallback?.(data);
          window.dispatchEvent(new Event("panteon:db-updated"));
        }
      });

    // 2. ESCUCHAR CAMBIOS DE POSTGRESQL (si el usuario habilitó supabase_realtime en Postgres)
    realtimeChannel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "personas" },
        (payload) => {
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const row = payload.new as Persona;
            if (row && row.id) {
              onRealtimePersonaActualizadaCallback?.(row);
              window.dispatchEvent(
                new CustomEvent("panteon:realtime-ofrenda", {
                  detail: {
                    personaId: row.id,
                    velas: row.velas || 0,
                    flores: row.flores || 0,
                    floresTipos: row.flores_tipos || [],
                  },
                })
              );
              window.dispatchEvent(new Event("panteon:db-updated"));
            }
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id: string };
            if (oldRow && oldRow.id) {
              onRealtimePersonaEliminadaCallback?.(oldRow.id);
              window.dispatchEvent(new Event("panteon:db-updated"));
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dedicatorias" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as any;
            if (row && row.persona_id) {
              const ded: Dedicatoria = {
                id: row.id,
                persona_id: row.persona_id,
                autor: row.autor,
                texto: row.texto,
                fecha: new Date(row.fecha || Date.now()).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
                persona_nombre: row.persona_nombre || "Ser querido",
              };
              onRealtimeDedicatoriaCallback?.({ personaId: row.persona_id, dedicatoria: ded });
              window.dispatchEvent(
                new CustomEvent("panteon:realtime-dedicatoria", {
                  detail: { personaId: row.persona_id, dedicatoria: ded },
                })
              );
              window.dispatchEvent(new Event("panteon:db-updated"));
            }
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id: number | string };
            if (oldRow && oldRow.id != null) {
              onRealtimeDedicatoriaEliminadaCallback?.({ id: oldRow.id });
              window.dispatchEvent(
                new CustomEvent("panteon:realtime-dedicatoria-eliminada", { detail: { id: oldRow.id } })
              );
              window.dispatchEvent(new Event("panteon:db-updated"));
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "familias" },
        (payload) => {
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const row = payload.new as Familia;
            if (row && row.id) {
              onRealtimeFamiliaActualizadaCallback?.(row);
              window.dispatchEvent(new Event("panteon:db-updated"));
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "config" },
        () => {
          window.dispatchEvent(new Event("panteon:db-updated"));
        }
      );

    realtimeChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("[Supabase Realtime] Santuario conectado en vivo.");
      }
    });
  } catch (err) {
    console.warn("[Supabase Realtime] No se pudo inicializar el canal:", err);
  }
}

// Emisores de Broadcast hacia todos los clientes
export function broadcastOfrenda(
  personaId: string,
  velas: number,
  flores: number,
  floresTipos?: string[],
  tipo?: "vela" | "flor",
  florNombre?: string
): void {
  if (!realtimeChannel) return;
  realtimeChannel.send({
    type: "broadcast",
    event: "ofrenda",
    payload: { personaId, velas, flores, floresTipos, tipo, florNombre },
  });
}

export function broadcastDedicatoria(personaId: string, dedicatoria: Dedicatoria): void {
  if (!realtimeChannel) return;
  realtimeChannel.send({
    type: "broadcast",
    event: "dedicatoria",
    payload: { personaId, dedicatoria },
  });
}

export function broadcastDedicatoriaEliminada(id: string | number): void {
  if (!realtimeChannel) return;
  realtimeChannel.send({
    type: "broadcast",
    event: "dedicatoria-eliminada",
    payload: { id },
  });
}

export function broadcastPersonaActualizada(persona: Persona): void {
  if (!realtimeChannel) return;
  realtimeChannel.send({
    type: "broadcast",
    event: "persona-actualizada",
    payload: persona,
  });
}

export function broadcastPersonaEliminada(id: string): void {
  if (!realtimeChannel) return;
  realtimeChannel.send({
    type: "broadcast",
    event: "persona-eliminada",
    payload: { id },
  });
}

export function broadcastFamiliaActualizada(familia: Familia): void {
  if (!realtimeChannel) return;
  realtimeChannel.send({
    type: "broadcast",
    event: "familia-actualizada",
    payload: familia,
  });
}
