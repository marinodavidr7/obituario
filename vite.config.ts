import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import fs from "node:fs";
import iaHandler from "./api/ia.ts";

// En desarrollo, Vite no vuelca el .env en process.env. Lo hacemos para que el
// handler /api/ia pueda leer OPENROUTER_API_KEY y las claves de Supabase.
Object.assign(
  process.env,
  loadEnv(process.env.NODE_ENV === "production" ? "production" : "development", process.cwd(), "")
);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["icon-192.png", "icon-512.png", "apple-touch-icon.png", "manifest.webmanifest"],
      manifest: {
        id: "/",
        name: "Obituario Familiar — En Memoria",
        short_name: "Obituario",
        description: "Un santuario sereno para honrar la memoria de nuestros seres queridos.",
        theme_color: "#050709",
        background_color: "#050709",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        lang: "es",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,jpeg,svg,webp,avif,woff,woff2,webmanifest}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-media-cache",
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90 días en caché local
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "images-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
    {
      name: "dev-api-ia",
      configureServer(server) {
        // Emula la función serverless /api/ia durante `npm run dev`.
        server.middlewares.use("/api/ia", async (req, res, next) => {
          if (req.method === "GET") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ ok: true, message: "Servicio de redacción IA activo (dev)." }));
            return;
          }
          if (req.method !== "POST") {
            next();
            return;
          }

          try {
            const trozos: Buffer[] = [];
            for await (const trozo of req) trozos.push(Buffer.from(trozo as any));
            const crudo = Buffer.concat(trozos).toString("utf8");
            const body = crudo ? JSON.parse(crudo) : {};

            const resVercel: any = {
              statusCode: 200,
              status(code: number) {
                this.statusCode = code;
                return this;
              },
              setHeader(clave: string, valor: string) {
                res.setHeader(clave, valor);
              },
              json(obj: any) {
                res.statusCode = this.statusCode;
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                res.end(JSON.stringify(obj));
              },
            };

            await iaHandler(
              { method: req.method, body, headers: req.headers, socket: req.socket },
              resVercel
            );
          } catch (err) {
            console.error("[dev /api/ia]", err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ ok: false, error: "Error interno del servicio de IA." }));
          }
        });
      },
    },
    {
      name: "local-uploads-middleware",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith("/uploads/")) {
            const fileName = req.url.replace(/^\/uploads\//, "").split("?")[0];
            const filePath = path.resolve(process.cwd(), "data", "uploads", fileName);
            if (fs.existsSync(filePath)) {
              const ext = path.extname(filePath).toLowerCase();
              const mimeMap: Record<string, string> = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".gif": "image/gif",
                ".webp": "image/webp",
                ".mp3": "audio/mpeg",
                ".m4a": "audio/mp4",
              };
              res.setHeader("Content-Type", mimeMap[ext] || "application/octet-stream");
              res.setHeader("Cache-Control", "public, max-age=86400");
              return fs.createReadStream(filePath).pipe(res);
            }
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname || ".", "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
