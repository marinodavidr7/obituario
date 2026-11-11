import { aprobarPersona, getFamilia, getPersona, rechazarPersona, getConfig } from "@/lib/db";

export function getTelegramConfig() {
  const envToken = (import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string) || "";
  const envChatId = (import.meta.env.VITE_TELEGRAM_CHAT_ID as string) || "";

  const token = (envToken || getConfig("telegram_bot_token") || "").trim();
  const chatId = (envChatId || getConfig("telegram_chat_id") || "").trim();
  const appUrl = (typeof window !== "undefined" ? window.location.origin : "").replace(/\/$/, "");

  return { token, chatId, appUrl, configurado: Boolean(token && chatId) };
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
