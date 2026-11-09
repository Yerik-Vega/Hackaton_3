import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { errorMessage, request } from "../lib/api";
import type { FilePage } from "../lib/types";

// Todo el estado del listado vive en la URL (?page=&size=&status=&q=&sort=):
// recargar, compartir o usar atrás/adelante muestra exactamente lo mismo.
const SIZES = [10, 25, 50];
const STATUSES = ["", "ACTIVE", "COMPLETE"];
const SORTS = ["updatedAt,desc", "name,asc", "progress,desc"];

// Una URL inválida no rompe la vista: cada valor raro se reemplaza por el de defecto
function readParams(params: URLSearchParams) {
  const page = Number(params.get("page"));
  const size = Number(params.get("size"));
  const status = params.get("status") ?? "";
  const sort = params.get("sort") ?? "";
  return {
    page: Number.isInteger(page) && page >= 0 ? page : 0,
    size: SIZES.includes(size) ? size : 10,
    status: STATUSES.includes(status) ? status : "",
    q: (params.get("q") ?? "").slice(0, 60),
    sort: SORTS.includes(sort) ? sort : "updatedAt,desc",
  };
}

export default function FilesPage() {
  const [params, setParams] = useSearchParams();
  const { page, size, status, q, sort } = readParams(params);

  const [data, setData] = useState<FilePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  // Buscador: se escribe en un estado local y recién 400 ms después de dejar de tipear va a la URL
  // (así no hay una request por tecla = "debounce").
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]); // si la URL cambia (atrás/adelante), el input la sigue
  useEffect(() => {
    if (search === q) return;
    const timer = window.setTimeout(() => update({ q: search, page: "0" }, true), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Carga de datos. El AbortController de la limpieza cancela la request anterior:
  // una respuesta vieja nunca pisa a una nueva (Regla del Tablero).
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ page: String(page), size: String(size), sort });
    if (status) query.set("status", status);
    if (q) query.set("q", q);

    setLoading(true);
    setError(null);
    request<FilePage>(`/files?${query}`, { signal: controller.signal })
      .then((result) => setData(result))
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, size, status, q, sort, reload]);

  function update(changes: Record<string, string>, replace = false) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === "") next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace });
  }

  const selectClass = "px-2 py-1 rounded bg-slate-800 border border-slate-600";

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Archivos de datos</h1>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col">
          <label htmlFor="q" className="text-sm">
            Buscar
          </label>
          <input
            id="q"
            type="search"
            maxLength={60}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={selectClass}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="status" className="text-sm">
            Estado
          </label>
          <select id="status" value={status} onChange={(e) => update({ status: e.target.value, page: "0" })} className={selectClass}>
            <option value="">Todos</option>
            <option value="ACTIVE">Activos</option>
            <option value="COMPLETE">Completados</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="sort" className="text-sm">
            Orden
          </label>
          <select id="sort" value={sort} onChange={(e) => update({ sort: e.target.value, page: "0" })} className={selectClass}>
            <option value="updatedAt,desc">Más recientes</option>
            <option value="name,asc">Nombre</option>
            <option value="progress,desc">Progreso</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="size" className="text-sm">
            Por página
          </label>
          <select id="size" value={size} onChange={(e) => update({ size: e.target.value, page: "0" })} className={selectClass}>
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
          <table className="w-full text-left">
            <thead className="text-slate-300 border-b border-slate-700">
              <tr>
                <th className="py-2">Nombre</th>
                <th>Estado</th>
                <th>Tamaño</th>
                <th>Progreso</th>
                <th>Grupos</th>
                <th>Errores</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.content.map((file) => (
                <tr key={file.id} className="border-b border-slate-800">
                  <td className="py-2">{file.name}</td>
                  <td>{file.status === "COMPLETE" ? "Completo" : "Activo"}</td>
                  <td>
                    {file.rows} × {file.cols}
                  </td>
                  <td>{Math.round(file.progress.overall * 100)} %</td>
                  <td>
                    {file.refinedGroups} / {file.totalGroups}
                  </td>
                  <td>{file.mistakes}</td>
                  <td>
                    <Link to={`/files/${file.id}/refine`} className="text-teal-300 underline">
                      Refinar <span className="sr-only">{file.name}</span>
                    </Link>
                  </td>
                </tr>
              ))}
              {data.content.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-slate-400">
                    No hay archivos con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <nav aria-label="Paginación" className="flex gap-3 items-center">
            <button
              disabled={page <= 0}
              onClick={() => update({ page: String(page - 1) })}
              className="px-3 py-1 rounded bg-slate-700 disabled:opacity-40"
            >
              Anterior
            </button>
            <span>
              Página {data.page + 1} de {Math.max(1, data.totalPages)} · {data.totalElements} archivos
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
