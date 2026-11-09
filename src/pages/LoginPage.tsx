import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../lib/api";
import { FullScreen } from "../components/FullScreen";

export default function LoginPage() {
  const { status, login, notice } = useAuth();
  const location = useLocation();
  // A dónde quería ir antes de que lo mandaran al login (con su query string)
  const from = (location.state as { from?: string } | null)?.from ?? "/files";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (status === "checking") return <FullScreen>Verificando sesión…</FullScreen>;
  if (status === "authenticated") return <Navigate to={from} replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      // al cambiar status a "authenticated", el <Navigate> de arriba lo lleva a `from`
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === "INVALID_CREDENTIALS"
          ? "Email o contraseña incorrectos."
          : err instanceof Error
            ? err.message
            : "No se pudo iniciar sesión.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 bg-slate-900 p-6 rounded-lg" noValidate>
        <h1 className="text-2xl font-bold text-teal-300">Lumon MDR · Entrar</h1>
        {notice && (
          <p role="alert" className="text-amber-300 text-sm">
            {notice}
          </p>
        )}
        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600"
          />
        </div>
        {error && (
          <p role="alert" className="text-red-300 text-sm">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded bg-teal-700 hover:bg-teal-600 disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
        <p className="text-sm text-slate-300">
          ¿Cuadrilla nueva?{" "}
          <Link to="/register" className="text-teal-300 underline">
            Regístrala
          </Link>
        </p>
      </form>
    </main>
  );
}
