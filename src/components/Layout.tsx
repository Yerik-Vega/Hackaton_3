import { Suspense } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { ErrorBoundary } from "./ErrorBoundary";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1 rounded ${isActive ? "bg-slate-700 text-white" : "text-slate-300 hover:text-white"}`;

// Marco de las páginas privadas: barra superior + contenido
export function Layout() {
  const { me, logout, can } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center gap-4 px-4 py-2 border-b border-slate-800 bg-slate-900">
        <span className="font-bold text-teal-300">Lumon MDR</span>
        <nav aria-label="Principal" className="flex gap-1">
          {can("files:read") && (
            <NavLink to="/files" className={linkClass}>
              Archivos
            </NavLink>
          )}
          {can("refiners:read") && (
            <NavLink to="/refiners" className={linkClass}>
              Expedientes
            </NavLink>
          )}
          <NavLink to="/estado" className={linkClass}>
            Estado
          </NavLink>
        </nav>
        <span className="ml-auto text-sm text-slate-300">
          {me?.displayName} · {me?.team.code} · {me?.role.name}
        </span>
        <button onClick={logout} className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-sm">
          Cerrar sesión
        </button>
      </header>
      <main className="flex-1 flex flex-col">
        {/* key = ruta: si una página falla, al navegar a otra se resetea el error */}
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<p className="p-6">Cargando…</p>}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
