import type { TokenPair } from "./types";

// El ACCESS token vive SOLO en memoria (una variable del módulo).
// Si un script malicioso (XSS) corre en la página, no lo encuentra en localStorage.
let accessToken: string | null = null;

// El REFRESH token sí se puede persistir: sirve para restaurar la sesión al recargar.
const REFRESH_KEY = "lumon.refresh";

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function saveTokens(pair: TokenPair): void {
  accessToken = pair.accessToken;
  localStorage.setItem(REFRESH_KEY, pair.refreshToken);
}

export function clearTokens(): void {
  accessToken = null;
  localStorage.removeItem(REFRESH_KEY);
}
