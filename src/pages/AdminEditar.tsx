import { useEffect, useState } from "react";
import Link from "@/components/Link";
import Dedicatorias from "@/components/Dedicatorias";
import NuevaForm from "@/components/NuevaForm";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/toast";
import { useAdmin } from "@/lib/auth";
import {
  aprobarFotoPendiente,
  deletePersona,
  getPersona,
  listDedicatorias,
  listFamilias,
  listFotosPendientes,
  rechazarFotoPendiente,
} from "@/lib/db";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { editarPersona } from "@/lib/actions";
import { navigate } from "@/lib/router";
import type { Persona } from "@/types";

export default function AdminEditar({ id }: { id: string }) {
  const authed = useAdmin();
  const toast = useToast();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [, setTick] = useState(0);
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
      supabase
        .from("personas")
        .select("*")
        .eq("id", id)
        .maybeSingle()
        .then(({ data }) => {
          if (data && !isCancelled) {
            setPersona(data as any);
          }
        });
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
                    src={f.url}
                    alt={`Foto enviada por ${f.remitente}`}
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
