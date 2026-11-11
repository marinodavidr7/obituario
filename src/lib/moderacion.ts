/**
 * Escudo de moderación y seguridad para el Libro de Recuerdos y Dedicatorias.
 * Previene groserías, insultos, faltas de respeto, spam y abuso automatizado.
 */

// Palabras o raíces inequívocamente ofensivas (se buscan dentro de tokens o texto compacto)
const RAICES_OFENSIVAS = [
  "mierd",
  "hijueput",
  "hijodeput",
  "hdp",
  "ptm",
  "ctm",
  "malparid",
  "gonorre",
  "mamaguev",
  "mamagueb",
  "mamahuevo",
  "mamaguevo",
  "mmg",
  "mmgv",
  "singad",
  "singar",
  "singon",
  "pendej",
  "cabron",
  "chingad",
  "chingar",
  "culer",
  "maricon",
  "marica",
  "prostitut",
  "cojone",
  "carajo",
  "imbecil",
  "estupid",
  "gilipoll",
  "subnormal",
  "malnacido",
  "desgraciad",
  "asqueros",
  "pudrete",
  "bastard",
  "motherfuck",
  "asshole",
];

// Palabras exactas (se evalúan por palabra completa para no dar falsos positivos como "computadora" o "espectáculo")
const PALABRAS_EXACTAS = new Set([
  "puto",
  "puta",
  "putos",
  "putas",
  "puton",
  "culo",
  "culos",
  "culon",
  "culona",
  "verga",
  "vergas",
  "vergazo",
  "pene",
  "penes",
  "polla",
  "pollas",
  "pija",
  "pijas",
  "pinga",
  "pingas",
  "totazo",
  "toto",
  "chocha",
  "chocho",
  "cono", // coño normalizado sin tilde
  "conazo",
  "joder",
  "jodete",
  "jodido",
  "jodida",
  "follar",
  "follado",
  "follada",
  "zorra",
  "zorras",
  "perra",
  "perras",
  "cuero",
  "cueros",
  "bellaco",
  "bellaca",
  "rata",
  "ratas",
  "escoria",
  "basura",
  "idiota",
  "idiotas",
  "tarado",
  "tarada",
  "baboso",
  "babosa",
  "miserable",
  "infeliz",
  "maldito",
  "maldita",
  "malditos",
  "malditas",
  "demonio",
  "satanas",
  "infierno",
  "violador",
  "asesino",
  "asesina",
  "ladron",
  "ladrona",
  "corrupto",
  "corrupta",
  "narco",
  "fuck",
  "fucking",
  "shit",
  "bitch",
  "bitches",
  "dick",
  "cunt",
  "whore",
  "slut",
]);

// Frases irrespetuosas en un contexto de panteón / memoria
const FRASES_IRRESPETUOSAS = [
  "que se pudra",
  "bien muerto",
  "bien muerta",
  "ojala arda",
  "arda en el infierno",
  "no merecia vivir",
  "mala persona",
  "fue una basura",
  "era una basura",
];

// Patrones de spam, enlaces y publicidad
const REGEX_ENLACES = /(https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|xyz|info|biz|ru|top|site|online|club|vip|shop|me|io|ly)\b|t\.me\/|wa\.me\/|bit\.ly\/)/i;

const MAPA_LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "@": "a",
  "$": "s",
  "5": "s",
  "7": "t",
  "!": "i",
  "¡": "i",
};

/**
 * Quita tildes, pasa a minúsculas, convierte sustituciones numéricas/símbolos ("p0rqu3r1a")
 * y colapsa repeticiones exageradas ("puuuutoooo" -> "puto").
 */
export function normalizarParaModeracion(texto: string): string {
  const base = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  // Convertir caracteres leet cuando están rodeados o mezclados con letras
  const sinLeet = base
    .split("")
    .map((ch) => MAPA_LEET[ch] ?? ch)
    .join("");

  // Colapsar 3 o más letras repetidas a 1 sola (ej: "miiiierdaaa" -> "mierda")
  return sinLeet.replace(/([a-z])\1{2,}/g, "$1");
}

/**
 * Une letras sueltas separadas por puntos, guiones o espacios ("p.u.t.o" o "p u t o" -> "puto")
 */
function compactarLetrasSeparadas(textoNorm: string): string {
  // Primero quitar signos de puntuación intercalados entre letras (ej: p.u.t.o, p-u-t-o, p*u*t*o)
  const sinSignosIntercalados = textoNorm.replace(/(?<=[a-z])[._\-*+#/~`|\\]+(?=[a-z])/g, "");

  // Unir secuencias de letras individuales separadas por espacio (ej: "m i e r d a")
  return sinSignosIntercalados.replace(/\b([a-z])(?:\s+([a-z])){2,}\b/g, (match) =>
    match.replace(/\s+/g, "")
  );
}

/**
 * Verifica si un texto contiene lenguaje ofensivo, vulgar o irrespetuoso.
 */
export function contieneLenguajeInapropiado(texto: string): boolean {
  if (!texto) return false;

  const normalizado = normalizarParaModeracion(texto);
  const compactado = compactarLetrasSeparadas(normalizado);

  // Revisar frases irrespetuosas completas
  for (const frase of FRASES_IRRESPETUOSAS) {
    if (normalizado.includes(frase) || compactado.includes(frase)) {
      return true;
    }
  }

  // Extraer tokens de palabras de ambas versiones (normalizada y compactada)
  const tokens = new Set([
    ...normalizado.split(/[^a-z]+/).filter(Boolean),
    ...compactado.split(/[^a-z]+/).filter(Boolean),
  ]);

  for (const token of tokens) {
    // 1. Verificar coincidencia exacta (también colapsando letras dobles salvo 'rr'/'ll')
    const tokenSinDobles = token.replace(/([a-km-qs-z])\1+/g, "$1");
    if (PALABRAS_EXACTAS.has(token) || PALABRAS_EXACTAS.has(tokenSinDobles)) {
      return true;
    }

    // 2. Verificar raíces ofensivas
    for (const raiz of RAICES_OFENSIVAS) {
      if (token.includes(raiz) || tokenSinDobles.includes(raiz)) {
        return true;
      }
    }
  }

  return false;
}

export type ResultadoValidacion =
  | { ok: true; autorLimpio: string; textoLimpio: string }
  | { ok: false; error: string; esGroseria?: boolean };

/**
 * Valida tanto el autor como el texto de la dedicatoria en cliente y servidor.
 */
export function validarDedicatoria(autorRaw: string, textoRaw: string): ResultadoValidacion {
  const autor = (autorRaw ?? "").replace(/\s+/g, " ").trim();
  const texto = (textoRaw ?? "").replace(/\s+/g, " ").trim();

  if (!autor || !texto) {
    return { ok: false, error: "Por favor completa tu nombre y el mensaje de dedicatoria." };
  }

  if (autor.length < 2 || autor.length > 80) {
    return { ok: false, error: "El nombre debe tener entre 2 y 80 caracteres." };
  }

  if (texto.length < 4 || texto.length > 600) {
    return { ok: false, error: "La dedicatoria debe tener entre 4 y 600 caracteres." };
  }

  // Verificar que tenga suficientes letras reales y no solo símbolos o repeticiones
  const letrasAutor = (autor.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g) || []).length;
  const letrasTexto = (texto.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g) || []).length;

  if (letrasAutor < 2 || letrasTexto < 3) {
    return { ok: false, error: "Por favor escribe un nombre y mensaje válidos." };
  }

  if (/(.)\1{6,}/.test(autor) || /(.)\1{6,}/.test(texto)) {
    return { ok: false, error: "El mensaje contiene caracteres repetidos no permitidos." };
  }

  if (REGEX_ENLACES.test(autor) || REGEX_ENLACES.test(texto)) {
    return { ok: false, error: "Por seguridad, no se permite incluir enlaces ni páginas web en las dedicatorias." };
  }

  if (contieneLenguajeInapropiado(autor) || contieneLenguajeInapropiado(texto)) {
    return {
      ok: false,
      esGroseria: true,
      error:
        "Este es un espacio sagrado de respeto y memoria. Tu mensaje no pudo publicarse porque contiene palabras no permitidas.",
    };
  }

  return { ok: true, autorLimpio: autor, textoLimpio: texto };
}

// ============================================================================
// Control de frecuencia (Rate Limiting) en memoria para el servidor
// ============================================================================

type RegistroIP = {
  envios: number[];
  intentosBloqueados: number[];
  ultimoTexto: string;
};

const globalRateLimit = globalThis as unknown as { __dedicatoriasRateMap?: Map<string, RegistroIP> };

function getRateMap(): Map<string, RegistroIP> {
  if (!globalRateLimit.__dedicatoriasRateMap) {
    globalRateLimit.__dedicatoriasRateMap = new Map();
  }
  return globalRateLimit.__dedicatoriasRateMap;
}

const VENTANA_ENVIOS_MS = 10 * 60 * 1000; // 10 minutos
const MAX_ENVIOS_POR_VENTANA = 3;

const VENTANA_BLOQUEOS_MS = 15 * 60 * 1000; // 15 minutos
const MAX_BLOQUEOS_POR_VENTANA = 4;

export function verificarRateLimitDedicatoria(ip: string, textoActual: string): { ok: true } | { ok: false; error: string } {
  const ahora = Date.now();
  const map = getRateMap();
  const reg = map.get(ip) ?? { envios: [], intentosBloqueados: [], ultimoTexto: "" };

  // Limpiar registros antiguos
  reg.envios = reg.envios.filter((t) => ahora - t < VENTANA_ENVIOS_MS);
  reg.intentosBloqueados = reg.intentosBloqueados.filter((t) => ahora - t < VENTANA_BLOQUEOS_MS);

  if (reg.intentosBloqueados.length >= MAX_BLOQUEOS_POR_VENTANA) {
    map.set(ip, reg);
    return {
      ok: false,
      error: "Se han detectado demasiados intentos con contenido no permitido. Inténtalo más tarde.",
    };
  }

  if (reg.envios.length >= MAX_ENVIOS_POR_VENTANA) {
    map.set(ip, reg);
    return {
      ok: false,
      error: "Has publicado varias dedicatorias recientemente. Por favor espera unos minutos antes de enviar otra.",
    };
  }

  const textoNorm = normalizarParaModeracion(textoActual);
  if (reg.ultimoTexto && reg.ultimoTexto === textoNorm) {
    return {
      ok: false,
      error: "Esta dedicatoria ya fue enviada hace unos instantes.",
    };
  }

  map.set(ip, reg);
  return { ok: true };
}

export function registrarResultadoDedicatoria(ip: string, exito: boolean, textoActual?: string) {
  const ahora = Date.now();
  const map = getRateMap();
  const reg = map.get(ip) ?? { envios: [], intentosBloqueados: [], ultimoTexto: "" };

  if (exito) {
    reg.envios.push(ahora);
    if (textoActual) reg.ultimoTexto = normalizarParaModeracion(textoActual);
  } else {
    reg.intentosBloqueados.push(ahora);
  }

  map.set(ip, reg);
}
