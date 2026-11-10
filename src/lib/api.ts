// Cliente HTTP de la app: un "wrapper" de fetch que hace lo que haría un interceptor de axios.
//  1. Agrega X-Lumon-Build (siempre) y Authorization (si hay sesión).
//  2. Ante 401 TOKEN_EXPIRED: UN solo refresh compartido y reintenta la request UNA vez.
//  3. Ante 503 (o corte de red) en GET: reintenta con espera creciente, respetando Retry-After.
//  4. Convierte los errores del backend en ApiError { status, code, details, retryAfter }.
import { API_BASE, BUILD } from "./config";
import { broadcast, onSessionMessage } from "./sessionChannel";
import { backoffMs, sleep } from "./sleep";
import { clearTokens, getAccessToken, getRefreshToken, saveTokens, setAccessToken } from "./tokens";
import type { TokenPair } from "./types";

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;
  retryAfter: number | null;

  constructor(status: number, code: string, message: string, details: unknown, retryAfter: number | null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: { error?: string; message?: string; details?: unknown } = {};
  try {
    body = await res.json();
  } catch {
    // respuesta sin cuerpo JSON
  }
  const retryAfter = res.headers.get("Retry-After");
  return new ApiError(
    res.status,
    body.error ?? `HTTP_${res.status}`,
    body.message ?? res.statusText,
    body.details ?? null,
    retryAfter ? Number(retryAfter) : null,
  );
}

// ---------- Fin de sesión (revocada, logout, etc.) ----------
const sessionEndListeners = new Set<(reason: string) => void>();

export function onSessionEnd(listener: (reason: string) => void): () => void {
  sessionEndListeners.add(listener);
  return () => sessionEndListeners.delete(listener);
}

export function endSession(reason: string): void {
  clearTokens();
  broadcast({ type: "logout", reason }); // avisa a las otras pestañas
  sessionEndListeners.forEach((listener) => listener(reason));
}

// Mensajes de otras pestañas
onSessionMessage((msg) => {
  if (msg.type === "token") setAccessToken(msg.accessToken);
  if (msg.type === "logout") {
    setAccessToken(null);
    sessionEndListeners.forEach((listener) => listener(msg.reason));
  }
});

// ---------- Refresh coordinado ----------
// - En la misma pestaña: todas las requests que reciben TOKEN_EXPIRED esperan la MISMA promesa.
// - Entre pestañas: Web Locks asegura que solo una pestaña a la vez usa el refresh token
//   (es de un solo uso: usarlo dos veces = REFRESH_REUSED = sesión revocada).
let refreshing: Promise<void> | null = null;

export function refreshSession(): Promise<void> {
  if (!refreshing) {
    const tokenBefore = getAccessToken();
    refreshing = withRefreshLock(async () => {
      // ¿Otra pestaña ya renovó mientras esperábamos el lock? Nos compartió el token nuevo: listo.
      const tokenNow = getAccessToken();
      if (tokenNow && tokenNow !== tokenBefore) return;

      const refreshToken = getRefreshToken(); // se lee DENTRO del lock: siempre el más nuevo
      if (!refreshToken) throw new ApiError(401, "NO_SESSION", "No hay sesión", null, null);

      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "X-Lumon-Build": BUILD, "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        const error = await toApiError(res);
        if (res.status === 401) endSession(error.code); // REFRESH_REUSED, SESSION_REVOKED, REFRESH_INVALID
        throw error;
      }
      const pair = (await res.json()) as TokenPair;
      saveTokens(pair);
      broadcast({ type: "token", accessToken: pair.accessToken });
    }).finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function withRefreshLock(task: () => Promise<void>): Promise<void> {
  if ("locks" in navigator) {
    await navigator.locks.request("lumon-refresh", task);
    return;
  }
  await task();
}

// ---------- request() ----------
export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  auth?: boolean; // false en login/register/health
  retries?: number; // reintentos ante 503 / red (por defecto 3 en GET, 0 en el resto)
  retryNetworkErrors?: boolean; // false: un corte de red no se reintenta aquí (lo decide quien llama)
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal, auth = true } = options;
  const maxRetries = options.retries ?? (method === "GET" ? 3 : 0);
  let refreshed = false;
  let attempt = 0;

  while (true) {
    const headers: Record<string, string> = { "X-Lumon-Build": BUILD, ...options.headers };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const token = getAccessToken();
    if (auth && token) headers.Authorization = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      });
    } catch (networkError) {
      if (signal?.aborted) throw networkError; // se canceló a propósito
      if (attempt < maxRetries && options.retryNetworkErrors !== false) {
        await sleep(backoffMs(attempt++), signal);
        continue;
      }
      throw new ApiError(0, "NETWORK_ERROR", "No se pudo conectar con Lumon", null, null);
    }

    if (res.ok) {
      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    }

    const error = await toApiError(res);

    // Solo TOKEN_EXPIRED justifica un refresh. Se reintenta UNA sola vez.
    if (auth && error.status === 401 && error.code === "TOKEN_EXPIRED" && !refreshed) {
      refreshed = true;
      await refreshSession();
      continue;
    }
    // Token revocado o inválido: no hay nada que reintentar, al login.
    if (auth && error.status === 401 && (error.code === "SESSION_REVOKED" || error.code === "TOKEN_INVALID")) {
      endSession(error.code);
      throw error;
    }
    // 503: el servicio está saturado -> esperar (Retry-After o backoff) y reintentar.
    if (error.status === 503 && attempt < maxRetries) {
      await sleep(backoffMs(attempt++, error.retryAfter), signal);
      continue;
    }
    throw error;
  }
}

// Mensaje legible para mostrar un ApiError (o cualquier error)
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return `${error.message} (${error.code})`;
  if (error instanceof Error) return error.message;
  return "Error desconocido";
}
