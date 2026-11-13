import { aprobarPersona, getFamilia, getPersona, rechazarPersona, getConfig, setConfig } from "@/lib/db";
import type { FotoPendiente } from "@/types";

export function getTelegramConfig() {
  const envToken = (import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string) || "";
  const envChatId = (import.meta.env.VITE_TELEGRAM_CHAT_ID as string) || "";

  const token = (getConfig("telegram_bot_token") || envToken || "").trim();
  const chatId = (getConfig("telegram_chat_id") || envChatId || "").trim();
  const appUrl = (typeof window !== "undefined" ? window.location.origin : "").replace(/\/$/, "");

  return { token, chatId, appUrl, configurado: Boolean(token && chatId) };
}

export function guardarTelegramConfig(token: string, chatId: string) {
  setConfig("telegram_bot_token", token.trim() || null);
  setConfig("telegram_chat_id", chatId.trim() || null);
}

export async function verificarBotTelegram(customToken?: string): Promise<{ ok: boolean; username?: string; firstName?: string; error?: string }> {
  const cfg = getTelegramConfig();
  const token = (customToken !== undefined ? customToken : cfg.token).trim();
  if (!token) return { ok: false, error: "Token no proporcionado" };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json().catch(() => ({}));
    if (data.ok && data.result) {
      return { ok: true, username: data.result.username, firstName: data.result.first_name };
    }
    return { ok: false, error: data.description || "Token de bot inválido" };
  } catch (e: any) {
    return { ok: false, error: e.message || "Error al conectar con Telegram" };
  }
}

export async function probarTelegram(customToken?: string, customChatId?: string): Promise<{ ok: boolean; error?: string }> {
  const cfg = getTelegramConfig();
  const token = (customToken !== undefined ? customToken : cfg.token).trim();
  const chatId = (customChatId !== undefined ? customChatId : cfg.chatId).trim();

  if (!token) return { ok: false, error: "Falta el Bot Token de Telegram" };
  if (!chatId) return { ok: false, error: "Falta el Chat ID de Telegram" };

  const texto = [
    "🕊️ *PRUEBA DE CONEXIÓN CON EL BOT*",
    "──────────────────────────",
    "¡El Bot de Telegram para el Obituario Familiar está correctamente vinculado!",
    "",
    "A partir de ahora, cada vez que una familia inscriba a un nuevo ser querido, recibirás la ficha completa aquí para revisarla y aprobarla.",
    `📅 Fecha: ${new Date().toLocaleString("es-ES")}`,
  ].join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: texto,
        parse_mode: "Markdown",
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { ok: false, error: errData.description || "Error de API Telegram" };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Error de red al conectar con Telegram" };
  }
}

export async function registrarWebhookTelegram(customToken?: string, webhookUrl?: string): Promise<{ ok: boolean; error?: string }> {
  const cfg = getTelegramConfig();
  const token = (customToken !== undefined ? customToken : cfg.token).trim();

  let targetUrl = (webhookUrl || "").trim();
  if (!targetUrl) {
    if (cfg.appUrl && cfg.appUrl.startsWith("https://")) {
      targetUrl = `${cfg.appUrl}/api/telegram`;
    } else {
      targetUrl = "https://obituariocloud.vercel.app/api/telegram";
    }
  }

  if (!token) return { ok: false, error: "Falta el token del bot" };
  if (!targetUrl.startsWith("https://")) {
    return { ok: false, error: "La URL del webhook debe comenzar con HTTPS" };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: targetUrl,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: false,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.ok) return { ok: true };
    return { ok: false, error: data.description || "Error al registrar webhook" };
  } catch (e: any) {
    return { ok: false, error: e.message || "Error de red al conectar con Telegram" };
  }
}

export async function notificarSolicitudTelegram(personaId: string): Promise<{ ok: boolean; error?: string }> {
  const { token, chatId, appUrl, configurado } = getTelegramConfig();
  if (!configurado) {
    console.info(
      "[Telegram] Bot no configurado. La solicitud se registró en el panel de administración."
    );
    return { ok: false, error: "Telegram no configurado" };
  }

  const p = getPersona(personaId);
  if (!p) return { ok: false, error: "Persona no encontrada" };
  const fam = getFamilia(p.familia_id);
  const familiaApellido = fam?.apellido || "Sin familia";

  const texto = [
    "🕊️ *NUEVA SOLICITUD DE FAMILIAR*",
    "──────────────────────────",
    `👤 *Nombre:* ${p.nombre}${p.apodo ? ` («${p.apodo}»)` : ""}`,
    `🏛️ *Familia:* ${familiaApellido}`,
    `✦ *Años:* ${p.anios}`,
    p.fechas ? `📅 *Fechas completas:* ${p.fechas}` : "",
    p.epitafio ? `💬 *Epitafio:* “${p.epitafio}”` : "",
    p.solicitante ? `✍️ *Enviado por:* ${p.solicitante}` : "",
    p.contacto ? `📞 *Contacto:* ${p.contacto}` : "",
    "⚖️ *Consentimiento legal:* Aceptado (Familia legítima y deslinde total de responsabilidad)",
    p.bio ? `📖 *Biografía:* ${p.bio.slice(0, 150)}${p.bio.length > 150 ? "…" : ""}` : "",
    "──────────────────────────",
    "⏳ *Estado:* En revisión",
    "¿Deseas autorizar su publicación en el obituario?",
  ]
    .filter(Boolean)
    .join("\n");

  const inline_keyboard = [
    [
      { text: "✏️ Ver en Panel", url: `${appUrl}/#/admin/editar/${p.id}` },
    ],
  ];

  try {
    const resMsg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: texto,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard },
      }),
    });

    if (!resMsg.ok) {
      const errData = await resMsg.json().catch(() => ({}));
      return { ok: false, error: errData.description || "Error de API Telegram" };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Error al conectar con Telegram" };
  }
}

export async function corregirOrtografiaIA(
  texto: string
): Promise<{ ok: boolean; textoCorregido: string }> {
  const limpio = texto.trim();
  if (!limpio) return { ok: false, textoCorregido: texto };
  try {
    const res = await fetch("/api/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "corregir_ortografia", texto: limpio }),
    });
    if (!res.ok) return { ok: false, textoCorregido: texto };
    const data = await res.json().catch(() => ({}));
    if (data.ok && typeof data.textoCorregido === "string" && data.textoCorregido.trim()) {
      return { ok: true, textoCorregido: data.textoCorregido.trim() };
    }
    return { ok: false, textoCorregido: texto };
  } catch {
    return { ok: false, textoCorregido: texto };
  }
}

export async function notificarFotoPendienteTelegram(
  foto: FotoPendiente
): Promise<{ ok: boolean; error?: string }> {
  const { token, chatId, appUrl, configurado } = getTelegramConfig();
  if (!configurado) return { ok: false, error: "Telegram no configurado" };

  const caption = [
    "📸 *NUEVA FOTO EN ESPERA DE APROBACIÓN*",
    "──────────────────────────",
    `👤 *Para:* ${foto.persona_nombre}`,
    `✍️ *Enviada por:* ${foto.remitente}`,
    "⏳ *Estado:* Pendiente de aprobación",
    "──────────────────────────",
    "¿Deseas agregar esta foto a su galería?",
  ].join("\n");

  const inline_keyboard = [
    [
      { text: "✅ Aprobar Foto", callback_data: `aprobar_foto:${foto.id}` },
      { text: "❌ Rechazar", callback_data: `rechazar_foto:${foto.id}` },
    ],
    [{ text: "✏️ Ver en Panel", url: `${appUrl}/#/admin/editar/${foto.persona_id}` }],
  ];

  try {
    const resPhoto = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: foto.url,
        caption,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard },
      }),
    });
    if (resPhoto.ok) return { ok: true };

    // Fallback a sendMessage si Telegram no pudo descargar la URL directamente
    const resMsg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `${caption}\n\n🔗 [Ver imagen](${foto.url})`,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard },
      }),
    });
    if (!resMsg.ok) {
      const errData = await resMsg.json().catch(() => ({}));
      return { ok: false, error: errData.description || "Error de API Telegram" };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Error al conectar con Telegram" };
  }
}
