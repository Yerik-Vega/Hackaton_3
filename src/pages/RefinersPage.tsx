import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { errorMessage, request } from "../lib/api";

interface Department {
  id: number;
  code: string;
  name: string;
}
interface Refiner {
  id: number;
  fullName: string;
  department: Department;
  title: string;
  extension: string;
  bio: string;
  profileUrl: string | null;
  badge: { url: string; width: number; height: number } | null;
  version: number;
}
interface RefinerPage {
  content: Refiner[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

const SIZES = [10, 25, 50];

// Los datos vienen "del exterior": solo se aceptan links http(s) (nada de "javascript:...")
function safeUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}

// /refiners: directorio paginado con filtro por departamento y búsqueda, todo en la URL
export default function RefinersPage() {
  const [params, setParams] = useSearchParams();
  const pageNum = Number(params.get("page"));
  const page = Number.isInteger(pageNum) && pageNum >= 0 ? pageNum : 0;
  const sizeNum = Number(params.get("size"));
  const size = SIZES.includes(sizeNum) ? sizeNum : 10;
  const deptNum = Number(params.get("departmentId"));
  const departmentId = Number.isInteger(deptNum) && deptNum >= 1 ? deptNum : null;
  const q = (params.get("q") ?? "").slice(0, 60);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [data, setData] = useState<RefinerPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState(q);

  useEffect(() => {
    request<Department[]>("/departments")
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, []);

  useEffect(() => setSearch(q), [q]);
  // Búsqueda con debounce: sin una request por tecla
  useEffect(() => {
    if (search === q) return;
    const timer = window.setTimeout(() => update({ q: search, page: "0" }, true), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  // AbortController: una respuesta vieja nunca pisa a una nueva
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    if (departmentId) query.set("departmentId", String(departmentId));
    if (q) query.set("q", q);
    setLoading(true);
    setError(null);
    request<RefinerPage>(`/refiners?${query}`, { signal: controller.signal })
      .then(setData)
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, size, departmentId, q, reload]);

  function update(changes: Record<string, string>, replace = false) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === "") next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace });
  }

  const inputClass = "px-2 py-1 rounded bg-slate-800 border border-slate-600";

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Expedientes del personal</h1>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col">
          <label htmlFor="rq" className="text-sm">
            Buscar
          </label>
          <input id="rq" type="search" maxLength={60} value={search} onChange={(e) => setSearch(e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col">
          <label htmlFor="dept" className="text-sm">
            Departamento
          </label>
          <select
            id="dept"
            value={departmentId ?? ""}
            onChange={(e) => update({ departmentId: e.target.value, page: "0" })}
            className={inputClass}
          >
            <option value="">Todos</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="rsize" className="text-sm">
            Por página
          </label>
          <select id="rsize" value={size} onChange={(e) => update({ size: e.target.value, page: "0" })} className={inputClass}>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {loading && <span role="status">Cargando…</span>}
      </div>

      {error && (
        <div role="alert" className="text-red-300">
          {error}{" "}
          <button onClick={() => setReload((r) => r + 1)} className="underline">
            Reintentar
          </button>
        </div>
      )}

      {data && (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.content.map((refiner) => {
              const profile = safeUrl(refiner.profileUrl);
              const badge = refiner.badge && safeUrl(refiner.badge.url);
              return (
                <li key={refiner.id} className="flex gap-3 p-3 rounded bg-slate-900 border border-slate-800">
                  {/* Tamaño fijo: la imagen no mueve el layout al cargar; loading="lazy": carga diferida */}
                  {badge ? (
                    <img src={badge} alt={`Fotocheck de ${refiner.fullName}`} width={64} height={64} loading="lazy" className="w-16 h-16 rounded object-cover bg-slate-800" />
                  ) : (
                    <div aria-hidden="true" className="w-16 h-16 rounded bg-slate-700 flex items-center justify-center text-xl font-bold shrink-0">
                      {refiner.fullName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 space-y-1">
                    {/* Todo se muestra como TEXTO: React escapa el HTML que venga en los datos (anti-XSS) */}
                    <h2 className="font-semibold">{refiner.fullName}</h2>
                    <p className="text-sm text-slate-300">
                      {refiner.title} · {refiner.department.name} · ext. {refiner.extension}
                    </p>
                    <p className="text-sm text-slate-400 break-words">{refiner.bio}</p>
                    {profile && (
                      <a href={profile} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-300 underline">
                        Perfil <span className="sr-only">de {refiner.fullName}</span>
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {data.content.length === 0 && <p className="text-slate-400">No hay expedientes con esos filtros.</p>}

          <nav aria-label="Paginación" className="flex gap-3 items-center">
            <button
              disabled={page <= 0}
              onClick={() => update({ page: String(page - 1) })}
              className="px-3 py-1 rounded bg-slate-700 disabled:opacity-40"
            >
              Anterior
            </button>
            <span>
              Página {data.page + 1} de {Math.max(1, data.totalPages)} · {data.totalElements} expedientes
            </span>
            <button
              disabled={page + 1 >= data.totalPages}
              onClick={() => update({ page: String(page + 1) })}
              className="px-3 py-1 rounded bg-slate-700 disabled:opacity-40"
            >
              Siguiente
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
