/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Sports Card Scanner",
        short_name: "CardScanner",
        description: "PSA-style centering analysis + eBay sale comps for sports cards",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png}"],
        // Keep the ~10MB OpenCV chunk out of the precache; cache it at runtime
        // on first use instead (it's lazy-loaded only when Auto-detect runs).
        globIgnores: ["**/opencv-*.js"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/assets\/opencv-.*\.js$/,
            handler: "CacheFirst",
            options: {
              cacheName: "opencv-wasm",
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Isolate OpenCV into its own chunk so it stays lazy + runtime-cached.
        manualChunks(id) {
          if (id.includes("@techstark/opencv-js")) return "opencv";
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "node",
  },
});
