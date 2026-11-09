import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "./AuthContext";
import type { Permission } from "../lib/types";
import { FullScreen } from "../components/FullScreen";
import NoPermissionPage from "../pages/NoPermissionPage";

// Ruta privada: sin sesión -> al login, recordando a dónde quería ir (ruta + query string).
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "checking") return <FullScreen>Verificando sesión…</FullScreen>;
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

// Sin el permiso: página "sin permiso" (no un error ni pantalla en blanco).
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = useAuth();
  return can(permission) ? children : <NoPermissionPage permission={permission} />;
}
