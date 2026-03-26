import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import UnoCSS from "unocss/vite";
import presetWind from "@unocss/preset-wind";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [
    UnoCSS({
      presets: [presetWind()],
      theme: {
        colors: {
          bg: "var(--bg)",
          surface1: "var(--surface-1)",
          surface2: "var(--surface-2)",
          surface3: "var(--surface-3)",
          surface4: "var(--surface-4)",
          text: "var(--text)",
          muted: "var(--text-muted)",
          subtle: "var(--text-subtle)",
          accent: "var(--accent)",
          accentDim: "var(--accent-dim)",
          accentText: "var(--accent-text)",
          focusAccent: "var(--focus-accent)",
          danger: "var(--danger)",
        },
      },
    }),
    react(),
  ],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
}));
