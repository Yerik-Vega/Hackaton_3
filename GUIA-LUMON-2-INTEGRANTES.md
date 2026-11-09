# Guía Lumon MDR — equipo de 2 integrantes

Fuente: README del repo `CS2031-DBP/hackaton-frontend-lumon-20262`. **Manda el Swagger** (`https://lumon-api.vercel.app/docs`).

## 0. Decisiones que difieren de tu brief original (One Piece)

| Brief anterior | Lumon (oficial) | Qué hacemos |
|---|---|---|
| Axios + interceptor | Stack: **Fetch API** | `api.ts` con un wrapper de `fetch` que hace lo mismo que el interceptor |
| Token en `localStorage` | Access token **solo en memoria**. Refresh token sí se puede persistir | Access en variable de módulo; refresh en `localStorage` |
| `423 LOG_POSE_REQUIRED` | `423 CLEARANCE_REQUIRED` | Mensaje claro "aprueba la revisión / abre el Piso de Pruebas" |
| 5 checkpoints | 6 (CP6 = producción) | Ver sección 1 |
| — | Cabecera `X-Lumon-Build` en **todas** las requests | Se inyecta en build con Vite `define` |

> ⚠️ `VERIFICAR` = nombre de campo/parámetro que el README no define. Abrir Swagger y confirmar antes de usar. No inventar.

---

## 1. Reparto y tiempos

| | **Integrante A** | **Integrante B** |
|---|---|---|
| Foco | Infra + CP1 + CP6 + CP3 | CP2 (el más pesado, 5 pts) |
| Archivos suyos | `api.ts`, `tokens.ts`, `auth/*`, `routes/*`, `pages/Login|Register|Estado|NotFound`, `vite.config.ts`, `vercel.json` | `files.service.ts`, `pages/FilesPage`, `pages/RefinePage`, `grid/*` |
| Después | CP5 (SSE, cross-tab, modal contingencia) | CP4 (refiners, imágenes) y WebSocket del piso |

Línea de tiempo (2 h; rondas de control a 0:40, 1:05, 1:30, 1:50):

1. **0:00–0:20** — A: crear repo, scaffold, deploy "hola mundo", verificar dominio, registrar cuadrilla (`POST /auth/register` desde Swagger), `PUT /team/roster`. B: clonar y leer Swagger de `/files` y `/tiles`.
2. **0:20–0:40** — A: CP1 completo. B: listado `/files`. **Los dos estudian su código: la ronda 0:40 puede sortear a cualquiera.**
3. **0:40–1:30** — B: grilla. A: `/estado` + botón de revisión automática (`POST /clearance/check`, solo desde la app desplegada).
4. **1:30–1:50** — CP4/CP5 lo que alcance, CP6 (CSP, Lighthouse, bundle).
5. **1:50–2:00** — `npm run build`, `npm run typecheck`, push final a `main`, verificar deploy.

> El README habla de **tres** integrantes inscritos en `PUT /team/roster`. Con 2 personas, pregunten al TA cómo inscribirse (no lo inventen).

---

## 2. Comandos de arranque (ambos)

### 2.1 Node 24 LTS (obligatorio)

```bash
# con nvm (Linux/Mac)
nvm install 24
nvm use 24
node -v    # debe decir v24.x
npm -v

# Windows: instalar nvm-windows o Node 24 LTS desde nodejs.org
```

### 2.2 Integrante A — crea el repositorio

```bash
git clone https://github.com/CS2031-DBP/hackaton-frontend-lumon-20262.git
cd hackaton-frontend-lumon-20262

# Crear repo PÚBLICO vacío en tu GitHub personal (sin README), luego:
git remote set-url origin https://github.com/<tu-usuario>/<tu-repo>.git
git push -u origin main

# GitHub → Settings → Collaborators → agregar a B
```

No borrar `README.md`, `hackathon.json`, `.gitignore`, `assets/`.

### 2.3 Integrante A — scaffold Vite (en la raíz del repo, sin borrar archivos)

```bash
# Vite pregunta qué hacer con archivos existentes → elegir "Ignore files and continue"
npm create vite@latest . -- --template react-ts

npm install
npm install react-router-dom
npm install tailwindcss @tailwindcss/vite
npm install -D @types/node

# Verificar que .env esté ignorado
grep -qxF ".env" .gitignore || echo ".env" >> .gitignore

# Scripts: asegurar "typecheck" en package.json
npm pkg set scripts.typecheck="tsc -b --noEmit"

git add -A
git commit -m "chore: scaffold vite react-ts + tailwind + router"
git push
```

**Qué hace / por qué:** crea el proyecto con la plantilla `react-ts` que exige el enunciado en la raíz del repo. `@tailwindcss/vite` es el plugin de Tailwind 4 (sin `postcss.config`). `@types/node` permite usar `node:child_process` en `vite.config.ts`. `typecheck` es un requisito de evaluación (`npm run build` también debe pasar o la nota es 0).

### 2.4 Integrante B — clona y trabaja en su rama

```bash
git clone https://github.com/<usuario-A>/<repo>.git
cd <repo>
npm install
git checkout -b feat/b-files
```

### 2.5 Variables de entorno (ambos)

```bash
# .env.example  (SE SUBE al repo, sin valores secretos)
cat > .env.example <<'EOF'
VITE_API_BASE_URL=https://lumon-api.vercel.app/api/v1
VITE_WS_BASE_URL=wss://lumon-api.vercel.app/api/v1
EOF

cp .env.example .env     # .env NO se sube
```

**Por qué:** la app lee **toda** la configuración de `VITE_*`; ninguna URL va escrita en el código. Vite incrusta estas variables **en tiempo de build**, así que en Vercel hay que definirlas en Project Settings → Environment Variables *antes* de desplegar.

---

## 3. Flujo Git para 2 personas

```bash
# Antes de empezar cada bloque
git checkout main && git pull --rebase origin main
git checkout feat/b-files            # (A usa feat/a-auth)
git rebase main

# Commits chicos y frecuentes
git add src/ruta/archivo.ts
git commit -m "feat(files): listado paginado con URL state"

# Integrar a main (cada 20–30 min)
git checkout main
git pull --rebase origin main
git merge --no-ff feat/b-files
git push origin main                 # dispara el deploy

# Si hay conflicto
git status
# editar archivos, luego:
git add <archivo> && git merge --continue
```

Reglas para no pisarse:
- Nadie edita archivos del otro sin avisar. `App.tsx` (rutas) lo toca **A**; B le pide a A la ruta, o la agrega en un commit mínimo y avisa.
- `package.json`/`package-lock.json`: si B instala algo, commit **solo** eso, push inmediato y A hace `git pull --rebase`.
- **Lo que se evalúa es el último commit de `main` desplegado.** Nunca dejar `main` roto en los últimos minutos.

---

## 4. Estructura de carpetas

```
src/
  main.tsx
  App.tsx                      # rutas (A)
  index.css                    # @import "tailwindcss" + CSS grilla
  vite-env.d.ts
  lib/
    api.ts                     # fetch wrapper (A)
    tokens.ts                  # access en memoria, refresh en localStorage (A)
    sessionChannel.ts          # BroadcastChannel logout multi-pestaña (A)
    sleep.ts
  types/
    api.ts                     # tipos de respuestas
  auth/
    auth.service.ts
    AuthContext.tsx
    guards.tsx                 # PrivateRoute, RequirePermission
  components/
    ConnectionGate.tsx
    Spinner.tsx
  pages/
    LoginPage.tsx  RegisterPage.tsx  NoPermissionPage.tsx
    NotFoundPage.tsx  EstadoPage.tsx
    FilesPage.tsx  RefinePage.tsx          # (B)
  files/
    files.service.ts                       # (B)
    useFilesList.ts
  grid/
    TileStore.ts  group.ts  VirtualGrid.tsx  # (B)
public/.well-known/lumon-verification.txt
vercel.json
```

---

## 5. Configuración base (A)

### 5.1 `vite.config.ts`

```ts
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
```

**Qué hace / por qué:** `define` reemplaza `__APP_BUILD__` por un literal **al compilar**, no se escribe a mano (lo exige el enunciado). El backend compara ese SHA con el commit desplegado (CP6). Sin la cabecera, desde un origen que no es `localhost`, responde `400 BUILD_HEADER_REQUIRED`.

### 5.2 `src/vite-env.d.ts`

```ts
/// <reference types="vite/client" />

declare const __APP_BUILD__: string;

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WS_BASE_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

**Por qué:** le dice a TypeScript estricto que `__APP_BUILD__` y las `VITE_*` existen y son `string`, sin recurrir a `any`.

### 5.3 `src/index.css`

```css
@import "tailwindcss";

/* Celdas que dan miedo: tiemblan según --amp (derivado de tremor) */
@keyframes tremble {
  0%   { transform: translate(0, 0); }
  25%  { transform: translate(var(--amp), calc(var(--amp) * -1)); }
  50%  { transform: translate(calc(var(--amp) * -1), var(--amp)); }
  75%  { transform: translate(var(--amp), var(--amp)); }
  100% { transform: translate(0, 0); }
}
.cell-scary { animation: tremble var(--dur) linear infinite; background: #fde68a; }

/* Sin movimiento: se distinguen por borde punteado */
@media (prefers-reduced-motion: reduce) {
  .cell-scary { animation: none; outline: 2px dashed #b45309; outline-offset: -2px; }
}
```

**Por qué:** `prefers-reduced-motion` es regla de evaluación ("una animación que lo ignora no cuenta"). Con movimiento reducido, las celdas siguen distinguibles sin animar.

### 5.4 `vercel.json` (SPA + cabeceras de seguridad)

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' https://lumon-api.vercel.app wss://lumon-api.vercel.app https://<TU-PROYECTO>.supabase.co; base-uri 'self'; frame-ancestors 'none'"
        },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/.well-known/lumon-verification.txt",
      "headers": [{ "key": "Content-Type", "value": "text/plain; charset=utf-8" }]
    }
  ]
}
```

**Qué hace / por qué:** el `rewrite` hace que abrir `/files/42/refine?r=100&c=40` directo no dé 404 (Vercel sirve primero los archivos estáticos, así que `.well-known/...` sigue funcionando). La CSP no usa `unsafe-eval`, restringe `script-src` y `connect-src` lista hosts concretos (sin `*`), incluyendo `wss://` para el WebSocket. Cambia `<TU-PROYECTO>` por tu host de storage (o quítalo si usas Cloudinary: `https://api.cloudinary.com`).

---

## 6. CP1 — Orientación (A)

### 6.1 `src/types/api.ts`

```ts
export interface ApiErrorBody {
  error: string;          // código: TOKEN_EXPIRED, REFRESH_REUSED, CLEARANCE_REQUIRED...
  message: string;        // solo texto para humanos
  details: unknown;
  timestamp: string;
  path: string;
  requestId?: string;
}

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;      // segundos
  user: AuthUser;
}

export interface MeResponse {
  team: { code: string; name: string };
  role: { code: string; name: string };
  permissions: string[];
  clearance: { granted: boolean; grantedAt: string | null };
  // "entre otras cosas": VERIFICAR en Swagger si hay más campos
}
```

**Por qué:** el README dice "usen `error` para decidir qué hacer; `message` es solo texto". Tipamos todo para cumplir "sin `any` en respuestas de API".

### 6.2 `src/lib/tokens.ts`

```ts
const REFRESH_KEY = 'lumon.refreshToken';

// Access token: SOLO en memoria. Se pierde al recargar (por diseño).
let accessToken: string | null = null;

export const getAccessToken = (): string | null => accessToken;
export const setAccessToken = (t: string | null): void => { accessToken = t; };

// Refresh token: sí se puede persistir (un solo uso).
export const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_KEY);
export function setRefreshToken(t: string | null): void {
  if (t) localStorage.setItem(REFRESH_KEY, t);
  else localStorage.removeItem(REFRESH_KEY);
}

export function clearSession(): void {
  setAccessToken(null);
  setRefreshToken(null);
}
```

**Qué hace / por qué:** el access token en una variable de módulo no es accesible por scripts inyectados persistentes ni queda en disco (menos superficie ante XSS). Si recargas, se pierde, y se recupera con el refresh token. Este es el cambio respecto al "token en localStorage" de tu brief: aquí el enunciado lo prohíbe.

### 6.3 `src/lib/sleep.ts`

```ts
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}
```

**Por qué:** espera cancelable; la usan los reintentos con backoff y el `Retry-After`.

### 6.4 `src/lib/sessionChannel.ts` — logout en todas las pestañas

```ts
const channel = new BroadcastChannel('lumon-session');

export function broadcastLogout(): void {
  channel.postMessage({ type: 'logout' });
}

export function onRemoteLogout(cb: () => void): () => void {
  const handler = (e: MessageEvent<{ type: string }>) => {
    if (e.data.type === 'logout') cb();
  };
  channel.addEventListener('message', handler);
  return () => channel.removeEventListener('message', handler);
}
```

**Qué hace / por qué:** `BroadcastChannel` avisa a las demás pestañas del mismo origen de inmediato (<2 s exigido). Cada pestaña tiene su access token en memoria, por eso hace falta avisarles: borrar `localStorage` no limpia la memoria de las otras.

### 6.5 `src/lib/api.ts` — equivalente al "interceptor" con fetch

```ts
import type { ApiErrorBody, LoginResponse } from '../types/api';
import {
  clearSession, getAccessToken, getRefreshToken, setAccessToken, setRefreshToken,
} from './tokens';

const BASE = import.meta.env.VITE_API_BASE_URL;
const BUILD = __APP_BUILD__;

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;
  retryAfter: number | null;   // segundos, de la cabecera Retry-After
  constructor(status: number, code: string, message: string, details: unknown, retryAfter: number | null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  skipAuth?: boolean;   // login/register/refresh/health no llevan Bearer
}

function rawFetch(path: string, o: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { 'X-Lumon-Build': BUILD, ...o.headers };
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token && !o.skipAuth) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${BASE}${path}`, {
    method: o.method ?? 'GET',
    headers,
    body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
    signal: o.signal,
  });
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: Partial<ApiErrorBody> = {};
  try { body = (await res.json()) as Partial<ApiErrorBody>; } catch { /* cuerpo no JSON */ }
  const ra = res.headers.get('Retry-After');
  return new ApiError(
    res.status,
    body.error ?? 'UNKNOWN',
    body.message ?? res.statusText,
    body.details ?? null,
    ra ? Number(ra) : null,
  );
}

// ---- Refresh coordinado ----
// 1) Una sola promesa compartida: N requests con TOKEN_EXPIRED → UN solo POST /auth/refresh.
// 2) Web Locks: entre pestañas, solo una refresca a la vez y lee el refresh token
//    MÁS RECIENTE de localStorage dentro del lock (el refresh es de un solo uso).
let refreshing: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  refreshing ??= doRefresh().finally(() => { refreshing = null; });
  return refreshing;
}

function doRefresh(): Promise<string> {
  return navigator.locks.request('lumon-refresh', async () => {
    const rt = getRefreshToken();
    if (!rt) throw new ApiError(401, 'NO_REFRESH_TOKEN', 'No hay sesión', null, null);

    // VERIFICAR en Swagger el nombre del campo del body (¿refreshToken?)
    const res = await rawFetch('/auth/refresh', { method: 'POST', body: { refreshToken: rt }, skipAuth: true }, null);
    if (!res.ok) {
      const err = await toApiError(res);
      clearSession();
      sessionEvents.dispatchEvent(new CustomEvent('lost', { detail: err.code }));
      throw err;
    }
    const data = (await res.json()) as LoginResponse;
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);   // rotación: el anterior ya no sirve
    return data.accessToken;
  });
}

// Avisa a la UI que la sesión se perdió (REFRESH_REUSED, SESSION_REVOKED...)
export const sessionEvents = new EventTarget();

export async function request<T>(path: string, o: RequestOptions = {}): Promise<T> {
  let res = await rawFetch(path, o, getAccessToken());

  if (!res.ok) {
    const err = await toApiError(res);
    // Solo TOKEN_EXPIRED justifica un refresh. Reintento UNA sola vez.
    if (err.code === 'TOKEN_EXPIRED' && !o.skipAuth) {
      const token = await refreshAccessToken();
      res = await rawFetch(path, o, token);
      if (!res.ok) throw await toApiError(res);
    } else {
      if (err.code === 'SESSION_REVOKED' || err.code === 'REFRESH_REUSED') {
        clearSession();
        sessionEvents.dispatchEvent(new CustomEvent('lost', { detail: err.code }));
      }
      throw err;
    }
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
```

**Qué hace / por qué:**
- `rawFetch` agrega `X-Lumon-Build` a **todas** las requests y el `Bearer` si hay token: es lo que hacía el interceptor de Axios, pero en un solo lugar.
- Ante `TOKEN_EXPIRED` se llama a `refreshAccessToken()`; la promesa compartida (`refreshing`) garantiza **un solo** `/auth/refresh` aunque fallen 10 requests a la vez, y cada una se reintenta **una vez**.
- El refresh token es **de un solo uso**: reusarlo = robo → `REFRESH_REUSED` y se revoca todo. `navigator.locks` evita que dos pestañas lo usen a la vez, y leer `localStorage` *dentro* del lock asegura usar el último rotado.
- Los tipos genéricos (`request<T>`) fijan la forma de cada respuesta en el servicio; no hay `any`.

### 6.6 `src/auth/auth.service.ts`

```ts
import { request } from '../lib/api';
import { setAccessToken, setRefreshToken, getRefreshToken, clearSession } from '../lib/tokens';
import { broadcastLogout } from '../lib/sessionChannel';
import type { LoginResponse, MeResponse } from '../types/api';

// VERIFICAR en Swagger los campos exactos de login y register
export interface LoginBody { email: string; password: string }
export interface RegisterBody { teamName: string; email: string; password: string }

function storeSession(r: LoginResponse): void {
  setAccessToken(r.accessToken);
  setRefreshToken(r.refreshToken);
}

export async function login(body: LoginBody): Promise<void> {
  const r = await request<LoginResponse>('/auth/login', { method: 'POST', body, skipAuth: true });
  storeSession(r);
}

export async function register(body: RegisterBody): Promise<void> {
  const r = await request<LoginResponse>('/auth/register', { method: 'POST', body, skipAuth: true });
  storeSession(r);   // el registro entra directo con sesión iniciada
}

export const getMe = (): Promise<MeResponse> => request<MeResponse>('/auth/me');

export async function logout(): Promise<void> {
  try {
    // El logout REVOCA la sesión en el servidor. VERIFICAR body (¿refreshToken?)
    await request<void>('/auth/logout', { method: 'POST', body: { refreshToken: getRefreshToken() }, skipAuth: true });
  } catch {
    /* aunque falle la red, igual cerramos localmente */
  } finally {
    clearSession();
    broadcastLogout();   // las demás pestañas cierran sesión
  }
}
```

**Qué hace / por qué:** un servicio por módulo, sin JSX, solo lógica de red. El logout intenta revocar en servidor, y **siempre** limpia local y avisa a las otras pestañas. Los errores del servidor (email duplicado, datos inválidos) llegan como `ApiError` para que el formulario los pinte junto a su campo (`err.details`, VERIFICAR su forma).

### 6.7 `src/auth/AuthContext.tsx`

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { refreshAccessToken, sessionEvents } from '../lib/api';
import { getRefreshToken } from '../lib/tokens';
import { onRemoteLogout } from '../lib/sessionChannel';
import * as authService from './auth.service';
import type { MeResponse } from '../types/api';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthValue {
  status: Status;
  me: MeResponse | null;
  lostReason: string | null;
  can: (permission: string) => boolean;
  login: (b: authService.LoginBody) => Promise<void>;
  register: (b: authService.RegisterBody) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<MeResponse | null>(null);
  const [lostReason, setLostReason] = useState<string | null>(null);

  // Restaurar sesión al cargar (F5 o reabrir navegador)
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!getRefreshToken()) { setStatus('anonymous'); return; }
      try {
        await refreshAccessToken();        // el access token no sobrevive al F5
        const m = await authService.getMe();
        if (!cancelled) { setMe(m); setStatus('authenticated'); }
      } catch {
        if (!cancelled) setStatus('anonymous');   // token vencido → login
      }
    }
    void restore();
    return () => { cancelled = true; };
  }, []);

  // Sesión revocada / logout desde otra pestaña
  useEffect(() => {
    const onLost = (e: Event) => {
      setLostReason((e as CustomEvent<string>).detail);
      setMe(null);
      setStatus('anonymous');
    };
    sessionEvents.addEventListener('lost', onLost);
    const offRemote = onRemoteLogout(() => {
      setLostReason('LOGOUT_OTRA_PESTAÑA');
      setMe(null);
      setStatus('anonymous');
    });
    return () => { sessionEvents.removeEventListener('lost', onLost); offRemote(); };
  }, []);

  const afterAuth = useCallback(async () => {
    setLostReason(null);
    setMe(await authService.getMe());
    setStatus('authenticated');
  }, []);

  const value = useMemo<AuthValue>(() => ({
    status, me, lostReason,
    can: (p) => me?.permissions.includes(p) ?? false,
    login: async (b) => { await authService.login(b); await afterAuth(); },
    register: async (b) => { await authService.register(b); await afterAuth(); },
    logout: async () => { await authService.logout(); setMe(null); setStatus('anonymous'); },
  }), [status, me, lostReason, afterAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
```

**Qué hace / por qué:**
- `status: 'loading'` evita mostrar el login mientras se verifica la sesión (requisito explícito).
- El `useEffect` de restauración usa el refresh token (el access token en memoria no sobrevive al F5) y luego `/auth/me`. Si falla → `anonymous` → login.
- `cancelled` evita setear estado si el componente se desmontó (StrictMode ejecuta efectos dos veces en desarrollo).
- `can()` decide la UI por `permissions`, no por rol (los roles cambian entre workspaces; los permisos no).

### 6.8 `src/auth/guards.tsx`

```tsx
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Spinner } from '../components/Spinner';
import { NoPermissionPage } from '../pages/NoPermissionPage';

export function PrivateRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Spinner label="Verificando sesión…" />;
  if (status === 'anonymous') {
    // Guardamos ruta + query para volver EXACTAMENTE ahí tras el login
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

export function RequirePermission({ permission, children }: { permission: string; children: ReactNode }) {
  const { can } = useAuth();
  return can(permission) ? <>{children}</> : <NoPermissionPage />;
}
```

`src/components/Spinner.tsx`:

```tsx
export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return <div role="status" className="p-8 text-center text-slate-600">{label}</div>;
}
```

`src/pages/NoPermissionPage.tsx`:

```tsx
export function NoPermissionPage() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-bold">Sin permiso</h1>
      <p>Tu rol no tiene acceso a esta sección.</p>
    </main>
  );
}
```

**Qué hace / por qué:** `PrivateRoute` bloquea rutas sin sesión y recuerda a dónde iba el usuario (`state.from` incluye la query string). `RequirePermission` muestra una página "sin permiso" y no una pantalla en blanco al abrir la URL a mano. Los códigos de permiso que lista el README: `files:read`, `files:refine`, `refiners:read`, `refiners:write`, `media:upload`, `incidents:read`, `incidents:create`, `team:manage`. VERIFICAR cuál protege cada ruta.

### 6.9 `src/pages/LoginPage.tsx`

```tsx
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';

export function LoginPage() {
  const { status, login, lostReason } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/files';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'authenticated') return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;                 // evita doble envío
    setBusy(true);
    setError(null);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-bold">Lumon · Ingresar</h1>
      {lostReason && (
        <p role="alert" className="mb-3 rounded bg-amber-100 p-2 text-sm">
          Tu sesión se cerró ({lostReason}). Ingresa de nuevo.
        </p>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col text-sm">Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                 className="rounded border p-2" />
        </label>
        <label className="flex flex-col text-sm">Contraseña
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                 className="rounded border p-2" />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="rounded bg-slate-900 p-2 text-white disabled:opacity-50">
          {busy ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
      <p className="mt-4 text-sm">¿Sin cuadrilla? <Link className="underline" to="/register">Registrar</Link></p>
    </main>
  );
}
```

**Qué hace / por qué:** `from` viene del `state` que puso `PrivateRoute`, por eso tras el login vuelve a la ruta original con su query. `busy` desactiva el botón: "una acción sin loading/error no cuenta". `RegisterPage` es igual pero llama `register({teamName,email,password})` y pinta cada error (`err.details`) junto a su campo; copia esta estructura y ajusta los campos tras leer Swagger.

### 6.10 `src/components/ConnectionGate.tsx` — "Conectando con Lumon…"

```tsx
import { useEffect, useState, type ReactNode } from 'react';
import { request } from '../lib/api';

export function ConnectionGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(false);
  const [attempt, setAttempt] = useState(0);   // sube al pulsar "Reintentar"

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function check(n: number) {
      try {
        await request<unknown>('/meta/health', { skipAuth: true });
        if (!cancelled) setOk(true);
      } catch {
        if (cancelled) return;
        // backoff creciente: 1s, 2s, 4s, 8s... tope 15s
        timer = window.setTimeout(() => void check(n + 1), Math.min(1000 * 2 ** n, 15000));
      }
    }
    void check(0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [attempt]);

  if (ok) return <>{children}</>;
  return (
    <main role="status" className="p-8 text-center">
      <p className="mb-3">Conectando con Lumon…</p>
      <button className="rounded border px-3 py-1" onClick={() => setAttempt((a) => a + 1)}>
        Reintentar ahora
      </button>
    </main>
  );
}
```

**Qué hace / por qué:** si `/meta/health` falla, reintenta solo con espera creciente (backoff exponencial: no satura una API caída) y permite forzar reintento a mano. El `cleanup` cancela timers al desmontar o reintentar. Nota: la API "duerme" y la primera request puede tardar unos segundos.

### 6.11 `src/App.tsx` y `src/main.tsx`

```tsx
// src/App.tsx
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { PrivateRoute, RequirePermission } from './auth/guards';
import { ConnectionGate } from './components/ConnectionGate';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { FilesPage } from './pages/FilesPage';
import { RefinePage } from './pages/RefinePage';
import { EstadoPage } from './pages/EstadoPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <ConnectionGate>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<PrivateRoute />}>
              <Route path="/files" element={<RequirePermission permission="files:read"><FilesPage /></RequirePermission>} />
              <Route path="/files/:id/refine" element={<RequirePermission permission="files:refine"><RefinePage /></RequirePermission>} />
              <Route path="/estado" element={<EstadoPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ConnectionGate>
  );
}
```

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
```

`src/pages/NotFoundPage.tsx`:

```tsx
import { Link } from 'react-router-dom';
export function NotFoundPage() {
  return (
    <main className="p-10 text-center">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="my-3">Este archivo fue refinado fuera de existencia.</p>
      <Link className="underline" to="/files">Volver al piso</Link>
    </main>
  );
}
```

**Por qué:** `Routes` anida `PrivateRoute` como layout (`<Outlet/>`), así un solo guard protege todas las rutas hijas. `path="*"` captura cualquier URL desconocida (404). El guard por permisos va por ruta.

### 6.12 `src/pages/EstadoPage.tsx` (CP3 automático + CP6)

```tsx
import { useEffect, useState } from 'react';
import { request, ApiError } from '../lib/api';

type Json = Record<string, unknown>;

export function EstadoPage() {
  const [health, setHealth] = useState<'ok' | 'error' | 'cargando'>('cargando');
  const [integrations, setIntegrations] = useState<Json | null>(null);
  const [clearance, setClearance] = useState<Json | null>(null);
  const [checkResult, setCheckResult] = useState<Json | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    request<Json>('/meta/health', { skipAuth: true, signal: ac.signal })
      .then(() => setHealth('ok')).catch(() => setHealth('error'));
    request<Json>('/integrations/status', { signal: ac.signal }).then(setIntegrations).catch(() => undefined);
    request<Json>('/clearance', { signal: ac.signal }).then(setClearance).catch(() => undefined);
    return () => ac.abort();
  }, []);

  async function runCheck() {
    setBusy(true); setError(null);
    try {
      setCheckResult(await request<Json>('/clearance/check', { method: 'POST' }));
      setClearance(await request<Json>('/clearance'));
    } catch (e) {
      setError(e instanceof ApiError ? `${e.code}: ${e.message}` : 'Error de red');
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Estado</h1>
      <p>Build desplegado: <code>{__APP_BUILD__}</code> · API: <strong>{health}</strong></p>
      <button disabled={busy} onClick={() => void runCheck()}
              className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50">
        {busy ? 'Revisando…' : 'Abrir el Piso de Pruebas'}
      </button>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {/* Refinar: mostrar cada comprobación con passed y motivo (ver forma en Swagger) */}
      <pre className="overflow-auto rounded bg-slate-100 p-3 text-xs">{JSON.stringify({ integrations, clearance, checkResult }, null, 2)}</pre>
    </main>
  );
}
```

**Qué hace / por qué:** `POST /clearance/check` **solo funciona desde la app desplegada** (desde Swagger o localhost da `403 CHECK_FROM_APP_REQUIRED`). Revisa los últimos 15 min de uso real: dominio verificado + SHA, ≥1 refresh exitoso, ≥30 bloques pedidos sin duplicados, y con caos 1 o 2 ≥3 grupos refinados + 1 reintento con la misma `Idempotency-Key`. Los `Json` son `Record<string, unknown>` mientras no se lea el esquema real; luego se reemplazan por interfaces concretas y se pintan las comprobaciones en lista.

---

## 7. CP2 — Macrodata Refinement (B)

### 7.1 `src/files/files.service.ts` — listado

```ts
import { request } from '../lib/api';

// VERIFICAR TODO en Swagger: nombres de parámetros y forma de la respuesta
export interface FilesQuery {
  page: number;        // ¿0-based? VERIFICAR
  size: number;
  status: string;      // filtro por estado (valores del enum en Swagger)
  q: string;           // búsqueda
  sort: string;
}

export interface FileSummary {
  id: number;
  name: string;
  status: string;
  // + campos de progreso: VERIFICAR
}

export interface FilesPage {
  content: FileSummary[];       // VERIFICAR (podría ser items/total...)
  totalElements: number;
  totalPages: number;
}

export function listFiles(q: FilesQuery, signal: AbortSignal): Promise<FilesPage> {
  const p = new URLSearchParams();
  p.set('page', String(q.page));
  p.set('size', String(q.size));
  p.set('sort', q.sort);
  if (q.status) p.set('status', q.status);   // omitir si está vacío
  if (q.q) p.set('q', q.q);
  return request<FilesPage>(`/files?${p.toString()}`, { signal });
}
```

**Por qué:** la paginación, el filtro y la búsqueda las hace el **servidor**; el front solo manda parámetros. Nunca se carga todo y se pagina en el cliente (invalida el checkpoint).

### 7.2 `src/files/useFilesList.ts` — estado en URL + carrera de respuestas

```ts
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listFiles, type FilesPage, type FilesQuery } from './files.service';
import { ApiError } from '../lib/api';

const SIZES = [10, 20, 50];          // VERIFICAR tamaños permitidos
const DEFAULTS: FilesQuery = { page: 0, size: 20, status: '', q: '', sort: '' };

// Lee y SANEA la URL: una URL inválida nunca rompe la vista.
function parse(sp: URLSearchParams): FilesQuery {
  const page = Number(sp.get('page'));
  const size = Number(sp.get('size'));
  return {
    page: Number.isInteger(page) && page >= 0 ? page : DEFAULTS.page,
    size: SIZES.includes(size) ? size : DEFAULTS.size,
    status: sp.get('status') ?? '',
    q: (sp.get('q') ?? '').slice(0, 80),
    sort: sp.get('sort') ?? '',
  };
}

export function useFilesList() {
  const [sp, setSp] = useSearchParams();
  const query = useMemo(() => parse(sp), [sp]);
  const [data, setData] = useState<FilesPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();     // cancela la request anterior
    setLoading(true);
    setError(null);
    listFiles(query, ac.signal)
      .then((d) => { setData(d); setLoading(false); })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;  // obsoleta: se ignora
        setError(e instanceof ApiError ? e.message : 'Error de red');
        setLoading(false);
      });
    return () => ac.abort();              // cleanup: al cambiar la query, aborta la vieja
  }, [query]);

  // Cambios de filtro vuelven a la página 0. Se escribe en la URL.
  function update(patch: Partial<FilesQuery>, resetPage = true) {
    const next = { ...query, ...patch, page: resetPage ? 0 : (patch.page ?? query.page) };
    const out = new URLSearchParams();
    (Object.entries(next) as [string, string | number][]).forEach(([k, v]) => {
      if (v !== '' && v !== undefined) out.set(k, String(v));
    });
    setSp(out);   // push → atrás/adelante del navegador funcionan
  }

  return { query, data, loading, error, update };
}
```

**Qué hace / por qué:**
- La **URL es la fuente de verdad** (`useSearchParams`): recargar, compartir o usar atrás/adelante reproduce el mismo estado.
- `AbortController` + cleanup del `useEffect`: al cambiar filtros/página rápido, la request anterior se aborta; así **una respuesta vieja nunca pisa a una nueva** (race condition).
- `parse` sanea valores inválidos de la URL con valores por defecto.
- Cambiar un filtro reinicia `page` a 0: en la página 5 de un filtro, otro filtro puede tener solo 2 páginas.

### 7.3 `src/pages/FilesPage.tsx`

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFilesList } from '../files/useFilesList';

export function FilesPage() {
  const { query, data, loading, error, update } = useFilesList();

  // Búsqueda SIN una request por tecla: input local + debounce de 400 ms
  const [text, setText] = useState(query.q);
  useEffect(() => {
    const id = setTimeout(() => { if (text !== query.q) update({ q: text }); }, 400);
    return () => clearTimeout(id);
  }, [text]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setText(query.q); }, [query.q]);   // sincroniza con atrás/adelante

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Archivos de datos</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={80}
               placeholder="Buscar…" aria-label="Buscar" className="rounded border p-2" />
        <select value={query.status} onChange={(e) => update({ status: e.target.value })}
                aria-label="Estado" className="rounded border p-2">
          <option value="">Todos</option>
          {/* VERIFICAR valores del enum de estado en Swagger */}
        </select>
        <select value={query.size} onChange={(e) => update({ size: Number(e.target.value) })}
                aria-label="Tamaño de página" className="rounded border p-2">
          {[10, 20, 50].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* min-h fijo: loading/error/vacío NO mueven el layout */}
      <section className="min-h-[480px]" aria-busy={loading}>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {!error && !loading && data?.content.length === 0 && <p>Sin resultados.</p>}
        {data && (
          <ul className={`divide-y ${loading ? 'opacity-50' : ''}`}>
            {data.content.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2">
                <span>{f.name}</span>
                <Link className="underline" to={`/files/${f.id}/refine`}>Refinar</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <nav className="mt-4 flex items-center gap-3">
        <button disabled={query.page === 0} onClick={() => update({ page: query.page - 1 }, false)}
                className="rounded border px-3 py-1 disabled:opacity-40">Anterior</button>
        <span>Página {query.page + 1} de {data?.totalPages ?? '…'}</span>
        <button disabled={!data || query.page + 1 >= data.totalPages}
                onClick={() => update({ page: query.page + 1 }, false)}
                className="rounded border px-3 py-1 disabled:opacity-40">Siguiente</button>
      </nav>
    </main>
  );
}
```

**Qué hace / por qué:** el `<input>` solo manda texto al backend (la búsqueda la implementa el servidor); el `debounce` espera 400 ms de pausa antes de actualizar la URL, para no disparar una request por tecla. Los `<select>` son los filtros. El contenedor de altura mínima fija evita saltos de layout durante loading/error/sin resultados. Mientras carga se atenúa la lista anterior en vez de vaciarla.

### 7.4 Tipos de la grilla — `src/grid/TileStore.ts`

```ts
import { ApiError, request } from '../lib/api';
import { sleep } from '../lib/sleep';

// VERIFICAR nombres exactos en Swagger (GET /files/{id} y /rules)
export interface FileDetail {
  id: number;
  rows: number;
  cols: number;
  tileSize: number;
  // progreso por caja: VERIFICAR
}

export interface FileRules {
  tremorThreshold: number;
  connectivity: 4 | 8;
  minGroupSize: number;
  maxGroupSize: number;
  binning: { strategy: 'DIGIT_SUM_MOD' | 'MAX_DIGIT_MOD'; order: string[] };
}

interface TileDto {
  tileRow: number; tileCol: number;
  originRow: number; originCol: number;
  rows: number; cols: number;
  values: string;   // un carácter '0'-'9' por celda, por filas
  tremor: string;   // base64, un byte (0-100) por celda
  bins: string;     // '.' | 'W' | 'F' | 'D' | 'M' por celda
  version: number;
}

export interface Tile { dto: TileDto; tremor: Uint8Array }

export interface Cell { digit: number; tremor: number; bin: string }

function decodeTremor(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const tileKey = (tr: number, tc: number): string => `${tr}:${tc}`;

export class TileStore {
  private fileId: number;
  private tileSize: number;
  private tiles = new Map<string, Tile>();
  private inflight = new Map<string, Promise<Tile>>();
  private controllers = new Map<string, AbortController>();
  private pinned = new Set<string>();           // bloques que necesita una búsqueda de grupo
  private overlay = new Map<string, string>();  // "r,c" → 'W'|'F'|'D'|'M' tras refinar
  private blockedUntil = 0;                     // pausa global por 429
  private listeners = new Set<() => void>();

  constructor(fileId: number, tileSize: number) {
    this.fileId = fileId;
    this.tileSize = tileSize;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private notify(): void { this.listeners.forEach((fn) => fn()); }

  has(tr: number, tc: number): boolean { return this.tiles.has(tileKey(tr, tc)); }

  // Un solo request por bloque: si ya hay uno en vuelo, se reutiliza la misma promesa.
  load(tr: number, tc: number, pin = false): Promise<Tile> {
    const key = tileKey(tr, tc);
    const cached = this.tiles.get(key);
    if (cached) return Promise.resolve(cached);
    if (pin) this.pinned.add(key);
    const running = this.inflight.get(key);
    if (running) return running;

    const ac = new AbortController();
    this.controllers.set(key, ac);
    const p = this.fetchTile(tr, tc, ac.signal)
      .then((tile) => { this.tiles.set(key, tile); this.notify(); return tile; })
      .finally(() => {
        this.inflight.delete(key);
        this.controllers.delete(key);
        this.pinned.delete(key);
      });
    this.inflight.set(key, p);
    return p;
  }

  // Cancela las requests de bloques que salieron de la vista (salvo los fijados)
  cancelOutside(visible: Set<string>): void {
    for (const [key, ac] of this.controllers) {
      if (!visible.has(key) && !this.pinned.has(key)) ac.abort();
    }
  }

  private async fetchTile(tr: number, tc: number, signal: AbortSignal): Promise<Tile> {
    for (let attempt = 0; ; attempt++) {
      const wait = this.blockedUntil - Date.now();
      if (wait > 0) await sleep(wait, signal);          // respeta Retry-After
      try {
        const dto = await request<TileDto>(`/files/${this.fileId}/tiles/${tr}/${tc}`, { signal });
        return { dto, tremor: decodeTremor(dto.tremor) };
      } catch (e) {
        if (e instanceof ApiError && e.status === 429) {
          this.blockedUntil = Date.now() + (e.retryAfter ?? 1) * 1000;   // nadie pide hasta entonces
          continue;
        }
        if (e instanceof ApiError && e.status === 503 && attempt < 5) {
          await sleep(500 * 2 ** attempt, signal);        // backoff creciente
          continue;
        }
        throw e;
      }
    }
  }

  cellAt(r: number, c: number): Cell | null {
    const tile = this.tiles.get(tileKey(Math.floor(r / this.tileSize), Math.floor(c / this.tileSize)));
    if (!tile) return null;
    const i = (r - tile.dto.originRow) * tile.dto.cols + (c - tile.dto.originCol);
    const over = this.overlay.get(`${r},${c}`);
    return {
      digit: tile.dto.values.charCodeAt(i) - 48,
      tremor: tile.tremor[i],
      bin: over ?? tile.dto.bins[i],
    };
  }

  // Tras refinar: se marcan las celdas sin volver a pedir la grilla
  markRefined(cells: { r: number; c: number }[], binChar: string): void {
    cells.forEach(({ r, c }) => this.overlay.set(`${r},${c}`, binChar));
    this.notify();
  }

  // Ante 409 ALREADY_REFINED: descartar bloques afectados y volver a pedirlos
  invalidate(cells: { r: number; c: number }[]): void {
    for (const { r, c } of cells) {
      const key = tileKey(Math.floor(r / this.tileSize), Math.floor(c / this.tileSize));
      this.tiles.delete(key);
      this.overlay.delete(`${r},${c}`);
    }
    this.notify();
  }
}
```

**Qué hace / por qué:**
- **Caché** (`tiles`) + **dedupe** (`inflight`): nunca dos requests para el mismo bloque.
- **Cancelación** con `AbortController` de los bloques que salieron de la vista (`cancelOutside`), salvo los que una búsqueda de grupo necesita (`pinned`).
- **429**: `blockedUntil` frena *todas* las peticiones hasta que pase `Retry-After`. **503**: reintento con backoff exponencial (0.5 s, 1 s, 2 s…).
- `tremor` llega en base64: `atob` + `Uint8Array` da 1 byte (0–100) por celda. `values` y `bins` se indexan igual: `(r-originRow)*cols + (c-originCol)`.
- `overlay` marca celdas refinadas sin recargar bloques.

### 7.5 `src/grid/group.ts` — componente conexo (BFS) entre bloques

```ts
import type { Cell, FileDetail, FileRules, TileStore } from './TileStore';

export interface Group {
  cells: { r: number; c: number }[];
  noise: boolean;              // fuera de [minGroupSize, maxGroupSize]
  bin: string | null;          // caja correcta (WO/FC/DR/MA) o null si es ruido
}

const N4: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const N8: [number, number][] = [...N4, [-1, -1], [-1, 1], [1, -1], [1, 1]];

export async function findGroup(
  store: TileStore, file: FileDetail, rules: FileRules, start: { r: number; c: number },
  tileSize: number,
): Promise<Group> {
  const dirs = rules.connectivity === 8 ? N8 : N4;
  const scary = (cell: Cell | null): boolean => cell !== null && cell.tremor >= rules.tremorThreshold;

  async function read(r: number, c: number): Promise<Cell | null> {
    if (r < 0 || c < 0 || r >= file.rows || c >= file.cols) return null;
    await store.load(Math.floor(r / tileSize), Math.floor(c / tileSize), true);  // trae solo lo que falta
    return store.cellAt(r, c);
  }

  const seen = new Set<number>([start.r * file.cols + start.c]);
  const queue: { r: number; c: number }[] = [start];
  const cells: { r: number; c: number }[] = [];
  let sum = 0;
  let maxDigit = 0;

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const cell = await read(cur.r, cur.c);
    if (!scary(cell) || !cell) continue;
    cells.push(cur);
    sum += cell.digit;
    maxDigit = Math.max(maxDigit, cell.digit);
    if (cells.length > rules.maxGroupSize) break;    // ya es ruido: no seguir pidiendo bloques
    for (const [dr, dc] of dirs) {
      const r = cur.r + dr, c = cur.c + dc;
      const id = r * file.cols + c;
      if (r < 0 || c < 0 || r >= file.rows || c >= file.cols || seen.has(id)) continue;
      seen.add(id);
      queue.push({ r, c });
    }
  }

  const noise = cells.length < rules.minGroupSize || cells.length > rules.maxGroupSize;
  let bin: string | null = null;
  if (!noise) {
    const base = rules.binning.strategy === 'DIGIT_SUM_MOD' ? sum : maxDigit;
    bin = rules.binning.order[base % 4];
  }
  return { cells, noise, bin };
}
```

**Qué hace / por qué:** un **grupo** es un conjunto *máximo* de celdas conectadas con `tremor >= tremorThreshold`. Usamos BFS (cola) desde la celda clicada; la vecindad es de 4 u 8 según `connectivity`. Como la grilla es de hasta 512×512 y nunca se descarga entera, `read()` pide el bloque solo cuando el BFS cruza a él. Si el grupo ya supera `maxGroupSize` se corta: es ruido y no tiene sentido seguir descargando. La caja es `order[(suma de dígitos | dígito máx) % 4]` según `strategy`. Todo viene de `/rules`, nunca hardcodeado (la evaluación usa otras reglas por archivo).

### 7.6 `src/grid/VirtualGrid.tsx` — virtualización propia (sin librerías)

```tsx
import { memo, useEffect, useReducer, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { tileKey, type FileDetail, type TileStore } from './TileStore';

const CELL = 32;       // px por celda
const OVERSCAN = 2;    // celdas extra alrededor
// El viewport tiene tope fijo (1280×800) ⇒ máx ≈ (40+5)×(25+5) = 1350 celdas < 2500.

interface Props {
  file: FileDetail;
  store: TileStore;
  scrollTo: { r: number; c: number };        // posición inicial (?r=&c=)
  selected: Set<number>;                     // r*cols+c del grupo seleccionado
  onPick: (r: number, c: number) => void;
  onScrollPos: (r: number, c: number) => void;
}

const GridCell = memo(function GridCell(props: {
  r: number; c: number; digit: string; tremor: number; bin: string;
  selected: boolean; focused: boolean; threshold: number | null;
  onPick: (r: number, c: number) => void;
}) {
  const { r, c, digit, tremor, bin, selected, focused, onPick } = props;
  const scary = bin === '.' && tremor >= (props.threshold ?? 101);
  const style = {
    left: c * CELL, width: CELL, height: CELL,
    '--amp': `${(tremor / 100) * 2}px`,
    '--dur': `${0.4 - (tremor / 100) * 0.25}s`,
  } as CSSProperties;
  return (
    <div role="gridcell" aria-colindex={c + 1} aria-selected={selected}
         id={`cell-${r}-${c}`} tabIndex={focused ? 0 : -1}
         onClick={() => onPick(r, c)}
         className={`absolute flex items-center justify-center border border-slate-200 text-xs
           ${scary ? 'cell-scary' : ''} ${bin !== '.' ? 'bg-emerald-200' : ''} ${selected ? 'ring-2 ring-indigo-600' : ''}`}
         style={style}>
      {digit}
    </div>
  );
});
```

Continuación del mismo archivo `VirtualGrid.tsx`:

```tsx
export function VirtualGrid(
  { file, store, scrollTo, selected, onPick, onScrollPos, threshold }: Props & { threshold: number },
) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ top: 0, left: 0, w: 800, h: 600 });
  const [focus, setFocus] = useState({ r: scrollTo.r, c: scrollTo.c });
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  // Cuando llegan bloques nuevos, repintar
  useEffect(() => store.subscribe(rerender), [store]);

  // Medir el viewport y posición inicial (?r=&c=)
  useEffect(() => {
    const el = boxRef.current!;
    const measure = () => setView((v) => ({ ...v, w: el.clientWidth, h: el.clientHeight }));
    measure();
    el.scrollTo({ top: scrollTo.r * CELL, left: scrollTo.c * CELL });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  // Rango visible de celdas
  const r0 = Math.max(0, Math.floor(view.top / CELL) - OVERSCAN);
  const r1 = Math.min(file.rows - 1, Math.ceil((view.top + view.h) / CELL) + OVERSCAN);
  const c0 = Math.max(0, Math.floor(view.left / CELL) - OVERSCAN);
  const c1 = Math.min(file.cols - 1, Math.ceil((view.left + view.w) / CELL) + OVERSCAN);

  // Pedir SOLO los bloques que cubren el rango; cancelar los que ya no se ven
  useEffect(() => {
    const ts = file.tileSize;
    const keys = new Set<string>();
    for (let tr = Math.floor(r0 / ts); tr <= Math.floor(r1 / ts); tr++) {
      for (let tc = Math.floor(c0 / ts); tc <= Math.floor(c1 / ts); tc++) {
        keys.add(tileKey(tr, tc));
        if (!store.has(tr, tc)) store.load(tr, tc).catch(() => undefined);
      }
    }
    store.cancelOutside(keys);
  }, [r0, r1, c0, c1, file.tileSize, store]);

  // Posición en la URL con replace (el scroll no llena el historial), con debounce
  useEffect(() => {
    const id = setTimeout(() => onScrollPos(Math.floor(view.top / CELL), Math.floor(view.left / CELL)), 250);
    return () => clearTimeout(id);
  }, [view.top, view.left, onScrollPos]);

  // Teclado: flechas, PageUp/PageDown, Home/End. La celda con foco SIEMPRE está en el DOM.
  function onKeyDown(e: KeyboardEvent) {
    const page = Math.max(1, Math.floor(view.h / CELL) - 1);
    let { r, c } = focus;
    switch (e.key) {
      case 'ArrowUp': r--; break;
      case 'ArrowDown': r++; break;
      case 'ArrowLeft': c--; break;
      case 'ArrowRight': c++; break;
      case 'PageUp': r -= page; break;
      case 'PageDown': r += page; break;
      case 'Home': c = 0; if (e.ctrlKey) r = 0; break;
      case 'End': c = file.cols - 1; if (e.ctrlKey) r = file.rows - 1; break;
      case 'Enter': case ' ': onPick(focus.r, focus.c); e.preventDefault(); return;
      default: return;
    }
    e.preventDefault();
    r = Math.min(Math.max(r, 0), file.rows - 1);
    c = Math.min(Math.max(c, 0), file.cols - 1);
    setFocus({ r, c });
    // Mover el scroll para que la celda enfocada quede dentro del rango renderizado
    const el = boxRef.current!;
    if (r * CELL < el.scrollTop) el.scrollTop = r * CELL;
    else if ((r + 1) * CELL > el.scrollTop + el.clientHeight) el.scrollTop = (r + 1) * CELL - el.clientHeight;
    if (c * CELL < el.scrollLeft) el.scrollLeft = c * CELL;
    else if ((c + 1) * CELL > el.scrollLeft + el.clientWidth) el.scrollLeft = (c + 1) * CELL - el.clientWidth;
    requestAnimationFrame(() => document.getElementById(`cell-${r}-${c}`)?.focus());
  }

  const rows: number[] = [];
  for (let r = r0; r <= r1; r++) rows.push(r);

  return (
    <div ref={boxRef} role="grid" aria-label="Grilla de datos" aria-rowcount={file.rows} aria-colcount={file.cols}
         onKeyDown={onKeyDown}
         onScroll={(e) => setView((v) => ({ ...v, top: e.currentTarget.scrollTop, left: e.currentTarget.scrollLeft }))}
         className="relative overflow-auto border"
         style={{ width: '100%', maxWidth: 1280, height: '70vh', maxHeight: 800 }}>
      <div style={{ width: file.cols * CELL, height: file.rows * CELL, position: 'relative' }}>
        {rows.map((r) => (
          <div key={r} role="row" aria-rowindex={r + 1}
               className="absolute" style={{ top: r * CELL, height: CELL, width: file.cols * CELL }}>
            {Array.from({ length: c1 - c0 + 1 }, (_, i) => c0 + i).map((c) => {
              const cell = store.cellAt(r, c);
              if (!cell) {
                // Placeholder del mismo tamaño: el layout no salta
                return <div key={c} role="gridcell" aria-colindex={c + 1} className="absolute bg-slate-100"
                            style={{ left: c * CELL, width: CELL, height: CELL }} />;
              }
              return (
                <GridCell key={c} r={r} c={c} digit={String(cell.digit)} tremor={cell.tremor} bin={cell.bin}
                          selected={selected.has(r * file.cols + c)} focused={focus.r === r && focus.c === c}
                          threshold={threshold} onPick={(rr, cc) => { setFocus({ r: rr, c: cc }); onPick(rr, cc); }} />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Qué hace / por qué (léelo bien: es lo más probable que te pregunten):**
- **Virtualización:** el contenedor interno tiene el tamaño *total* (`rows*CELL × cols*CELL`) para que la barra de scroll sea real, pero solo se renderizan las celdas del **rango visible + overscan**. El viewport tiene tope fijo, así que nunca hay >2 500 celdas en el DOM (límite del enunciado).
- **Bloques bajo demanda:** a partir del rango visible se calculan los bloques (`floor(r / tileSize)`) y se piden solo los que faltan; los que salieron de vista se cancelan.
- **Placeholders** del mismo tamaño mientras llega el bloque: el layout no salta.
- **ARIA grid:** `role=grid/row/gridcell` con `aria-rowindex`/`aria-colindex` **reales** (índice global, no el del DOM) + `aria-rowcount/colcount` totales.
- **Teclado:** la celda con foco siempre está en el DOM porque al moverla se ajusta el scroll antes de enfocar.
- La posición se escribe a la URL con `replace` y debounce: el scroll no llena el historial.
- `memo` en `GridCell` evita re-renderizar celdas sin cambios.

### 7.7 `src/pages/RefinePage.tsx` — refinar con idempotencia

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ApiError, request } from '../lib/api';
import { TileStore, type FileDetail, type FileRules } from '../grid/TileStore';
import { findGroup, type Group } from '../grid/group';
import { VirtualGrid } from '../grid/VirtualGrid';

const BIN_CHAR: Record<string, string> = { WO: 'W', FC: 'F', DR: 'D', MA: 'M' };
const BOXES = ['WO', 'FC', 'DR', 'MA'];

interface Intent { key: string; bin: string }   // una intención = un UUID

export function RefinePage() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const [file, setFile] = useState<FileDetail | null>(null);
  const [rules, setRules] = useState<FileRules | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [group, setGroup] = useState<Group | null>(null);
  const [finding, setFinding] = useState(false);
  const [refining, setRefining] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const intent = useRef<Intent | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    Promise.all([
      request<FileDetail>(`/files/${id}`, { signal: ac.signal }),
      request<FileRules>(`/files/${id}/rules`, { signal: ac.signal }),
    ]).then(([f, r]) => { setFile(f); setRules(r); })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof ApiError ? e.message : 'Error de red');
      });
    return () => ac.abort();
  }, [id]);

  const store = useMemo(() => (file ? new TileStore(file.id, file.tileSize) : null), [file]);

  // Posición inicial desde la URL (sanear: valores inválidos → 0)
  const start = useMemo(() => ({
    r: Math.max(0, Number(sp.get('r')) || 0),
    c: Math.max(0, Number(sp.get('c')) || 0),
  }), []);   // eslint-disable-line react-hooks/exhaustive-deps

  const onScrollPos = useCallback((r: number, c: number) => {
    setSp({ r: String(r), c: String(c) }, { replace: true });   // replace: no llena el historial
  }, [setSp]);

  async function onPick(r: number, c: number) {
    if (!file || !rules || !store || finding) return;
    setFinding(true); setMsg(null); intent.current = null;
    try { setGroup(await findGroup(store, file, rules, { r, c }, file.tileSize)); }
    catch (e) { if (!(e instanceof DOMException)) setMsg('No se pudo cargar el grupo'); }
    finally { setFinding(false); }
  }

  async function refine(bin: string) {
    if (!group || group.noise || refining || !store) return;       // anti doble clic
    // Misma intención (mismo bin) ⇒ MISMA Idempotency-Key, también en reintentos por red
    if (!intent.current || intent.current.bin !== bin) intent.current = { key: crypto.randomUUID(), bin };
    setRefining(true); setMsg(null);
    try {
      await request<unknown>(`/files/${id}/refinements`, {
        method: 'POST',
        headers: { 'Idempotency-Key': intent.current.key },
        body: { bin, cells: group.cells },
      });
      store.markRefined(group.cells, BIN_CHAR[bin]);
      setGroup(null); intent.current = null;
      setMsg('Grupo refinado ✔');
      // TODO: actualizar barras de progreso con la respuesta (forma: VERIFICAR en Swagger)
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        setMsg(e.code === 'WRONG_BIN' ? 'Caja incorrecta (suma 1 error).' : 'Grupo inválido (ver reglas).');
        intent.current = null;                       // nueva intención en el próximo intento
      } else if (e instanceof ApiError && e.status === 409) {
        setMsg('Alguna celda ya estaba refinada; recargando bloques…');
        store.invalidate(group.cells); setGroup(null); intent.current = null;
      } else {
        setMsg('Fallo de red: puedes reintentar (no se duplicará).');   // key se conserva
      }
    } finally { setRefining(false); }
  }

  if (error) return <p role="alert" className="p-6 text-red-700">{error}</p>;
  if (!file || !rules || !store) return <p role="status" className="p-6">Cargando archivo…</p>;

  const selected = new Set(group?.cells.map((x) => x.r * file.cols + x.c) ?? []);

  return (
    <main className="space-y-3 p-4">
      <h1 className="text-xl font-bold">Refinar archivo {file.id}</h1>
      <VirtualGrid file={file} store={store} scrollTo={start} selected={selected}
                   threshold={rules.tremorThreshold} onPick={(r, c) => void onPick(r, c)} onScrollPos={onScrollPos} />
      <section aria-live="polite" className="min-h-24 rounded border p-3">
        {finding && <p>Buscando grupo…</p>}
        {group && !finding && (
          <p>Grupo de {group.cells.length} celdas — {group.noise ? 'ruido (no refinable)' : `caja correcta: ${group.bin}`}</p>
        )}
        <div className="mt-2 flex gap-2">
          {BOXES.map((b) => (
            <button key={b} disabled={!group || group.noise || refining} onClick={() => void refine(b)}
                    className="rounded border px-3 py-1 disabled:opacity-40">{b}</button>
          ))}
        </div>
        {msg && <p className="mt-2 text-sm">{msg}</p>}
      </section>
    </main>
  );
}
```

**Qué hace / por qué:**
- **`Idempotency-Key`** = un UUID por **intención** del usuario. Si la request se repite con la misma key y el mismo cuerpo, el backend devuelve la misma respuesta sin refinar otra vez (`Idempotent-Replayed: true`). Por eso la key se conserva en reintentos por red y solo se renueva tras un 422/409 o un éxito. Esto es lo que exige la *Regla de Kier* ("ningún grupo se refina dos veces").
- `refining` deshabilita los botones mientras vuela la request: doble clic/doble Enter no duplican.
- **Los 4 botones** son la vía con **teclado** para "llevar el grupo a una caja". El arrastre con Pointer Events es adicional: `onPointerDown` en el panel del grupo → `setPointerCapture` → `onPointerUp` y comprobar con `document.elementFromPoint(e.clientX, e.clientY)` si cayó sobre un botón de caja con `data-box`; llamar `refine(box)`.
- `422`: grupo inválido o `WRONG_BIN` (suma 1 error). `409 ALREADY_REFINED`: se invalidan los bloques afectados y se vuelven a pedir.
- Tras refinar se marcan las celdas con `markRefined` sin volver a pedir la grilla.

---

## 8. CP3 — Sala de Bienestar (los dos)

1. Inscribir integrantes: `PUT /team/roster` (formato en Swagger) al inicio.
2. Cuando CP1 y CP2 funcionen **en producción**: ir a `https://<su-app>/estado` y pulsar "Abrir el Piso de Pruebas". Para que pase:
   - dominio verificado y `X-Lumon-Build` con SHA real;
   - ≥1 refresh exitoso (esperar a que el access token venza o hacer F5 con sesión);
   - ≥30 bloques pedidos sin duplicados en vuelo y respetando `Retry-After`;
   - con **caos 1 o 2** (`PUT /workspace/chaos {"level":1}`): ≥3 grupos refinados y un reintento con la misma `Idempotency-Key`.
3. Rondas a **0:40, 1:05, 1:30, 1:50**: <https://lumon-api.vercel.app/wellness> publica quién sale sorteado 2 min antes. 6 preguntas opción múltiple, 5 min, aprobar con 5/6, **sin laptop**.
4. **Sin ronda aprobada al cierre, CP3, CP4 y CP5 valen 0.** Los dos deben dominar *todo* el código, no solo su parte.
5. Auditorías: un docente puede pedir mostrar y hacer un cambio pequeño en el código, sin IA.

---

## 9. CP4 y CP5 (plan; solo después de CP1–CP3)

**CP4 — Expedientes** (B; requiere Piso abierto + storage verificado)
- `/refiners` paginado con filtro de departamento (`/departments`) y búsqueda, todo en URL (reutiliza `useFilesList` como plantilla).
- **Los textos vienen del exterior: renderizar siempre como texto** (`{texto}` en JSX; **nunca** `dangerouslySetInnerHTML`).
- Imágenes: `loading="lazy"` + `width`/`height` fijos (no mueven layout).
- Subida: recortar cuadrado → `canvas.toBlob(cb, 'image/webp')` (sin EXIF por pasar por canvas) → SHA-256 con `crypto.subtle.digest` → `POST /media/tickets` → subir con `XMLHttpRequest` (para barra de progreso real) → `POST /media/tickets/{id}/confirm`. Sin librerías de recorte/compresión/dropzone.

**CP5 — Contingencia** (A)
- **SSE:** `POST /events/tickets` → `new EventSource(\`${BASE}/events/stream?ticket=...&lastEventId=...\`)` (el `EventSource` **nativo** es válido; los clientes/polyfills no). Ticket de **un solo uso, 30 s**: pedir uno nuevo en cada reconexión, con backoff. Deduplicar eventos por `id`; ignorar versiones más viejas de un expediente.
- **Una sola conexión para todas las pestañas:** `navigator.locks.request('lumon-sse', …)` elige la pestaña líder; esa reenvía los eventos por `BroadcastChannel` a las demás. Si cierra la líder, otra toma el lock.
- **WebSocket** nativo en `/floor/ws?ticket=...` (ticket nuevo en cada conexión), `ping` cada <20 s, reconexión según `CloseEvent.code` (`4400/4403/4404/4423` no reconectar; `4401` ticket nuevo; `4408/1006/1012` reconectar; `4429` esperar ≥10 s), `resync` si `seq` salta.
- **`/refiners/:id/edit`:** `PATCH` con `If-Match` = `ETag` del `GET`. `412 VERSION_CONFLICT` ⇒ pantalla de conflicto campo por campo; nunca sobrescribir en silencio.
- **Contingencia:** modal con foco atrapado y `role="alertdialog"`, solo se cierra con `POST /contingency/{id}/ack`.

---

## 10. Despliegue y verificación de dominio (A)

```bash
# Opción CLI (Vercel)
npm i -g vercel
vercel login
vercel link
vercel env add VITE_API_BASE_URL production   # https://lumon-api.vercel.app/api/v1
vercel env add VITE_WS_BASE_URL production    # wss://lumon-api.vercel.app/api/v1
vercel --prod
```

(O desde vercel.com: *Add New → Project → importar el repo → Framework "Vite" → variables `VITE_*`*. Cada `git push` a `main` redeploya.)

Verificar el dominio (el backend descarga un archivo desde Internet):

```bash
# 1) Pedir el token (desde Swagger con Authorize, o la app en localhost):
#    POST /integrations/deploy/challenge   {"origin": "https://su-app.vercel.app"}

# 2) Publicar el token como texto plano, SIN salto de línea ni nada más:
mkdir -p public/.well-known
printf '%s' 'PEGAR_TOKEN_AQUI' > public/.well-known/lumon-verification.txt
git add public/.well-known/lumon-verification.txt
git commit -m "chore: verificación de dominio Lumon"
git push origin main

# 3) Comprobar que se sirve como texto:
curl -i https://su-app.vercel.app/.well-known/lumon-verification.txt

# 4) POST /integrations/deploy/verify   (Swagger o localhost)
```

Storage de imágenes (CP4), elegir **uno**: Supabase (`lumon-media`, público lectura, solo `image/webp` ≤300 KB, RLS que deje a `anon` **insertar** solo en `TEAM-0XX/`) o Cloudinary (preset *unsigned* que fuerce `lumon/<TEAM_CODE>/`, solo `webp`, sin overwrite). Registrar con `PUT /integrations/storage`. **Jamás** subir claves secretas.

Verificar que el deploy corresponde al último commit:

```bash
git rev-parse --short=7 HEAD      # debe coincidir con el build mostrado en /estado
```

---

## 11. Entrega final (antes del cierre)

```bash
npm run typecheck     # sin errores
npm run build         # sin errores (si falla, la nota es 0)
git status            # nada sin commitear
git log -1 --oneline
git push origin main
```

- [ ] `hackathon.json` completo: `TEAM_CODE` de la cuenta que aprobó la ronda, URL de producción, proveedor de storage, integrantes (abrir el archivo y llenar **sus campos**).
- [ ] `.env.example` con todas las variables, sin valores reales.
- [ ] `README.md`: integrantes (nombre y código), URL de producción, cómo ejecutar, cómo configuraron deploy y storage.
- [ ] Sin `any`, sin `@ts-ignore` (−2 pts). Sin librerías prohibidas (MUI/Chakra/shadcn, React Query/SWR, virtualización, dnd, animación, `socket.io`, `eventsource`…).
- [ ] Nada hardcodeado (reglas, datos, roles). Probar con `PUT /workspace/chaos {"level":1}`.
- [ ] JS inicial de `/login` ≤ 180 KB gzip: cargar `RefinePage` con `React.lazy` + `Suspense` (cliente de storage y grilla fuera del bundle inicial).
- [ ] Lighthouse Accesibilidad ≥ 90 en `/login`, `/files`, `/refiners`.
- [ ] Un error de render no deja la app en blanco: agregar un `ErrorBoundary` (class component) con botón "Volver".
- [ ] Abrir una ruta profunda directo en el deploy (`/files/42/refine?r=100&c=40`) funciona.

---

## 12. Autoevaluación (la ronda es sin IA: respondan sin mirar)

**CP1**
1. ¿Por qué el access token vive en memoria y el refresh en `localStorage`? ¿Qué se pierde al hacer F5 y cómo se recupera?
2. Si 5 requests reciben `TOKEN_EXPIRED` a la vez, ¿cuántos `POST /auth/refresh` se hacen y por qué?
3. ¿Qué es `REFRESH_REUSED` y qué rol cumple `navigator.locks` con varias pestañas?

<details><summary>Respuestas</summary>

1. En memoria no queda en disco ni lo lee un script que corra después (menos superficie ante XSS); el refresh debe persistir para sobrevivir al cierre. Al F5 se pierde el access token; se recupera con `refresh` y luego `/auth/me`.
2. Uno: la promesa `refreshing` se comparte; las otras esperan esa misma y cada una reintenta una vez.
3. Reusar un refresh token (de un solo uso) se interpreta como robo y se revoca toda la sesión. El lock evita que dos pestañas refresquen a la vez con el mismo token; se lee el token más reciente dentro del lock.
</details>

**CP2**
1. ¿Por qué usas `AbortController` en el efecto y qué pasaría sin él?
2. ¿Por qué la URL es la fuente de verdad en vez de un `useState`?
3. ¿Qué hace la virtualización y cómo garantizas ≤2 500 celdas en el DOM?
4. ¿Para qué sirve `Idempotency-Key` y cuándo se genera una nueva?
5. ¿Por qué el BFS pide bloques "a demanda"?

<details><summary>Respuestas</summary>

1. Cancela la request vieja al cambiar la query; sin él, una respuesta lenta anterior podría llegar después y pisar a la nueva (race condition).
2. Recargar, compartir el link y atrás/adelante reproducen el mismo estado, y un estado único evita desincronización.
3. Solo renderiza el rango visible + overscan dentro de un contenedor con el tamaño total; el viewport tiene tope fijo, así que el rango no puede superar ~1 350 celdas.
4. Para que un reintento (red caída, doble clic) no refine dos veces: misma key + mismo cuerpo ⇒ misma respuesta. Se genera una nueva por cada *intención* nueva (tras éxito o tras 422/409).
5. La grilla puede ser 512×512 y no se puede descargar entera; el BFS solo pide el bloque cuando el grupo cruza a él.
</details>

**CP3**
1. ¿Qué comprueba `POST /clearance/check` y por qué da 403 desde Swagger?
2. ¿Qué pasa si no aprueban ninguna ronda?

**CP4–CP6** (cuando lleguen)
1. ¿Por qué el texto del expediente se renderiza como texto y no como HTML? (XSS)
2. ¿Qué es `ETag`/`If-Match` y qué significa `412`? (concurrencia optimista)
3. ¿Por qué `connect-src` no puede ser `*` y qué lleva `wss://`? (CSP)

> **Modo examen:** escríbeme "modo examen" y te pregunto una por una, sin dar la respuesta hasta que contestes.
