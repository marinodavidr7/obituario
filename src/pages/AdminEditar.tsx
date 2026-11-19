import { useEffect, useState } from "react";
import Link from "@/components/Link";
import { normalizarUrlImagen } from "@/lib/imageUrl";

import Dedicatorias from "@/components/Dedicatorias";
import NuevaForm from "@/components/NuevaForm";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/toast";
import { useAdmin } from "@/lib/auth";
import {
  aprobarFotoPendiente,
  deletePersona,
  getPersona,
  personasSelectColumns,
  getVinculosPersona,
  listDedicatorias,
  listFamilias,
  listFotosPendientes,
  listPersonas,
  rechazarFotoPendiente,
  setVinculosPersona,
} from "@/lib/db";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { editarPersona } from "@/lib/actions";
import { navigate } from "@/lib/router";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { Persona } from "@/types";

export default function AdminEditar({ id }: { id: string }) {
  const authed = useAdmin();
  const toast = useToast();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [, setTick] = useState(0);
  const [vinculoPersonaId, setVinculoPersonaId] = useState("");
  const [vinculoBusqueda, setVinculoBusqueda] = useState("");
  const vinculoBusquedaDebounced = useDebouncedValue(vinculoBusqueda, 180);
  const [vinculoDropdownAbierto, setVinculoDropdownAbierto] = useState(false);
  const [vinculoRelacion, setVinculoRelacion] = useState("Esposo/a");
  const [guardandoVinculo, setGuardandoVinculo] = useState(false);
  const familias = listFamilias().map((f) => ({ id: f.id, apellido: f.apellido }));

  useEffect(() => {
    const onUpdate = () => setTick((t) => t + 1);
    window.addEventListener("panteon:db-updated", onUpdate);
    return () => window.removeEventListener("panteon:db-updated", onUpdate);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let p = getPersona(id);
    if (!p) {
      const decoded = decodeURIComponent(id || "");
      if (decoded !== id) p = getPersona(decoded);
    }
    if (p) {
      setPersona(p);
    }

    if (isSupabaseConfigured) {
      void (async () => {
        try {
          const cols = await personasSelectColumns();
          const { data } = await supabase
            .from("personas")
            .select(cols)
            .eq("id", id)
            .maybeSingle();
          if (data && !isCancelled) {
            setPersona(data as any);
          }
        } catch {
          /* usar caché local */
        }
      })();
    }

    return () => {
      isCancelled = true;
    };
  }, [id]);

  if (!authed) {
    navigate("/admin");
    return null;
  }

  if (!persona) {
    return (
      <div className="py-24 text-center">
        <p className="font-serif text-2xl text-stone-300 mb-4">Ser querido no encontrado.</p>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gold/40 text-gold-soft text-xs uppercase tracking-widest"
        >
          Volver al panel
        </Link>
      </div>
    );
  }

  const handleDelete = () => {
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    const res = await deletePersona(id);
    setConfirmOpen(false);
    if (res.error) {
      toast(`Aviso: ${res.error}`, "warning");
    } else {
      toast(`${persona.nombre} ha sido eliminado de la base de datos`, "delete");
    }
    navigate("/admin");
  };

  const handleSubmit = async (fd: FormData) => {
    try {
      setError(undefined);
      await editarPersona(id, fd);
      toast("Cambios guardados correctamente", "success");
    } catch (err: any) {
      setError(err?.message || "Error al actualizar");
    }
  };

  return (
    <section className="fade-enter pt-3 sm:pt-8 pb-12 w-full max-w-[1720px] 2xl:max-w-[1920px] mx-auto px-1 sm:px-4">
      <div className="pb-6 mb-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-gold block">Panel de edición</span>
          <h1 className="font-serif font-light text-3xl sm:text-5xl tracking-[0.06em] text-[#f2efe9] mt-1">
            Editar a {persona.nombre}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/persona/${persona.id}`}
            className="text-[11px] uppercase tracking-[0.18em] text-gold-soft hover:underline"
          >
            Ver Ficha
          </Link>
          <span className="text-stone-600">·</span>
          <Link
            href="/admin"
            className="text-[11px] uppercase tracking-[0.18em] text-stone-400 hover:text-gold-soft"
          >
            ← Volver al panel
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="px-3.5 py-1.5 rounded-full border border-rose-500/40 text-[11px] uppercase tracking-wider text-rose-300 hover:bg-rose-500/20 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span>🗑️</span>
            <span>Eliminar</span>
          </button>
        </div>
      </div>

      <NuevaForm
        key={`${persona.id}-${persona.videos?.length || 0}`}
        familias={familias}
        action={handleSubmit}
        error={error}
        personaInicial={persona}
      />

      {/* Fotos Pendientes de Aprobación de este perfil */}
      {(() => {
        const pendientes = listFotosPendientes(persona.id);
        if (pendientes.length === 0) return null;
        return (
          <section className="mt-10 p-5 sm:p-6 rounded-2xl border border-amber-500/30 bg-amber-950/15 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif text-xl text-amber-200">
                📸 Fotos enviadas por familiares ({pendientes.length})
              </h2>
              <span className="text-[11px] uppercase tracking-wider text-amber-300/80">
                En espera de aprobación
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {pendientes.map((f) => (
                <div
                  key={f.id}
                  className="rounded-xl overflow-hidden border border-white/10 bg-stone-950/70 flex flex-col"
                >
                  <img
                    src={normalizarUrlImagen(f.url, 480)}
                    alt={`Foto enviada por ${f.remitente}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-44 object-cover"
                  />
                  <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div className="text-xs text-stone-300">
                      Enviada por <span className="text-gold-soft font-medium">{f.remitente}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await aprobarFotoPendiente(f.id);
                          if (res.success) {
                            const updated = getPersona(persona.id);
                            if (updated) setPersona({ ...updated });
                            toast("Foto aprobada y agregada a la galería", "success");
                          } else {
                            toast(res.error || "No se pudo aprobar", "warning");
                          }
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-xs uppercase tracking-wider cursor-pointer"
                      >
                        ✅ Aprobar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await rechazarFotoPendiente(f.id);
                          toast("Foto rechazada", "delete");
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 text-xs uppercase tracking-wider cursor-pointer"
                      >
                        ❌ Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Vínculos Familiares (Árbol de memorias) */}
      {(() => {
        const vinculos = getVinculosPersona(persona.id);
        const candidatas = listPersonas().filter((item) => item.id !== persona.id);
        const relacionesSugeridas = [
          "Esposo/a",
          "Padre",
          "Madre",
          "Hijo/a",
          "Hermano/a",
          "Abuelo/a",
          "Nieto/a",
          "Tío/a",
          "Primo/a",
        ];

        return (
          <section className="mt-10 p-5 sm:p-6 rounded-2xl border border-white/10 bg-stone-900/50 space-y-4">
            <div>
              <h2 className="font-serif text-xl text-stone-100">
                🌿 Vínculos Familiares (Árbol de Memorias)
              </h2>
              <p className="text-xs text-stone-400">
                Conecta este perfil con otros seres queridos del santuario para navegar entre familiares con un clic.
              </p>
            </div>

            {vinculos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {vinculos.map((v, idx) => {
                  const famPersona = getPersona(v.persona_id);
                  return (
                    <div
                      key={`${v.persona_id}-${idx}`}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-white/10 bg-stone-950/60"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-gold-soft bg-gold/10 border border-gold/25 px-2 py-0.5 rounded-full">
                          {v.relacion}
                        </span>
                        <p className="text-sm text-stone-100 font-serif mt-1 truncate">
                          {famPersona?.nombre || v.persona_id}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={guardandoVinculo}
                        onClick={async () => {
                          setGuardandoVinculo(true);
                          const nuevos = vinculos.filter((_, i) => i !== idx);
                          const res = await setVinculosPersona(persona.id, nuevos);
                          setGuardandoVinculo(false);
                          if (res.success) {
                            toast("Vínculo eliminado", "delete");
                          } else {
                            toast(res.error || "No se pudo eliminar el vínculo", "warning");
                          }
                        }}
                        className="px-2.5 py-1 rounded-full border border-rose-500/35 text-[10px] uppercase tracking-wider text-rose-300 hover:bg-rose-500/15 cursor-pointer shrink-0"
                      >
                        Quitar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <select
                value={vinculoRelacion}
                onChange={(e) => setVinculoRelacion(e.target.value)}
                className="bg-stone-950 border border-white/15 focus:border-gold rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none"
              >
                {relacionesSugeridas.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel}
                  </option>
                ))}
              </select>

              <div className="relative">
                <input
                  type="text"
                  value={vinculoBusqueda}
                  onFocus={() => setVinculoDropdownAbierto(true)}
                  onBlur={() => setTimeout(() => setVinculoDropdownAbierto(false), 150)}
                  onChange={(e) => {
                    setVinculoBusqueda(e.target.value);
                    setVinculoPersonaId("");
                    setVinculoDropdownAbierto(true);
                  }}
                  placeholder="🔍 Buscar familiar por nombre o año..."
                  className="w-full bg-stone-950 border border-white/15 focus:border-gold rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none"
                />
                {vinculoDropdownAbierto && (
                  <div className="absolute left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-xl border border-gold/30 bg-[#0d1117] shadow-2xl z-30 divide-y divide-white/5">
                    {(() => {
                      const q = vinculoBusquedaDebounced.trim().toLowerCase();
                      const filtradas = candidatas
                        .filter(
                          (c) =>
                            !q ||
                            c.nombre.toLowerCase().includes(q) ||
                            (c.apodo && c.apodo.toLowerCase().includes(q)) ||
                            c.anios.toLowerCase().includes(q)
                        )
                        .slice(0, 40);
                      if (filtradas.length === 0) {
                        return (
                          <div className="px-3 py-2.5 text-xs text-stone-500 italic">
                            No se encontraron familiares con "{vinculoBusqueda}".
                          </div>
                        );
                      }
                      return filtradas.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setVinculoPersonaId(c.id);
                            setVinculoBusqueda(`${c.nombre} (${c.anios})`);
                            setVinculoDropdownAbierto(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-gold/15 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                            vinculoPersonaId === c.id ? "bg-gold/20 text-gold-soft" : "text-stone-200"
                          }`}
                        >
                          <span className="truncate font-medium">{c.nombre}</span>
                          <span className="text-[10px] text-stone-400 shrink-0">{c.anios}</span>
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={!vinculoPersonaId || guardandoVinculo}
                onClick={async () => {
                  if (!vinculoPersonaId) return;
                  setGuardandoVinculo(true);
                  const yaExiste = vinculos.some(
                    (v) => v.persona_id === vinculoPersonaId && v.relacion === vinculoRelacion
                  );
                  if (yaExiste) {
                    setGuardandoVinculo(false);
                    toast("Ese vínculo ya está agregado", "warning");
                    return;
                  }
                  const nuevos = [
                    ...vinculos,
                    { persona_id: vinculoPersonaId, relacion: vinculoRelacion },
                  ];
                  const res = await setVinculosPersona(persona.id, nuevos);
                  setGuardandoVinculo(false);
                  if (res.success) {
                    setVinculoPersonaId("");
                    setVinculoBusqueda("");
                    toast("Vínculo familiar guardado", "success");
                  } else {
                    toast(res.error || "No se pudo guardar el vínculo", "warning");
                  }
                }}
                className="px-4 py-2 rounded-lg bg-gold/20 hover:bg-gold/30 disabled:opacity-40 border border-gold/45 text-gold-soft text-xs uppercase tracking-wider cursor-pointer"
              >
                {guardandoVinculo ? "Guardando..." : "+ Agregar vínculo"}
              </button>
            </div>
          </section>
        );
      })()}

      {/* Dedicatorias del perfil (edición y moderación directa) */}
      <section className="mt-10 p-5 sm:p-6 rounded-2xl border border-white/10 bg-stone-900/50 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-xl text-stone-100">
              💌 Dedicatorias de {persona.nombre}
            </h2>
            <p className="text-xs text-stone-400">
              Aquí puedes leer, editar, corregir ortografía o eliminar las dedicatorias de este perfil.
            </p>
          </div>
        </div>
        <Dedicatorias
          personaId={persona.id}
          nombre={persona.nombre}
          inicial={listDedicatorias(persona.id)}
          esAdmin={true}
        />
      </section>

      {/* Zona de Peligro / Borrado directo */}
      <div className="mt-12 p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-xl text-rose-200">Zona de eliminación permanente</h3>
          <p className="text-xs text-stone-400 mt-1 max-w-lg">
            Si eliminas a este ser querido, su lápida, fotografías, videos, dedicatorias y ofrendas se borrarán
            definitivamente de la base de datos de Supabase.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          className="px-5 py-2.5 rounded-full bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500 text-rose-200 text-xs uppercase tracking-wider font-medium active:scale-95 transition-all shrink-0"
        >
          🗑️ Eliminar definitivamente
        </button>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title={`¿Eliminar a ${persona.nombre}?`}
        message={`Esta acción borrará permanentemente la lápida de ${persona.nombre}, junto con todas sus fotografías, recuerdos, dedicatorias y ofrendas en Supabase.`}
        confirmText="Sí, Eliminar Definitivamente"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}
