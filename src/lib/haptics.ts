"use client";

/**
 * Provee vibración táctil nativa en dispositivos móviles que lo soporten
 * (Android Chrome, Edge, Samsung Internet, PWAs instaladas).
 */
export function triggerHaptic(
  type: "light" | "medium" | "heavy" | "selection" | "success" | "candle" = "light"
) {
  if (typeof window === "undefined" || !("vibrate" in navigator)) return;

  try {
    switch (type) {
      case "light":
        navigator.vibrate(8);
        break;
      case "medium":
        navigator.vibrate(18);
        break;
      case "heavy":
        navigator.vibrate(28);
        break;
      case "selection":
        navigator.vibrate(12);
        break;
      case "candle":
        // Doble pulso cálido
        navigator.vibrate([15, 30, 20]);
        break;
      case "success":
        navigator.vibrate([12, 40, 24]);
        break;
    }
  } catch {
    // Si el usuario deshabilitó vibración o el dispositivo no lo permite, ignorar en silencio
  }
}
