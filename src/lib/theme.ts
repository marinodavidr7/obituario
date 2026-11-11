import { useEffect, useState } from "react";
import { triggerHaptic } from "./haptics";
import { getConfig, setConfig } from "./db";

export type ThemeId =
  | "default"
  | "blanco"
  | "azul-cielo"
  | "rojo"
  | "rosado"
  | "amarillo"
  | "morado"
  | "verde";

export interface ThemeOption {
  id: ThemeId;
  label: string;
  dotColor: string;
  ringColor: string;
  badge: string;
  desc: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: "default",
    label: "Por defecto",
    dotColor: "#c9a86a",
    ringColor: "ring-[#c9a86a]",
    badge: "bg-gold/20 text-gold-soft border-gold/40",
    desc: "Oro sacro y piedra oscura",
  },
  {
    id: "blanco",
    label: "Blanco",
    dotColor: "#ffffff",
    ringColor: "ring-stone-400",
    badge: "bg-white text-stone-900 border-stone-300",
    desc: "Mármol celestial claro",
  },
  {
    id: "azul-cielo",
    label: "Azul Cielo",
    dotColor: "#38bdf8",
    ringColor: "ring-sky-400",
    badge: "bg-sky-500/20 text-sky-200 border-sky-400/40",
    desc: "Cielo etéreo y sereno",
  },
  {
    id: "rojo",
    label: "Rojo",
    dotColor: "#f43f5e",
    ringColor: "ring-rose-400",
    badge: "bg-rose-500/20 text-rose-200 border-rose-400/40",
    desc: "Carmesí sagrado y devoción",
  },
  {
    id: "rosado",
    label: "Rosado",
    dotColor: "#f472b6",
    ringColor: "ring-pink-400",
    badge: "bg-pink-500/20 text-pink-200 border-pink-400/40",
    desc: "Ternura y memoria dulce",
  },
  {
    id: "amarillo",
    label: "Amarillo",
    dotColor: "#eab308",
    ringColor: "ring-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-200 border-yellow-400/40",
    desc: "Luz solar y resplandor",
  },
  {
    id: "morado",
    label: "Morado",
    dotColor: "#a855f7",
    ringColor: "ring-purple-400",
    badge: "bg-purple-500/20 text-purple-200 border-purple-400/40",
    desc: "Púrpura sacramental solemne",
  },
  {
    id: "verde",
    label: "Verde",
    dotColor: "#10b981",
    ringColor: "ring-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
    desc: "Esperanza y vida eterna",
  },
];

const VALID_THEMES: ThemeId[] = [
  "default",
  "blanco",
  "azul-cielo",
  "rojo",
  "rosado",
  "amarillo",
  "morado",
  "verde",
];

const THEME_STORAGE_KEY = "panteon_theme";

export function getGeneralSanctuaryTheme(): ThemeId {
  if (typeof window === "undefined") return "default";
  const fromConfig = getConfig("tema_general") as ThemeId | undefined;
  if (fromConfig && VALID_THEMES.includes(fromConfig)) {
    return fromConfig;
  }
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
  if (stored && VALID_THEMES.includes(stored)) {
    return stored;
  }
  return "default";
}

const HIGH_CONTRAST_STORAGE_KEY = "panteon_alto_contraste";

export function getHighContrast(): boolean {
  if (typeof window === "undefined") return false;
  const fromConfig = getConfig("alto_contraste");
  if (fromConfig !== null) {
    return fromConfig === "true" || fromConfig === "1";
  }
  const stored = localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY);
  if (stored !== null) {
    return stored === "true" || stored === "1";
  }
  return false;
}

export function applyHighContrastToDOM(enabled: boolean): void {
  if (typeof document === "undefined") return;
  if (enabled) {
    document.documentElement.setAttribute("data-high-contrast", "true");
    document.documentElement.classList.add("high-contrast");
  } else {
    document.documentElement.removeAttribute("data-high-contrast");
    document.documentElement.classList.remove("high-contrast");
  }
}

export function setHighContrast(enabled: boolean): void {
  if (typeof window === "undefined") return;
  const valStr = enabled ? "true" : "false";
  setConfig("alto_contraste", valStr);
  localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, valStr);
  applyHighContrastToDOM(enabled);
  window.dispatchEvent(new CustomEvent("panteon:high-contrast-changed", { detail: enabled }));
  triggerHaptic("selection");
}

// Guarda la configuración del tema general del santuario (Acción de Administrador)
export function setGeneralSanctuaryTheme(theme: ThemeId): void {
  if (typeof window === "undefined") return;
  setConfig("tema_general", theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyThemeToDOM(theme);
  window.dispatchEvent(new CustomEvent("panteon:theme-changed", { detail: theme }));
  triggerHaptic("selection");
}

export function applyThemeToDOM(theme: ThemeId | string | null | undefined): void {
  if (typeof document === "undefined") return;
  const target = theme && VALID_THEMES.includes(theme as ThemeId) ? theme : "default";
  document.documentElement.setAttribute("data-theme", target);
}

// Control del tema específico del alma cuando se visita su ficha
let activeSoulTheme: ThemeId | null = null;

export function applySoulTheme(theme: string | null | undefined): void {
  if (typeof document === "undefined") return;
  const target = theme && VALID_THEMES.includes(theme as ThemeId) ? (theme as ThemeId) : getGeneralSanctuaryTheme();
  activeSoulTheme = target;
  applyThemeToDOM(target);
}

export function clearSoulTheme(): void {
  activeSoulTheme = null;
  applyThemeToDOM(getGeneralSanctuaryTheme());
}

export function getActiveSoulTheme(): ThemeId | null {
  return activeSoulTheme;
}

export function initTheme(): void {
  if (!activeSoulTheme) {
    applyThemeToDOM(getGeneralSanctuaryTheme());
  }
  applyHighContrastToDOM(getHighContrast());
}

export function useHighContrast() {
  const [highContrast, setHighContrastState] = useState<boolean>(getHighContrast);

  useEffect(() => {
    applyHighContrastToDOM(getHighContrast());

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      const val = typeof customEvent.detail === "boolean" ? customEvent.detail : getHighContrast();
      setHighContrastState(val);
      applyHighContrastToDOM(val);
    };

    const handleDbUpdate = () => {
      const val = getHighContrast();
      setHighContrastState(val);
      applyHighContrastToDOM(val);
    };

    window.addEventListener("panteon:high-contrast-changed", handler);
    window.addEventListener("panteon:db-updated", handleDbUpdate);

    return () => {
      window.removeEventListener("panteon:high-contrast-changed", handler);
      window.removeEventListener("panteon:db-updated", handleDbUpdate);
    };
  }, []);

  return {
    highContrast,
    setHighContrast,
    toggleHighContrast: () => setHighContrast(!highContrast),
  };
}

export function useTheme() {
  const [current, setCurrent] = useState<ThemeId>(getGeneralSanctuaryTheme);

  useEffect(() => {
    initTheme();

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeId>;
      const t = customEvent.detail || getGeneralSanctuaryTheme();
      setCurrent(t);
      if (!activeSoulTheme) {
        applyThemeToDOM(t);
      }
    };

    const handleDbUpdate = () => {
      const t = getGeneralSanctuaryTheme();
      setCurrent(t);
      // Si estamos dentro de la ficha de un alma con su propio color, no pisarlo
      if (!activeSoulTheme) {
        applyThemeToDOM(t);
      }
    };

    window.addEventListener("panteon:theme-changed", handler);
    window.addEventListener("panteon:db-updated", handleDbUpdate);

    return () => {
      window.removeEventListener("panteon:theme-changed", handler);
      window.removeEventListener("panteon:db-updated", handleDbUpdate);
    };
  }, []);

  return {
    theme: current,
    setTheme: setGeneralSanctuaryTheme,
    themes: THEMES,
  };
}
