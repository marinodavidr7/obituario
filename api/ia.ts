import { createClient } from "@supabase/supabase-js";

// Servicio de redacción con IA (OpenRouter / Gemini) para el Obituario Familiar.
// La clave NUNCA debe viajar al navegador: se lee de process.env o de la tabla
// `config` de Supabase usando la service role key del servidor.
//
// Variables de entorno (Vercel):
//   OPENROUTER_API_KEY        (recomendada)
//   SUPABASE_URL / VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY (para leer la clave guardada desde el panel admin)

const MODELO = "google/gemini-2.5-flash";
const MAX_NOTAS = 6000;
const MIN_NOTAS = 10;
const MAX_POR_MINUTO = 8;

let cacheClave: { valor: string; expira: number } | null = null;

async function obtenerClaveOpenRouter(): Promise<string> {
  const directa = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY || "";
  if (directa) return directa;

  const ahora = Date.now();
  if (cacheClave && ahora < cacheClave.expira) return cacheClave.valor;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceKey) return "";

  try {
    const supabase = createClient(url, serviceKey);
    const { data } = await supabase
      .from("config")
      .select("valor")
      .eq("clave", "openrouter_api_key")
      .maybeSingle();
    const valor = String(data?.valor || "").trim();
    cacheClave = { valor, expira: ahora + 5 * 60 * 1000 };
    return valor;
  } catch (err) {
    console.warn("[IA] No se pudo leer la clave de OpenRouter:", err);
    return "";
  }
}

// Límite best-effort por instancia de lambda (no sustituye un límite global).
const ventanas: Map<string, number[]> = new Map();

function permitirPeticion(ip: string): boolean {
  const ahora = Date.now();
  const lista = (ventanas.get(ip) || []).filter((t) => ahora - t < 60_000);
  if (lista.length >= MAX_POR_MINUTO) {
    ventanas.set(ip, lista);
    return false;
  }
  lista.push(ahora);
  ventanas.set(ip, lista);
  return true;
}

function limpiarCampo(valor: unknown, max: number): string {
  return String(valor ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function limpiarSalida(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let texto = raw.trim();
  texto = texto.replace(/^```(?:markdown|text)?\s*/i, "").replace(/\s*```$/i, "").trim();
  texto = texto.replace(/^(biograf[ií]a|semblanza)\s*:\s*/i, "").trim();
  return texto.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

const SYSTEM_PROMPT = `Eres el redactor literario del santuario digital "Obituario Familiar". Tu tarea es convertir las notas y recuerdos que aporta una familia en una biografía conmemorativa breve, digna y cálida, escrita en español.

Reglas obligatorias:
- Escribe en tercera persona, con tono respetuoso, sereno y literario. Nunca sensacionalista ni grandilocuente.
- Usa EXCLUSIVAMENTE los datos aportados por la familia. No inventes fechas, lugares, oficios, familiares ni anécdotas.
- Si falta información, omite el detalle; no lo rellenes con suposiciones.
- Estructura OBLIGATORIA: como mínimo 2 párrafos (idealmente 3), separados por una línea en blanco. Nunca devuelvas un solo párrafo.
- Longitud orientativa: entre 120 y 240 palabras.
- Puedes destacar nombres propios o apodos con **dobles asteriscos** (se mostrarán en negrita). No uses ningún otro formato Markdown.
- Devuelve únicamente la biografía final, sin notas, disculpas ni comentarios sobre el proceso.`;

function construirMensajeUsuario(body: any): string {
  const nombre = limpiarCampo(body.nombre, 120);
  const apodo = limpiarCampo(body.apodo, 120);
  const anios = limpiarCampo(body.anios, 80);
  const fechas = limpiarCampo(body.fechas, 160);
  const familia = limpiarCampo(body.familia, 120);
  const epitafio = limpiarCampo(body.epitafio, 240);
  const notas = String(body.notas || "").trim().slice(0, MAX_NOTAS);

  const lineas = [
    "Datos de la persona:",
    `- Nombre: ${nombre || "(sin indicar)"}`,
    apodo ? `- Apodo: ${apodo}` : "",
    anios ? `- Años: ${anios}` : "",
    fechas ? `- Fechas: ${fechas}` : "",
    familia ? `- Familia: ${familia}` : "",
    epitafio ? `- Epitafio: ${epitafio}` : "",
    "",
    "Notas y recuerdos aportados por la familia:",
    notas,
    "",
    "Redacta la biografía conmemorativa siguiendo las reglas, con al menos dos párrafos separados por una línea en blanco.",
  ];

  return lineas.filter((l) => l !== "").join("\n");
}

function contarParrafos(texto: string): number {
  return texto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean).length;
}

/**
 * Garantía final: si el modelo devolviese un único párrafo, lo dividimos en dos
 * por el límite de frase más cercano a la mitad del texto.
 */
function dividirEnDosParrafos(texto: string): string {
  const limpio = texto.trim();
  if (!limpio || contarParrafos(limpio) >= 2) return limpio;

  const mitad = Math.floor(limpio.length / 2);
  const oraciones = Array.from(limpio.matchAll(/[^.!?…]+[.!?…]+["'»”’)]?/g));

  if (oraciones.length >= 2) {
    let corte = -1;
    let mejorDistancia = Infinity;
    for (const oracion of oraciones) {
      const fin = (oracion.index || 0) + oracion[0].length;
      const distancia = Math.abs(fin - mitad);
      if (distancia < mejorDistancia) {
        mejorDistancia = distancia;
        corte = fin;
      }
    }
    if (corte > 0 && corte < limpio.length) {
      return `${limpio.slice(0, corte).trim()}\n\n${limpio.slice(corte).trim()}`;
    }
  }

  const palabras = limpio.split(/\s+/);
  if (palabras.length >= 2) {
    const punto = Math.ceil(palabras.length / 2);
    return `${palabras.slice(0, punto).join(" ")}\n\n${palabras.slice(punto).join(" ")}`;
  }

  return limpio;
}

async function llamarOpenRouter(clave: string, messages: any[]): Promise<string> {
  const respuesta = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clave}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.SITE_URL || "https://obituariocloud.vercel.app",
      "X-Title": "Obituario Familiar - Redactor de biografias",
    },
    body: JSON.stringify({
      model: MODELO,
      temperature: 0.75,
      max_tokens: 900,
      messages,
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    console.warn("[IA] OpenRouter respondió con error:", respuesta.status, detalle.slice(0, 300));
    throw new Error("OPENROUTER_ERROR");
  }

  const datos = await respuesta.json().catch(() => ({}));
  return limpiarSalida(datos?.choices?.[0]?.message?.content);
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, message: "Servicio de redacción IA del Obituario Familiar activo." });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido." });
  }

  const forwarded = String(req.headers?.["x-forwarded-for"] || "");
  const ip = forwarded.split(",")[0].trim() || req.socket?.remoteAddress || "desconocida";
  if (!permitirPeticion(ip)) {
    return res.status(429).json({
      ok: false,
      error: "Demasiadas solicitudes seguidas. Espera un momento e inténtalo de nuevo.",
    });
  }

  let body: any = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  if (String(body.tipo || "biografia") !== "biografia") {
    return res.status(400).json({ ok: false, error: "Tipo de redacción no admitido." });
  }

  const notas = String(body.notas || "").trim();
  if (notas.length < MIN_NOTAS) {
    return res.status(400).json({
      ok: false,
      error: "Escribe al menos unas palabras o recuerdos para que la IA pueda redactar la biografía.",
    });
  }
  if (notas.length > MAX_NOTAS) {
    return res.status(400).json({
      ok: false,
      error: "Las notas son demasiado largas. Reduce el texto e inténtalo de nuevo.",
    });
  }

  const clave = await obtenerClaveOpenRouter();
  if (!clave) {
    return res.status(503).json({
      ok: false,
      error:
        "La IA todavía no está configurada. Añade OPENROUTER_API_KEY en el servidor o guarda la clave desde el panel de administración.",
    });
  }

  try {
    const mensajeUsuario = construirMensajeUsuario(body);
    let biografia = await llamarOpenRouter(clave, [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: mensajeUsuario },
    ]);

    if (!biografia) {
      return res.status(502).json({
        ok: false,
        error: "La IA devolvió una respuesta vacía. Inténtalo de nuevo.",
      });
    }

    // Si el modelo ignoró la regla y devolvió un solo párrafo, pedimos un reintento.
    if (contarParrafos(biografia) < 2) {
      try {
        const reintento = await llamarOpenRouter(clave, [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: mensajeUsuario },
          { role: "assistant", content: biografia },
          {
            role: "user",
            content:
              "La biografía anterior quedó en un solo párrafo y es imprescindible que tenga AL MENOS DOS párrafos. Reescríbela con los mismos datos, separando claramente dos o tres párrafos con una línea en blanco entre ellos. Devuelve únicamente la biografía final.",
          },
        ]);
        if (reintento && contarParrafos(reintento) >= 2) {
          biografia = reintento;
        }
      } catch (err) {
        console.warn("[IA] Reintento para forzar dos párrafos falló:", err);
      }
    }

    // Garantía definitiva: nunca devolvemos una biografía de un solo párrafo.
    biografia = dividirEnDosParrafos(biografia);

    res.setHeader?.("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, biografia });
  } catch (err) {
    console.warn("[IA] Error llamando a OpenRouter:", err);
    return res.status(502).json({
      ok: false,
      error: "No se pudo contactar con el servicio de IA. Revisa tu conexión e inténtalo de nuevo.",
    });
  }
}
