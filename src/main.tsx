import "@vitejs/plugin-react/preamble";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
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

// Registrar Service Worker en producción para PWA offline de forma nativa y robusta con actualización automática
if (import.meta.env.PROD && typeof window !== "undefined" && "serviceWorker" in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[PWA Obituario] Service Worker registrado:", reg.scope);
        // Buscar actualizaciones de inmediato cada vez que se abre la app
        reg.update();
      })
      .catch((err) => {
        console.warn("[PWA Obituario] Registro de Service Worker:", err);
      });
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
