import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth, RequirePermission } from "./auth/guards";
import { HealthGate } from "./components/HealthGate";
import { Layout } from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import RegisterPage from "./pages/RegisterPage";

// Code splitting: estas páginas se descargan recién cuando se visitan
// (así la grilla del CP2 no entra en el bundle inicial del /login).
const FilesPage = lazy(() => import("./pages/FilesPage"));
const RefinePage = lazy(() => import("./pages/RefinePage"));
const EstadoPage = lazy(() => import("./pages/EstadoPage"));

export default function App() {
  return (
    <HealthGate>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Rutas privadas */}
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/files" replace />} />
              <Route
                path="/files"
                element={
                  <RequirePermission permission="files:read">
                    <FilesPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/files/:id/refine"
                element={
                  <RequirePermission permission="files:read">
                    <RefinePage />
                  </RequirePermission>
                }
              />
              <Route path="/estado" element={<EstadoPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </HealthGate>
  );
}
