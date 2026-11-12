import { useEffect, useState } from "react";
import Link from "@/components/Link";
import NuevaForm from "@/components/NuevaForm";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/toast";
import { useAdmin } from "@/lib/auth";
import { deletePersona, getPersona, listFamilias } from "@/lib/db";
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
  const familias = listFamilias().map((f) => ({ id: f.id, apellido: f.apellido }));

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
    <section className="fade-enter pt-3 sm:pt-8 pb-12 w-full max-w-7xl mx-auto">
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

      <NuevaForm familias={familias} action={handleSubmit} error={error} personaInicial={persona} />

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
