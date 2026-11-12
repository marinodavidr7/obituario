import { useState } from "react";
import Link from "@/components/Link";
import NuevaForm from "@/components/NuevaForm";
import { useAdmin } from "@/lib/auth";
import { listFamilias } from "@/lib/db";
import { crearPersona } from "@/lib/actions";
import { navigate } from "@/lib/router";

export default function AdminNueva() {
  const authed = useAdmin();
  const [error, setError] = useState<string | undefined>();
  const familias = listFamilias().map((f) => ({ id: f.id, apellido: f.apellido }));

  if (!authed) {
    navigate("/admin");
    return null;
  }

  const handleSubmit = async (fd: FormData) => {
    try {
      setError(undefined);
      await crearPersona(fd);
    } catch (err: any) {
      setError(err?.message || "Error al crear");
    }
  };

  return (
    <section className="fade-enter pt-3 sm:pt-8 pb-12 w-full max-w-[1720px] 2xl:max-w-[1920px] mx-auto px-1 sm:px-4">
      <div className="pb-6 mb-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-gold block">Memoria familiar</span>
          <h1 className="font-serif font-light text-3xl sm:text-5xl tracking-[0.06em] text-[#f2efe9] mt-1">
            Inscribir un ser querido
          </h1>
        </div>
        <Link
          href="/admin"
          className="text-[11px] uppercase tracking-[0.18em] text-stone-400 hover:text-gold-soft self-start sm:self-auto"
        >
          ← Volver al panel
        </Link>
      </div>
      <NuevaForm familias={familias} action={handleSubmit} error={error} />
    </section>
  );
}
