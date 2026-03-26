import { readFileSync } from "fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import UnoCSS from "unocss/vite";
import { presetWind } from "unocss";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// BlockSuite 0.18.x has a typo: "CheckBoxCkeckSolidIcon" ("Ckeck" vs "Check").
// The icon exists in the @blocksuite/icons packages under the correct spelling.
// We fix the typo at both the esbuild (optimizeDeps) and Rollup (build) layers.
const TYPO = "CheckBoxCkeckSolidIcon";
const CORRECT = "CheckBoxCheckSolidIcon";

const blocksuiteIconFix = {
  name: "fix-blocksuite-icon-typo",
  transform(code: string, id: string) {
    if (id.includes("node_modules/@blocksuite") && code.includes(TYPO)) {
      return { code: code.replaceAll(TYPO, CORRECT), map: null };
    }
  },
};

export default defineConfig(async () => ({
  plugins: [
    blocksuiteIconFix,
    UnoCSS({
      presets: [presetWind()],
      theme: {
        colors: {
          bg: "var(--bg)",
          surface1: "var(--surface-1)",
          surface2: "var(--surface-2)",
          surface3: "var(--surface-3)",
          surface4: "var(--surface-4)",
          border: "var(--border)",
          borderMid: "var(--border-mid)",
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

  optimizeDeps: {
    // 'esnext' target stops esbuild from transpiling class fields, which would
    // break Lit's decorator-based property system and make new.target invalid
    // for custom element constructors (affine-editor-container etc.).
    esbuildOptions: {
      target: "esnext",
      plugins: [
        {
          name: "fix-blocksuite-icon-typo-esbuild",
          setup(build: { onLoad: Function }) {
            build.onLoad({ filter: /\.(js|mjs)$/, namespace: "file" }, (args: { path: string }) => {
              if (!args.path.includes("@blocksuite")) return null;
              try {
                const source = readFileSync(args.path, "utf8");
                if (!source.includes(TYPO)) return null;
                return { contents: source.replaceAll(TYPO, CORRECT), loader: "js" };
              } catch {
                return null;
              }
            });
          },
        },
      ],
    },
  },

  esbuild: {
    target: "esnext",
  },

  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
