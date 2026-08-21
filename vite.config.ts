import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Demo mode is opt-in only, and only via the dedicated `dev:demo` /
// `build:demo` npm scripts (never a developer's own .env file — Vite
// only auto-loads `VITE_`-prefixed vars from .env files into
// `import.meta.env`, it does not set process.env from them, so this
// check can only be satisfied by an explicit shell-level env var).
// This runs in Node at config-evaluation time, so when it's false the
// alias below is never added and src/demo/** never enters the module
// graph at all — not even as a dead-code-eliminated chunk. That's a
// stronger guarantee than tree-shaking that demo fixtures can't leak
// into a normal dev session or production build.
const isDemo = process.env.VITE_DEMO_MODE === "true";

// Vite config tuned for Tauri: fixed dev port the Rust shell expects,
// no automatic browser open (a native window opens instead), and
// HMR over a fixed port so it survives Tauri's own process supervision.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  resolve: isDemo
    ? {
        alias: {
          "@tauri-apps/api/core": path.resolve(__dirname, "src/demo/mockTauriCore.ts"),
        },
      }
    : undefined,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**", "**/crates/**", "**/target/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
