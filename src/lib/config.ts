// Toda la configuración viene de variables de entorno VITE_* (nada hardcodeado).
export const API_BASE = import.meta.env.VITE_API_BASE_URL;
export const WS_BASE = import.meta.env.VITE_WS_BASE_URL;

// Valor de X-Lumon-Build: lo inyecta vite.config.ts en tiempo de build.
export const BUILD = __BUILD_SHA__;
