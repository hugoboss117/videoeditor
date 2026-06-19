/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// For GitHub Pages set base to "/<repo-name>/". Local dev/preview uses "/".
const base = process.env.GHPAGES === "1" ? "/videoeditor/" : "/";

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["assets/**/*"],
      manifest: {
        name: "Promo Editor",
        short_name: "Promo",
        display: "standalone",
        background_color: "#0a0a0a",
        theme_color: "#0a0a0a",
        icons: [
          { src: "assets/branding/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "assets/branding/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
      },
    }),
  ],
  test: { environment: "jsdom" },
});
