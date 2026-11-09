import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';

// SHA corto de 7 caracteres del commit que se está construyendo.
function resolveBuild(): string {
  const fromHost =
      process.env.VERCEL_GIT_COMMIT_SHA ??   // Vercel
      process.env.COMMIT_REF ??              // Netlify
      process.env.CF_PAGES_COMMIT_SHA;       // Cloudflare Pages
  if (fromHost) return fromHost.slice(0, 7);
  try {
    return execSync('git rev-parse --short=7 HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  define: {
    // en local (vite dev) vale 'dev'; en build vale el SHA real
    __APP_BUILD__: JSON.stringify(command === 'build' ? resolveBuild() : 'dev'),
  },
}));