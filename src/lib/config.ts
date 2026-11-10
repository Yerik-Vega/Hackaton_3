// Toda la configuración viene de variables de entorno VITE_* (nada hardcodeado).
export const API_BASE = import.meta.env.VITE_API_BASE_URL;
export const WS_BASE = import.meta.env.VITE_WS_BASE_URL;
// Supabase Storage (solo la clave PUBLICABLE: nunca la secreta en el frontend)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY ?? "";

// Valor de X-Lumon-Build: lo inyecta vite.config.ts en tiempo de build.
export const BUILD = __BUILD_SHA__;
