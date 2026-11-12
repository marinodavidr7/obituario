import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://ljgdjiqbftrrwsclgics.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_yysjerLCXEg7srHkljKwbw_ee_NQXlQ";
const DEFAULT_BOT_TOKEN = "8560777329:AAEeeqROpsTRYid6HCFQAC8H1zY7AObmu5E";
const DEFAULT_OPENROUTER_KEY = "";

let supabaseClient: any = null;
function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
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

  let token = process.env.VITE_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  let chatId = process.env.VITE_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID || "";
  let siteUrl = "https://obituariocloud.vercel.app";
  let openrouterKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY || DEFAULT_OPENROUTER_KEY;

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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, message: "Bot de Telegram para Obituario Familiar activo con IA." });
  }

  const supabase = getSupabase();
  const { token, siteUrl, openrouterKey } = await getBotConfig(supabase);

  const update = req.body || {};

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
