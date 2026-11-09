// Contexto de autenticación (Context API, como en la clase):
// cualquier componente puede leer el usuario y sus permisos con useAuth().
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { endSession, onSessionEnd, refreshSession, request } from "../lib/api";
import { broadcast, onSessionMessage } from "../lib/sessionChannel";
import { getRefreshToken, saveTokens } from "../lib/tokens";
import type { Me, Permission, TokenPair } from "../lib/types";

type Status = "checking" | "authenticated" | "anonymous";

interface AuthValue {
  status: Status;
  me: Me | null;
  notice: string | null; // mensaje para el login (p. ej. "tu sesión se revocó")
  login: (email: string, password: string) => Promise<void>;
  register: (teamName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
  reloadMe: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

const REASONS: Record<string, string> = {
  REFRESH_REUSED: "Tu sesión se cerró por seguridad (el token de renovación se usó dos veces). Vuelve a entrar.",
  SESSION_REVOKED: "Tu sesión fue revocada. Vuelve a entrar.",
  TOKEN_INVALID: "Tu sesión no es válida. Vuelve a entrar.",
  REFRESH_INVALID: "Tu sesión venció. Vuelve a entrar.",
  LOGOUT: "Cerraste sesión.",
};

const getMe = () => request<Me>("/auth/me");

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [me, setMe] = useState<Me | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const statusRef = useRef<Status>("checking");
  statusRef.current = status;

  // 1) Al montar: restaurar la sesión con el refresh token guardado (sin mostrar el login mientras tanto)
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!getRefreshToken()) {
        setStatus("anonymous");
        return;
      }
      try {
        await refreshSession();
        const user = await getMe();
        if (!cancelled) {
          setMe(user);
          setStatus("authenticated");
        }
      } catch {
        if (!cancelled) setStatus("anonymous");
      }
    }
    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Escuchar fin de sesión (en esta u otra pestaña) y logins hechos en otra pestaña
  useEffect(() => {
    const offEnd = onSessionEnd((reason) => {
      setMe(null);
      setStatus("anonymous");
      setNotice(REASONS[reason] ?? "Tu sesión terminó. Vuelve a entrar.");
    });
    const offMsg = onSessionMessage(async (msg) => {
      if (msg.type === "token" && statusRef.current === "anonymous") {
        try {
          setMe(await getMe());
          setStatus("authenticated");
        } catch {
          // la otra pestaña sigue sola
        }
      }
    });
    return () => {
      offEnd();
      offMsg();
    };
  }, []);

  async function startSession(pair: TokenPair) {
    saveTokens(pair);
    broadcast({ type: "token", accessToken: pair.accessToken });
    setMe(await getMe());
    setNotice(null);
    setStatus("authenticated");
  }

  async function login(email: string, password: string) {
    const pair = await request<TokenPair>("/auth/login", { method: "POST", body: { email, password }, auth: false });
    await startSession(pair);
  }

  async function register(teamName: string, email: string, password: string) {
    const pair = await request<TokenPair>("/auth/register", {
      method: "POST",
      body: { teamName, email, password },
      auth: false,
    });
    await startSession(pair);
  }

  async function logout() {
    const refreshToken = getRefreshToken();
    try {
      // El logout revoca la sesión EN EL SERVIDOR
      if (refreshToken) await request("/auth/logout", { method: "POST", body: { refreshToken }, auth: false });
    } catch {
      // aunque falle la red, cerramos localmente
    }
    endSession("LOGOUT");
  }

  async function reloadMe() {
    setMe(await getMe());
  }

  // La interfaz se decide por permissions (NO por role.code: los roles cambian entre workspaces)
  const can = (permission: Permission) => me?.permissions.includes(permission) ?? false;

  return (
    <AuthContext.Provider value={{ status, me, notice, login, register, logout, can, reloadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return value;
}
