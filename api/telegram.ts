import { createClient } from "@supabase/supabase-js";

// NUNCA pongas secretos en el fuente. Configura estas variables en Vercel:
//   SUPABASE_URL (o VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY  (servidor; requerida para aprobar/rechazar/leer pendientes)
//   TELEGRAM_BOT_TOKEN         (BotFather; requerida para enviar mensajes del bot)
//   TELEGRAM_WEBHOOK_SECRET    (opcional pero recomendado; x-telegram-bot-api-secret-token)
//   TELEGRAM_ADMIN_CHAT_IDS    (ids de Telegram autorizados, separados por coma)
//   OPENROUTER_API_KEY         (opcional; IA del bot y corrector de ortografía)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SURROGATE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const ADMIN_CHAT_IDS = (process.env.TELEGRAM_ADMIN_CHAT_IDS || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

let supabaseClient: any = null;
function getSupabase() {
  if (!supabaseClient) {
    const key = SUPABASE_SERVICE_ROLE_KEY || SURROGATE_ANON_KEY;
    const url = SUPABASE_URL;
    if (!url || !key) return null;
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}
// ¿El servidor puede operar sobre el santuario con privilegios (post-RLS)?
// El rol anon ya no puede leer pendientes ni mutar; sin service role el bot
// no puede aprobar/rechazar/fotos ni listar solicitudes.
function serviceReady() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

interface BotConfig {
  token: string;
  chatId: string;
  siteUrl: string;
  openrouterKey: string;
}

let cachedBotConfig: { data: BotConfig; expiresAt: number } | null = null;

async function getBotConfig(supabase: any): Promise<BotConfig> {
  const now = Date.now();
  if (cachedBotConfig && now < cachedBotConfig.expiresAt) {
    return cachedBotConfig.data;
  }

  let token = process.env.VITE_TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN;
  let chatId = process.env.VITE_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID || "";
  let siteUrl = process.env.VITE_SITE_URL || process.env.SITE_URL || "https://obituariocloud.vercel.app";
  let openrouterKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY || "";

  if (!supabase) {
    return { token, chatId, siteUrl, openrouterKey };
  }
  try {
    const { data } = await supabase.from("config").select("clave, valor");
    if (data) {
      for (const row of data) {
        if (row.clave === "telegram_bot_token" && row.valor) token = row.valor;
        if (row.clave === "telegram_chat_id" && row.valor) chatId = row.valor;
        if (row.clave === "site_url" && row.valor) siteUrl = row.valor.replace(/\/$/, "");
        if (row.clave === "openrouter_api_key" && row.valor) openrouterKey = row.valor;
      }
    }
  } catch (e) {
    console.warn("[Telegram Webhook] Error obteniendo config de Supabase:", e);
  }

  const result: BotConfig = { token, chatId, siteUrl, openrouterKey };
  // Guardar en memoria por 5 minutos para evitar consultas recurrentes
  cachedBotConfig = { data: result, expiresAt: now + 5 * 60 * 1000 };
  return result;
}

async function sendTelegram(token: string, method: string, payload: any) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json().catch(() => ({}));
  } catch (e) {
    console.error(`[Telegram Webhook] Error en ${method}:`, e);
    return { ok: false };
  }
}

/**
 * Consulta a la Inteligencia Artificial (OpenRouter / Gemini 2.5 Flash)
 * dotada con el contexto sagrado del Santuario y respeto solemne.
 */
async function consultarIA(
  supabase: any,
  openrouterKey: string,
  siteUrl: string,
  userMessage: string
): Promise<string | null> {
  if (!openrouterKey) return null;

  try {
    // Obtener almas registradas en el santuario para contexto verídico
    const [perRes, famRes] = await Promise.all([
      supabase
        .from("personas")
        .select("id, nombre, apodo, anios, fechas, epitafio, bio, velas, flores, familia_id")
        .or("estado.eq.publicado,estado.is.null")
        .limit(20),
      supabase.from("familias").select("id, apellido, lema").limit(10),
    ]);

    const personas = perRes.data || [];
    const familias = famRes.data || [];

    const resumenPersonas = personas
      .map(
        (p: any) =>
          `- ${p.nombre}${p.apodo ? ` («${p.apodo}»)` : ""}. Años: ${p.anios || ""}. Fechas: ${p.fechas || ""}. Familia: ${p.familia_id || ""}. Epitafio: “${p.epitafio || ""}”. Altar: ${siteUrl}/#/persona/${p.id}`
      )
      .join("\n");

    const resumenFamilias = familias
      .map((f: any) => `- Familia ${f.apellido}${f.lema ? `: «${f.lema}»` : ""}`)
      .join("\n");

    const systemPrompt = `Eres el Asistente Espiritual y Guardián Inteligente del Santuario Digital "Obituario Familiar" (${siteUrl}).
Tu misión es atender a familiares, deudos y visitantes con profundo respeto, empatía, calidez y solemnidad.

Seres queridos registrados en el santuario:
${resumenPersonas || "No hay almas registradas aún."}

Familias:
${resumenFamilias || "Familia general."}

Instrucciones:
1. Responde siempre con solemnidad, compasión y calidez humana.
2. Si preguntan por alguien del santuario, utiliza los datos exactos y comparte el enlace directo a su altar digital.
3. Si el usuario pide redactar dedicatorias, condolencias o epitafios, ofrece 1 o 2 opciones hermosas, poéticas y reconfortantes.
4. Si preguntan cómo rendir homenaje, indícales que en el santuario web pueden encender una vela virtual o colocar flores.
5. Mantén la respuesta concisa y elegante (máximo 2 a 3 párrafos), usando formato Markdown para Telegram (*negritas*, _cursivas_). No uses encabezados # complejos.`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 500,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!res.ok) {
      console.warn("[OpenRouter IA] Error HTTP:", res.status, await res.text().catch(() => ""));
      return null;
    }

    const data = await res.json().catch(() => ({}));
    const reply = data.choices?.[0]?.message?.content?.trim();
    return reply || null;
  } catch (err) {
    console.warn("[OpenRouter IA] Error de llamada:", err);
    return null;
  }
}

// Cuota por instancia de lambda (best-effort; no sustituye un límite de Vercel/KV)
const quotaVentana: Map<string, number[]> = new Map();
const QUOTA_MAX_PER_MIN = 30;
function corregidorQuotaOk(ip: string): boolean {
  const ahora = Date.now();
  const lista = (quotaVentana.get(ip) || []).filter((t) => ahora - t < 60_000);
  if (lista.length >= QUOTA_MAX_PER_MIN) {
    quotaVentana.set(ip, lista);
    return false;
  }
  lista.push(ahora);
  quotaVentana.set(ip, lista);
  return true;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, message: "Bot de Telegram para Obituario Familiar activo." });
  }

  // Origen de la petición: si TELEGRAM_WEBHOOK_SECRET está configurado,
  // Telegram debe presentarlo; si no está configurado, sólo se permiten
  // peticiones desde ids autorizados (fallar cerrado en ambos casos).
  if (TELEGRAM_WEBHOOK_SECRET) {
    const incoming = req.headers?.["x-telegram-bot-api-secret-token"];
    if (incoming !== TELEGRAM_WEBHOOK_SECRET) {
      return res.status(401).json({ ok: false });
    }
  }

  const supabase = getSupabase();

  const update = req.body || {};

  const esperadoChatId = () => String(
    update?.callback_query?.message?.chat?.id ??
    update?.message?.chat?.id ??
    ""
  );
  // Operaciones de gestión (aprobar/rechazar/comandos): sólo guardianes autorizados.
  // Se autoriza TELEGRAM_ADMIN_CHAT_IDS y, además, el chat configurado para recibir
  // los avisos (telegram_chat_id), de modo que el propio guardián siempre pueda usar el bot.
  const isAdminChat = (extraIds: Array<string | number | undefined | null> = []) => {
    const chat = esperadoChatId();
    if (!chat) return false;
    const permitidos = new Set<string>(ADMIN_CHAT_IDS);
    for (const id of extraIds) {
      const limpio = String(id ?? "").trim();
      if (limpio) permitidos.add(limpio);
    }
    return permitidos.has(chat);
  };
  // Privilegios de datos: sin service role el bot no puede operar (lo exige RLS).
  const canOperate = serviceReady() && supabase;

  // 0. Endpoint público de corrección ortográfica (única vía abierta, con cuota y tope)
  if (update.action === "corregir_ortografia") {
    const ip = String(req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "anon").split(",")[0].trim();
    if (!corregidorQuotaOk(ip)) {
      return res.status(429).json({ ok: false, error: "Demasiadas peticiones" });
    }
    const textoOriginal = String(update.texto || "").trim();
    if (textoOriginal.length > 400) {
      return res.status(400).json({ ok: false, error: "Texto demasiado largo" });
    }
    if (!textoOriginal) {
      return res.status(400).json({ ok: false, error: "Texto vacío" });
    }
    let openrouterKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY || "";
    if (!openrouterKey && supabase) {
      // También admitir la clave guardada desde el panel de administración.
      try {
        const cfg = await getBotConfig(supabase);
        openrouterKey = cfg.openrouterKey || "";
      } catch {
        /* sin clave disponible */
      }
    }
    if (!openrouterKey) {
      return res.status(200).json({ ok: false, textoCorregido: textoOriginal, error: "IA no configurada" });
    }
    try {
      const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          max_tokens: 400,
          temperature: 0.1,
          messages: [
            {
              role: "system",
              content:
                "Eres un corrector ortográfico y gramatical en español para dedicatorias de un obituario familiar. Corrige únicamente faltas de ortografía, tildes, signos de puntuación y errores tipográficos evidentes, manteniendo intactos el tono, los nombres propios, los sentimientos y las palabras del autor. Devuelve SOLO el texto corregido, sin comillas ni explicaciones.",
            },
            { role: "user", content: textoOriginal },
          ],
        }),
      });
      if (!aiRes.ok) {
        return res.status(200).json({ ok: false, textoCorregido: textoOriginal });
      }
      const aiData = await aiRes.json().catch(() => ({}));
      const textoCorregido = aiData.choices?.[0]?.message?.content?.trim() || textoOriginal;
      return res.status(200).json({ ok: true, textoCorregido });
    } catch {
      return res.status(200).json({ ok: false, textoCorregido: textoOriginal });
    }
  }

  // El bot completo es para guardianes autorizados: fallar cerrado.
  if (!canOperate) {
    return res.status(200).json({ ok: false, error: "Bot no configurado (falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY)" });
  }

  const botConfig = await getBotConfig(supabase!);
  const { token, siteUrl, openrouterKey } = botConfig;

  // El chat que recibe los avisos del santuario es siempre un guardián autorizado,
  // aunque TELEGRAM_ADMIN_CHAT_IDS no esté definido en el servidor.
  if (!isAdminChat([botConfig.chatId, process.env.TELEGRAM_CHAT_ID, process.env.VITE_TELEGRAM_CHAT_ID])) {
    console.warn("[Telegram] Mensaje ignorado de chat no autorizado:", esperadoChatId());
    return res.status(200).json({ ok: true });
  }

  if (!token) {
    return res.status(200).json({ ok: false, error: "Bot no configurado (falta TELEGRAM_BOT_TOKEN)" });
  }

  // 1. Manejo Ultrarrápido de Botones Interactivos (Callback Queries)
  if (update.callback_query) {
    const cq = update.callback_query;
    const data = cq.data || "";
    const messageId = cq.message?.message_id;
    const chatId = cq.message?.chat?.id;

    if (data.startsWith("aprobar:")) {
      const personaId = data.replace("aprobar:", "");

      // Responder a Telegram inmediatamente para que el botón no se quede cargando
      const ackPromise = sendTelegram(token, "answerCallbackQuery", {
        callback_query_id: cq.id,
        text: "✅ Familiar aprobado y publicado en el obituario.",
        show_alert: true,
      });

      // Actualizar en base de datos en paralelo
      const updatePromise = supabase
        .from("personas")
        .update({ estado: "publicado" })
        .eq("id", personaId);

      // Actualizar los botones del mensaje en paralelo
      const editPromise = chatId && messageId
        ? sendTelegram(token, "editMessageReplyMarkup", {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [{ text: "✅ APROBADO Y PUBLICADO", callback_data: "noop" }],
                [{ text: "🌐 Ver en el Santuario", url: `${siteUrl}/#/persona/${personaId}` }],
              ],
            },
          })
        : Promise.resolve();

      await Promise.all([ackPromise, updatePromise, editPromise]);
      return res.status(200).json({ ok: true });
    }

    if (data.startsWith("rechazar:")) {
      const personaId = data.replace("rechazar:", "");

      const ackPromise = sendTelegram(token, "answerCallbackQuery", {
        callback_query_id: cq.id,
        text: "❌ Solicitud rechazada y eliminada.",
        show_alert: true,
      });

      const deletePromise = supabase
        .from("personas")
        .delete()
        .eq("id", personaId);

      const editPromise = chatId && messageId
        ? sendTelegram(token, "editMessageReplyMarkup", {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [[{ text: "❌ SOLICITUD RECHAZADA", callback_data: "noop" }]],
            },
          })
        : Promise.resolve();

      await Promise.all([ackPromise, deletePromise, editPromise]);
      return res.status(200).json({ ok: true });
    }

    if (data.startsWith("aprobar_foto:")) {
      const fotoId = data.replace("aprobar_foto:", "");
      let personaId = "";
      let yaProcesada = false;

      if (supabase) {
        const { data: cfgRow } = await supabase
          .from("config")
          .select("valor")
          .eq("clave", "fotos_pendientes")
          .maybeSingle();

        let pendientes: any[] = [];
        try {
          pendientes = cfgRow?.valor ? JSON.parse(cfgRow.valor) : [];
        } catch {
          pendientes = [];
        }

        const foto = pendientes.find((f) => f.id === fotoId);
        if (!foto) {
          yaProcesada = true;
        } else {
          personaId = foto.persona_id;
          const { data: pRow } = await supabase
            .from("personas")
            .select("galeria")
            .eq("id", personaId)
            .maybeSingle();

          const galeriaActual: Array<string | { url: string; comentario?: string | null }> =
            Array.isArray(pRow?.galeria) ? pRow.galeria : [];
          const yaExiste = galeriaActual.some((g) => (typeof g === "string" ? g : g?.url) === foto.url);
          if (!yaExiste) {
            const item = { url: foto.url, comentario: foto.comentario || null };
            await supabase
              .from("personas")
              .update({ galeria: [...galeriaActual, item] })
              .eq("id", personaId);
          }

          const restantes = pendientes.filter((f) => f.id !== fotoId);
          await supabase
            .from("config")
            .upsert({ clave: "fotos_pendientes", valor: JSON.stringify(restantes) });
        }
      }

      const ackPromise = sendTelegram(token, "answerCallbackQuery", {
        callback_query_id: cq.id,
        text: yaProcesada ? "ℹ️ Esta foto ya fue procesada anteriormente." : "✅ Foto aprobada y agregada a la galería.",
        show_alert: true,
      });

      const editPromise =
        chatId && messageId
          ? sendTelegram(token, "editMessageReplyMarkup", {
              chat_id: chatId,
              message_id: messageId,
              reply_markup: {
                inline_keyboard: [
                  [{ text: "✅ FOTO APROBADA Y PUBLICADA", callback_data: "noop" }],
                  ...(personaId
                    ? [[{ text: "🌐 Ver en el Santuario", url: `${siteUrl}/#/persona/${personaId}` }]]
                    : []),
                ],
              },
            })
          : Promise.resolve();

      await Promise.all([ackPromise, editPromise]);
      return res.status(200).json({ ok: true });
    }

    if (data.startsWith("rechazar_foto:")) {
      const fotoId = data.replace("rechazar_foto:", "");

      if (supabase) {
        const { data: cfgRow } = await supabase
          .from("config")
          .select("valor")
          .eq("clave", "fotos_pendientes")
          .maybeSingle();

        let pendientes: any[] = [];
        try {
          pendientes = cfgRow?.valor ? JSON.parse(cfgRow.valor) : [];
        } catch {
          pendientes = [];
        }

        const restantes = pendientes.filter((f) => f.id !== fotoId);
        await supabase
          .from("config")
          .upsert({ clave: "fotos_pendientes", valor: JSON.stringify(restantes) });
      }

      const ackPromise = sendTelegram(token, "answerCallbackQuery", {
        callback_query_id: cq.id,
        text: "❌ Foto rechazada y descartada.",
        show_alert: true,
      });

      const editPromise =
        chatId && messageId
          ? sendTelegram(token, "editMessageReplyMarkup", {
              chat_id: chatId,
              message_id: messageId,
              reply_markup: {
                inline_keyboard: [[{ text: "❌ FOTO RECHAZADA", callback_data: "noop" }]],
              },
            })
          : Promise.resolve();

      await Promise.all([ackPromise, editPromise]);
      return res.status(200).json({ ok: true });
    }

    if (data.startsWith("cmd:")) {
      // Confirmar click de inmediato sin alert
      sendTelegram(token, "answerCallbackQuery", { callback_query_id: cq.id }).catch(() => {});
      const cmd = data.replace("cmd:", "");
      await procesarComando(supabase, token, openrouterKey, siteUrl, chatId, "/" + cmd, "", "/" + cmd);
      return res.status(200).json({ ok: true });
    }

    sendTelegram(token, "answerCallbackQuery", { callback_query_id: cq.id }).catch(() => {});
    return res.status(200).json({ ok: true });
  }

  // 2. Manejo de Mensajes de Texto con IA
  const message = update.message;
  if (!message || !message.text) {
    return res.status(200).json({ ok: true });
  }

  const chatId = message.chat.id;
  const rawText = message.text.trim();

  let cmd = rawText.split(" ")[0].toLowerCase();
  if (cmd.includes("@")) cmd = cmd.split("@")[0]; // soporte para /comando@bot_name
  const args = rawText.slice(cmd.length).trim();

  // Enviar acción "escribiendo..." de inmediato para feedback instantáneo al usuario
  sendTelegram(token, "sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {});

  await procesarComando(supabase, token, openrouterKey, siteUrl, chatId, cmd, args, rawText);

  return res.status(200).json({ ok: true });
}

async function procesarComando(
  supabase: any,
  token: string,
  openrouterKey: string,
  siteUrl: string,
  chatId: number | string,
  cmd: string,
  args: string,
  rawText: string
) {
  // Menú principal / Ayuda
  if (cmd === "/start" || cmd === "/ayuda" || cmd === "/help") {
    const texto = [
      "🕊️ *SANTUARIO DIGITAL · OBITUARIO FAMILIAR*",
      "──────────────────────────",
      "¡Bienvenido! Soy el Asistente Inteligente del Santuario. Puedes consultarme cualquier duda, buscar a tus seres queridos o pedirme ayuda para redactar dedicatorias.",
      "",
      "📌 *Comandos directos:*",
      "📊 `/stats` - Estadísticas generales (almas, familias, velas y flores)",
      "🕊️ `/solicitudes` - Ver solicitudes pendientes de aprobación",
      "🔍 `/buscar <nombre>` - Buscar a un ser querido",
      "🕯️ `/ultimos` - Últimas almas inscritas en el altar",
      "🏛️ `/familias` - Lista de familias en el memorial",
      "💌 `/dedicatorias` - Últimas dedicatorias de condolencia",
      "✍️ `/redactar <tema>` - La IA te ayuda a escribir dedicatorias o epitafios",
      "",
      "✨ *Conversa libremente:* Escribe cualquier pregunta o el nombre de un ser querido (ej: _«¿Quién fue Evelin?»_ o _«Dedicatoria para mi abuela»_) y te responderé de inmediato con IA.",
    ].join("\n");

    const reply_markup = {
      inline_keyboard: [
        [
          { text: "📊 Estadísticas", callback_data: "cmd:stats" },
          { text: "🕊️ Solicitudes", callback_data: "cmd:solicitudes" },
        ],
        [
          { text: "🕯️ Últimas almas", callback_data: "cmd:ultimos" },
          { text: "🏛️ Familias", callback_data: "cmd:familias" },
        ],
        [
          { text: "✍️ Redactar con IA", callback_data: "cmd:redactar" },
          { text: "🌐 Abrir Santuario Web", url: siteUrl },
        ],
      ],
    };

    await sendTelegram(token, "sendMessage", {
      chat_id: chatId,
      text: texto,
      parse_mode: "Markdown",
      reply_markup,
    });
    return;
  }

  // Asistente para Redactar Dedicatorias o Epitafios con IA
  if (cmd === "/redactar" || cmd === "/epitafio" || cmd === "/condolencia") {
    if (!args) {
      await sendTelegram(token, "sendMessage", {
        chat_id: chatId,
        text: [
          "✍️ *ASISTENTE DE REDACCIÓN CON INTELIGENCIA ARTIFICIAL*",
          "──────────────────────────",
          "Dime para quién deseas escribir y qué detalles recuerdas de su vida.",
          "",
          "💡 *Ejemplos:*",
          "• `/redactar para mi abuelita que le gustaba cocinar y nos cuidaba a todos`",
          "• `/redactar dedicatoria para un tío alegre que amaba la música`",
          "• `/redactar epitafio corto y solemne`",
        ].join("\n"),
        parse_mode: "Markdown",
      });
      return;
    }

    sendTelegram(token, "sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {});
    const respuestaIA = await consultarIA(
      supabase,
      openrouterKey,
      siteUrl,
      `Ayúdame a redactar una dedicatoria o epitafio muy conmovedor y solemne sobre: ${args}`
    );

    if (respuestaIA) {
      await sendTelegram(token, "sendMessage", {
        chat_id: chatId,
        text: `🕊️ *SUGERENCIAS DE DEDICATORIA (IA)*\n──────────────────────────\n${respuestaIA}`,
        parse_mode: "Markdown",
      });
      return;
    }
  }

  // Estadísticas generales ultrarrápidas
  if (cmd === "/stats" || cmd === "/resumen") {
    const [perRes, famRes, dedRes] = await Promise.all([
      supabase.from("personas").select("id, estado, velas, flores"),
      supabase.from("familias").select("id", { count: "exact", head: true }),
      supabase.from("dedicatorias").select("id", { count: "exact", head: true }),
    ]);

    const personas = perRes.data || [];
    const publicadas = personas.filter((p: any) => p.estado === "publicado" || !p.estado);
    const pendientes = personas.filter((p: any) => p.estado === "pendiente");
    const totalVelas = personas.reduce((acc: number, p: any) => acc + (p.velas || 0), 0);
    const totalFlores = personas.reduce((acc: number, p: any) => acc + (p.flores || 0), 0);
    const totalFamilias = famRes.count ?? 0;
    const totalDedicatorias = dedRes.count ?? 0;

    const texto = [
      "📊 *ESTADÍSTICAS DEL SANTUARIO*",
      "──────────────────────────",
      `🕊️ *Almas inscritas:* ${publicadas.length}`,
      `🏛️ *Familias registradas:* ${totalFamilias}`,
      `⏳ *Solicitudes pendientes:* ${pendientes.length}`,
      `🕯️ *Velas encendidas:* ${totalVelas}`,
      `🌹 *Flores depositadas:* ${totalFlores}`,
      `💌 *Dedicatorias recibidas:* ${totalDedicatorias}`,
      "──────────────────────────",
      "Estado: Sincronizado en Tiempo Real · IA Activa ✨",
    ].join("\n");

    const inline_keyboard = [
      [
        { text: "🕊️ Ver Solicitudes", callback_data: "cmd:solicitudes" },
        { text: "🌐 Visitar Web", url: siteUrl },
      ],
    ];

    await sendTelegram(token, "sendMessage", {
      chat_id: chatId,
      text: texto,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard },
    });
    return;
  }

  // Solicitudes pendientes de aprobación en paralelo
  if (cmd === "/solicitudes" || cmd === "/pendientes") {
    const { data: solicitudes } = await supabase
      .from("personas")
      .select("*")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: false });

    if (!solicitudes || solicitudes.length === 0) {
      await sendTelegram(token, "sendMessage", {
        chat_id: chatId,
        text: "🕊️ *No hay solicitudes pendientes en este momento.*\n\nTodas las solicitudes de inscripción han sido atendidas.",
        parse_mode: "Markdown",
      });
      return;
    }

    // Encabezado
    await sendTelegram(token, "sendMessage", {
      chat_id: chatId,
      text: `⏳ *SOLICITUDES PENDIENTES (${solicitudes.length})*\nRevisa cada familiar y pulsa en aprobar o rechazar:`,
      parse_mode: "Markdown",
    });

    // Enviar todas las solicitudes en paralelo sin esperas secuenciales
    await Promise.all(
      solicitudes.map((sol: any) => {
        const textoSol = [
          `👤 *${sol.nombre}*${sol.apodo ? ` («${sol.apodo}»)` : ""}`,
          `✦ *Años:* ${sol.anios || "Sin datos"}`,
          sol.fechas ? `📅 *Fechas:* ${sol.fechas}` : "",
          sol.epitafio ? `💬 *Epitafio:* “${sol.epitafio}”` : "",
          sol.solicitante ? `✍️ *Solicitante:* ${sol.solicitante}` : "",
          sol.contacto ? `📞 *Contacto:* ${sol.contacto}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        const inline_keyboard = [
          [
            { text: "✅ Aprobar", callback_data: `aprobar:${sol.id}` },
            { text: "❌ Rechazar", callback_data: `rechazar:${sol.id}` },
          ],
          [{ text: "👁️ Ver Ficha", url: `${siteUrl}/#/persona/${sol.id}` }],
        ];

        return sendTelegram(token, "sendMessage", {
          chat_id: chatId,
          text: textoSol,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard },
        });
      })
    );
    return;
  }

  // Lista de familias
  if (cmd === "/familias") {
    const [famRes, perRes] = await Promise.all([
      supabase.from("familias").select("*").order("orden"),
      supabase.from("personas").select("familia_id"),
    ]);

    const familias = famRes.data || [];
    const personas = perRes.data || [];

    if (familias.length === 0) {
      await sendTelegram(token, "sendMessage", {
        chat_id: chatId,
        text: "🏛️ *No hay familias registradas todavía.*",
        parse_mode: "Markdown",
      });
      return;
    }

    const lineas = familias.map((f: any) => {
      const total = personas.filter((p: any) => p.familia_id === f.id).length;
      return `🏛️ *Familia ${f.apellido}* (${total} ${total === 1 ? "alma" : "almas"})${f.lema ? `\n   _«${f.lema}»_` : ""}`;
    });

    const texto = ["🏛️ *FAMILIAS REGISTRADAS*", "──────────────────────────", ...lineas].join("\n");

    await sendTelegram(token, "sendMessage", {
      chat_id: chatId,
      text: texto,
      parse_mode: "Markdown",
    });
    return;
  }

  // Últimas almas registradas
  if (cmd === "/ultimos" || cmd === "/almas") {
    const { data: personas } = await supabase
      .from("personas")
      .select("id, nombre, apodo, anios, velas, flores")
      .or("estado.eq.publicado,estado.is.null")
      .order("created_at", { ascending: false })
      .limit(6);

    if (!personas || personas.length === 0) {
      await sendTelegram(token, "sendMessage", {
        chat_id: chatId,
        text: "🕊️ *No hay almas registradas.*",
        parse_mode: "Markdown",
      });
      return;
    }

    const lineas = personas.map(
      (p: any) =>
        `🕯️ *${p.nombre}* (${p.anios})\n   Ofrendas: ${p.velas || 0} 🕯️ · ${p.flores || 0} 🌹\n   [Ver altar](${siteUrl}/#/persona/${p.id})`
    );

    const texto = ["🕊️ *ÚLTIMOS SERES QUERIDOS EN EL SANTUARIO*", "──────────────────────────", ...lineas].join("\n\n");

    await sendTelegram(token, "sendMessage", {
      chat_id: chatId,
      text: texto,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
    return;
  }

  // Últimas dedicatorias
  if (cmd === "/dedicatorias") {
    const { data: deds } = await supabase
      .from("dedicatorias")
      .select("id, autor, texto, fecha, persona_id")
      .order("fecha", { ascending: false })
      .limit(5);

    if (!deds || deds.length === 0) {
      await sendTelegram(token, "sendMessage", {
        chat_id: chatId,
        text: "💌 *No se han dejado dedicatorias aún en el altar.*",
        parse_mode: "Markdown",
      });
      return;
    }

    const lineas = deds.map(
      (d: any) => `💬 _“${d.texto}”_\n   — *${d.autor || "Anónimo"}* (${d.fecha ? d.fecha.slice(0, 10) : "reciente"})`
    );

    const texto = ["💌 *ÚLTIMAS DEDICATORIAS Y MENSAJES*", "──────────────────────────", ...lineas].join("\n\n");

    await sendTelegram(token, "sendMessage", {
      chat_id: chatId,
      text: texto,
      parse_mode: "Markdown",
    });
    return;
  }

  // Búsqueda explícita con comando /buscar
  if (cmd === "/buscar" && args) {
    const query = args.trim();
    const { data: resultados } = await supabase
      .from("personas")
      .select("id, nombre, apodo, anios, fechas, epitafio, velas, flores, familia_id")
      .or(`nombre.ilike.%${query}%,apodo.ilike.%${query}%,epitafio.ilike.%${query}%,familia_id.ilike.%${query}%`)
      .limit(6);

    if (resultados && resultados.length > 0) {
      const lineas = resultados.map((p: any) => {
        const datos = [
          `👤 *${p.nombre}*${p.apodo ? ` («${p.apodo}»)` : ""}`,
          `✦ ${p.anios}`,
          p.epitafio ? `_“${p.epitafio}”_` : "",
          `🕯️ ${p.velas || 0} velas · 🌹 ${p.flores || 0} flores`,
          `👉 [Ver altar digital](${siteUrl}/#/persona/${p.id})`,
        ]
          .filter(Boolean)
          .join("\n");
        return datos;
      });

      const texto = [
        `🔍 *RESULTADOS PARA: "${query}"* (${resultados.length})`,
        "──────────────────────────",
        ...lineas,
      ].join("\n\n");

      await sendTelegram(token, "sendMessage", {
        chat_id: chatId,
        text: texto,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });
      return;
    }
  }

  // ATENCIÓN CON INTELIGENCIA ARTIFICIAL (Para cualquier pregunta, saludo, búsqueda natural o consulta)
  sendTelegram(token, "sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {});
  const respuestaIA = await consultarIA(supabase, openrouterKey, siteUrl, rawText);

  if (respuestaIA) {
    await sendTelegram(token, "sendMessage", {
      chat_id: chatId,
      text: respuestaIA,
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    });
    return;
  }

  // Fallback si la IA no está disponible o falla la red
  await sendTelegram(token, "sendMessage", {
    chat_id: chatId,
    text: `🕊️ *Santuario Digital*\n\nUsa /ayuda para ver los comandos o escribe el nombre de un familiar para buscar su altar.`,
    parse_mode: "Markdown",
  });
}
