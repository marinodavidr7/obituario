import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://ljgdjiqbftrrwsclgics.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_yysjerLCXEg7srHkljKwbw_ee_NQXlQ";
const DEFAULT_BOT_TOKEN = "8560777329:AAEeeqROpsTRYid6HCFQAC8H1zY7AObmu5E";

async function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
  return createClient(url, key);
}

async function getBotConfig(supabase: any) {
  let token = process.env.VITE_TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  let chatId = process.env.VITE_TELEGRAM_CHAT_ID || "";
  let siteUrl = "https://ariocloud.vercel.app";

  try {
    const { data } = await supabase.from("config").select("clave, valor");
    if (data) {
      for (const row of data) {
        if (row.clave === "telegram_bot_token" && row.valor) token = row.valor;
        if (row.clave === "telegram_chat_id" && row.valor) chatId = row.valor;
        if (row.clave === "site_url" && row.valor) siteUrl = row.valor.replace(/\/$/, "");
      }
    }
  } catch (e) {
    console.warn("[Telegram Webhook] Error obteniendo config de Supabase:", e);
  }

  return { token, chatId, siteUrl };
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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, message: "Bot de Telegram para Obituario Familiar activo." });
  }

  const supabase = await getSupabase();
  const { token, siteUrl } = await getBotConfig(supabase);

  const update = req.body || {};

  // 1. Manejo de Botones Interactivos (Callback Queries)
  if (update.callback_query) {
    const cq = update.callback_query;
    const data = cq.data || "";
    const fromId = cq.from?.id;
    const messageId = cq.message?.message_id;
    const chatId = cq.message?.chat?.id;

    if (data.startsWith("aprobar:")) {
      const personaId = data.replace("aprobar:", "");
      const { data: persona } = await supabase.from("personas").select("nombre").eq("id", personaId).maybeSingle();
      await supabase.from("personas").update({ estado: "publicado" }).eq("id", personaId);

      await sendTelegram(token, "answerCallbackQuery", {
        callback_query_id: cq.id,
        text: `✅ ${persona?.nombre || "Familiar"} ha sido aprobado y publicado en el obituario.`,
        show_alert: true,
      });

      if (chatId && messageId) {
        await sendTelegram(token, "editMessageReplyMarkup", {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: "✅ APROBADO Y PUBLICADO", callback_data: "noop" }],
              [{ text: "🌐 Ver en el Santuario", url: `${siteUrl}/#/persona/${personaId}` }],
            ],
          },
        });
      }
      return res.status(200).json({ ok: true });
    }

    if (data.startsWith("rechazar:")) {
      const personaId = data.replace("rechazar:", "");
      const { data: persona } = await supabase.from("personas").select("nombre").eq("id", personaId).maybeSingle();
      await supabase.from("personas").delete().eq("id", personaId);

      await sendTelegram(token, "answerCallbackQuery", {
        callback_query_id: cq.id,
        text: `❌ Solicitud de ${persona?.nombre || "familiar"} rechazada y eliminada.`,
        show_alert: true,
      });

      if (chatId && messageId) {
        await sendTelegram(token, "editMessageReplyMarkup", {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [[{ text: "❌ SOLICITUD RECHAZADA", callback_data: "noop" }]],
          },
        });
      }
      return res.status(200).json({ ok: true });
    }

    if (data.startsWith("cmd:")) {
      await sendTelegram(token, "answerCallbackQuery", { callback_query_id: cq.id });
      const cmd = data.replace("cmd:", "");
      await procesarComando(supabase, token, siteUrl, chatId, "/" + cmd, "");
      return res.status(200).json({ ok: true });
    }

    await sendTelegram(token, "answerCallbackQuery", { callback_query_id: cq.id });
    return res.status(200).json({ ok: true });
  }

  // 2. Manejo de Mensajes de Texto
  const message = update.message;
  if (!message || !message.text) {
    return res.status(200).json({ ok: true });
  }

  const chatId = message.chat.id;
  const rawText = message.text.trim();

  let cmd = rawText.split(" ")[0].toLowerCase();
  if (cmd.includes("@")) cmd = cmd.split("@")[0]; // soporte para /comando@bot_name
  const args = rawText.slice(cmd.length).trim();

  await procesarComando(supabase, token, siteUrl, chatId, cmd, args);

  return res.status(200).json({ ok: true });
}

async function procesarComando(
  supabase: any,
  token: string,
  siteUrl: string,
  chatId: number | string,
  cmd: string,
  args: string
) {
  // Menú principal / Ayuda
  if (cmd === "/start" || cmd === "/ayuda" || cmd === "/help") {
    const texto = [
      "🕊️ *SANTUARIO DIGITAL · OBITUARIO FAMILIAR*",
      "──────────────────────────",
      "¡Bienvenido! Este bot te permite consultar el estado del obituario, buscar difuntos y gestionar solicitudes.",
      "",
      "📌 *Comandos disponibles:*",
      "📊 `/stats` - Estadísticas generales (almas, familias, velas y flores)",
      "🕊️ `/solicitudes` - Ver solicitudes pendientes de aprobación",
      "🔍 `/buscar <nombre>` - Buscar a un familiar o difunto",
      "🕯️ `/ultimos` - Ver las últimas almas registradas",
      "🏛️ `/familias` - Lista de familias en el memorial",
      "💌 `/dedicatorias` - Últimas dedicatorias de condolencia",
      "❓ `/ayuda` - Volver a mostrar este menú",
      "",
      "💡 *Tip rápido:* Puedes escribir directamente el nombre de un familiar (ej: `Maria` o `García`) y te mostraré su ficha de inmediato.",
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
          { text: "💌 Dedicatorias", callback_data: "cmd:dedicatorias" },
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

  // Estadísticas generales
  if (cmd === "/stats" || cmd === "/resumen") {
    const [perRes, famRes, dedRes] = await Promise.all([
      supabase.from("personas").select("id, estado, velas, flores"),
      supabase.from("familias").select("id"),
      supabase.from("dedicatorias").select("id"),
    ]);

    const personas = perRes.data || [];
    const publicadas = personas.filter((p: any) => p.estado === "publicado" || !p.estado);
    const pendientes = personas.filter((p: any) => p.estado === "pendiente");
    const totalVelas = personas.reduce((acc: number, p: any) => acc + (p.velas || 0), 0);
    const totalFlores = personas.reduce((acc: number, p: any) => acc + (p.flores || 0), 0);
    const totalFamilias = (famRes.data || []).length;
    const totalDedicatorias = (dedRes.data || []).length;

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
      "Estado de sincronización: Conectado en Tiempo Real",
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

  // Solicitudes pendientes de aprobación
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

    await sendTelegram(token, "sendMessage", {
      chat_id: chatId,
      text: `⏳ *SOLICITUDES PENDIENTES (${solicitudes.length})*\nRevisa cada familiar y pulsa en aprobar o rechazar:`,
      parse_mode: "Markdown",
    });

    for (const sol of solicitudes) {
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

      await sendTelegram(token, "sendMessage", {
        chat_id: chatId,
        text: textoSol,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard },
      });
    }
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

  // Búsqueda (explícita con /buscar o texto directo)
  const query = cmd === "/buscar" ? args : (cmd.startsWith("/") ? "" : `${cmd} ${args}`.trim());

  if (query) {
    const { data: resultados } = await supabase
      .from("personas")
      .select("id, nombre, apodo, anios, fechas, epitafio, velas, flores, familia_id")
      .or(`nombre.ilike.%${query}%,apodo.ilike.%${query}%,epitafio.ilike.%${query}%,familia_id.ilike.%${query}%`)
      .limit(6);

    if (!resultados || resultados.length === 0) {
      await sendTelegram(token, "sendMessage", {
        chat_id: chatId,
        text: `🔍 No encontré registros que coincidan con *"${query}"*.\n\nPrueba buscando por otro nombre, apellido o escribe /ayuda para ver los comandos.`,
        parse_mode: "Markdown",
      });
      return;
    }

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

  // Comando no reconocido
  await sendTelegram(token, "sendMessage", {
    chat_id: chatId,
    text: `❓ Comando no reconocido.\n\nUsa /ayuda para ver los comandos disponibles o escribe el nombre de un ser querido para buscarlo.`,
    parse_mode: "Markdown",
  });
}
