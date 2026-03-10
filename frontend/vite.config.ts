import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon-new.svg", "favicon.ico", "apple-touch-icon.png", "robots.txt"],
      manifest: {
        name: "ShiftMatch",
        short_name: "ShiftMatch",
        description: "Platform for matching workers and businesses across multiple industries.",
        start_url: "/",
        display: "standalone",
        background_color: "#f8f9fa",
        theme_color: "#0ea5e9",
        orientation: "portrait",
        dir: "rtl",
        lang: "he",
        icons: [
          {
            src: "/favicon-new.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
        categories: ["business", "productivity", "jobs"],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
});
