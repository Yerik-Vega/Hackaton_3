import { useEffect, useState, type ReactNode } from "react";
import { request } from "../lib/api";
import { FullScreen } from "./FullScreen";

// Antes de mostrar la app comprueba GET /meta/health.
// Si no responde: "Conectando con Lumon…", reintenta solo con espera creciente (1, 2, 4, 8… máx 30 s)
// y deja reintentar a mano.
export function HealthGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    async function check() {
      try {
        await request("/meta/health", { auth: false, retries: 0, signal: AbortSignal.timeout(10_000) });
        if (!cancelled) setOk(true);
      } catch {
        if (cancelled) return;
        const delay = Math.min(30, 2 ** attempt);
        setFailed(true);
        setWaitSeconds(delay);
        timer = window.setTimeout(() => setAttempt((a) => a + 1), delay * 1000);
      }
    }
    check();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [attempt]);

  if (ok) return children;
  return (
    <FullScreen>
      <p className="text-xl">Conectando con Lumon…</p>
      {failed && (
        <>
          <p className="text-slate-400">Lumon no responde. Reintento automático en {waitSeconds} s.</p>
          <button
            className="px-4 py-2 rounded bg-teal-700 hover:bg-teal-600"
            onClick={() => setAttempt((a) => a + 1)}
          >
            Reintentar ahora
          </button>
        </>
      )}
    </FullScreen>
  );
}
