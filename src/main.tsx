import "@vitejs/plugin-react/preamble";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";
import { initTheme } from "./lib/theme";

// Inicializar tema guardado (default, blanco, azul-cielo, rojo)
initTheme();

// En desarrollo, desregistrar cualquier Service Worker previo para evitar intercepciones de caché a Vite
if (import.meta.env.DEV && typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

// Registrar Service Worker solo en producción para PWA offline
if (import.meta.env.PROD && typeof window !== "undefined" && "serviceWorker" in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log("[PWA Panteón] Nueva versión disponible.");
    },
    onOfflineReady() {
      console.log("[PWA Panteón] Santuario disponible 100% offline.");
    },
  });
}

const container = document.getElementById("root");
const boot = document.getElementById("boot");
if (boot) boot.remove();

if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
