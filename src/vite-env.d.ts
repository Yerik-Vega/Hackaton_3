/// <reference types="vite/client" />

// Inyectado por vite.config.ts (define)
declare const __BUILD_SHA__: string;

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WS_BASE_URL: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_KEY?: string; // clave PUBLICABLE (nunca la secreta)
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
