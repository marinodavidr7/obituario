export type DatosBiografiaIA = {
  nombre: string;
  apodo?: string;
  anios?: string;
  fechas?: string;
  familia?: string;
  epitafio?: string;
  notas: string;
};

/**
 * Pide a la IA del servidor que redacte una biografía conmemorativa
 * a partir de las notas escritas por la familia.
 * La clave de OpenRouter permanece siempre en el servidor.
 */
export async function generarBiografia(datos: DatosBiografiaIA): Promise<string> {
  const res = await fetch("/api/ia", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo: "biografia", ...datos }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    throw new Error(
      data?.error || "No se pudo redactar la biografía con IA. Inténtalo de nuevo."
    );
  }

  const biografia = String(data.biografia || "").trim();
  if (!biografia) {
    throw new Error("La IA no devolvió texto. Inténtalo de nuevo.");
  }
  return biografia;
}
