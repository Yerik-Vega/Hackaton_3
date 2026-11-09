import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "node:child_process";

// Valor de la cabecera X-Lumon-Build, inyectado EN TIEMPO DE BUILD (no se escribe a mano).
// - `npm run dev`  -> "dev"
// - build en Vercel/Netlify/Cloudflare -> SHA corto (7) del commit desplegado
function buildSha(command: string): string {
  if (command === "serve") return "dev";
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ?? // Vercel
    process.env.COMMIT_REF ?? // Netlify
    process.env.CF_PAGES_COMMIT_SHA; // Cloudflare Pages
  if (sha) return sha.slice(0, 7);
  try {
    return execSync("git rev-parse --short=7 HEAD").toString().trim();
  } catch {
    return "dev";
  }
}

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  define: {
    __BUILD_SHA__: JSON.stringify(buildSha(command)),
  },
}));
