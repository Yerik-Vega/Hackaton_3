// /files/:id/refine — Macrodata Refinement (CP2)
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { Grid } from "../grid/Grid";
import { findGroup, type Group } from "../grid/group";
import { TileStore } from "../grid/tileStore";
import { ApiError, errorMessage, request } from "../lib/api";
import { BINS, type Bin, type LumonFile, type RefineResult, type Rules } from "../lib/types";

// key={id}: si cambia el archivo, todo el estado (caché, selección…) empieza de cero
export default function RefinePage() {
  const { id } = useParams();
  return <RefineView key={id} fileId={Number(id)} />;
}

// ?r=&c= de la URL -> índice válido (una URL inválida no rompe la vista)
function toIndex(value: string | null, size: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? Math.min(n, size - 1) : 0;
}

// Mensajes accionables para los errores del refinamiento
function explainRefineError(error: unknown): string {
  if (!(error instanceof ApiError)) return errorMessage(error);
  const d = error.details as {
    reason?: string;
    missing?: number;
    mistakes?: number;
    holder?: { displayName?: string };
  } | null;
  switch (error.code) {
    case "GROUP_INVALID":
      if (d?.reason === "INCOMPLETE") return `El grupo está incompleto (faltan ${d.missing ?? "algunas"} celdas). Vuelve a seleccionarlo.`;
      if (d?.reason === "NOT_CONNECTED") return "Las celdas no forman un solo grupo. Vuelve a seleccionarlo.";
      if (d?.reason === "BELOW_THRESHOLD") return "El grupo incluye celdas que no dan miedo. Vuelve a seleccionarlo.";
      if (d?.reason === "SIZE_OUT_OF_RANGE") return "Ese grupo es ruido (tamaño fuera de rango): no se puede refinar.";
      return error.message;
    case "WRONG_BIN":
      return `Caja equivocada: Lumon lo anotó (errores: ${d?.mistakes ?? "?"}). Usa la caja sugerida por las reglas.`;
    case "ALREADY_REFINED":
      return "Ese grupo ya estaba refinado (quizá por otro refinador). Actualicé los bloques.";
    case "GROUP_CLAIMED":
      return `${d?.holder?.displayName ?? "Otro refinador"} tiene reservado este grupo. Prueba con otro.`;
    case "FORBIDDEN":
      return "Tu rol no tiene permiso para refinar.";
    default:
      return `${errorMessage(error)}. Puedes reintentar: no se refinará dos veces.`;
  }
}

function RefineView({ fileId }: { fileId: number }) {
  const { can } = useAuth();
  const canRefine = can("files:refine");
  const [params, setParams] = useSearchParams();

  const [file, setFile] = useState<LumonFile | null>(null);
  const [rules, setRules] = useState<Rules | null>(null);
  const [store, setStore] = useState<TileStore | null>(null);
  const [version, setVersion] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [selection, setSelection] = useState<Group | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [drag, setDrag] = useState<{ x: number; y: number; over: Bin | null } | null>(null);

  const submittingRef = useRef(false); // bloqueo inmediato contra doble clic / doble Enter
  const intentRef = useRef<{ groupKey: string; bin: Bin; key: string } | null>(null);
  const selectSeq = useRef(0); // para ignorar búsquedas de grupo viejas

  // Cargar el archivo y SUS reglas (cambian por archivo: nada hardcodeado)
  useEffect(() => {
    if (!Number.isInteger(fileId) || fileId <= 0) {
      setLoadError("El identificador del archivo no es válido.");
      return;
    }
    const controller = new AbortController();
    setLoadError(null);
    Promise.all([
      request<LumonFile>(`/files/${fileId}`, { signal: controller.signal }),
      request<Rules>(`/files/${fileId}/rules`, { signal: controller.signal }),
    ])
      .then(([f, r]) => {
        setFile(f);
        setRules(r);
        setStore(new TileStore(fileId, f.tileSize, () => setVersion((v) => v + 1)));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setLoadError(err instanceof ApiError && err.status === 404 ? "Este archivo no existe." : errorMessage(err));
      });
    return () => controller.abort();
  }, [fileId, reloadKey]);

  // Al salir de la grilla: cancelar los bloques en vuelo
  useEffect(() => () => store?.abortAll(), [store]);

  const selectedKeys = useMemo(
    () => new Set<string>(selection?.cells.map((cell) => `${cell.r}:${cell.c}`) ?? []),
    [selection],
  );

  // Clic / Enter en una celda: si da miedo, seleccionar el grupo COMPLETO (aunque cruce bloques)
  async function activate(r: number, c: number) {
    if (!store || !file || !rules) return;
    const info = store.cell(r, c);
    if (!info) {
      setMessage("Ese bloque todavía se está cargando.");
      return;
    }
    if (info.tremor < rules.tremorThreshold) {
      setSelection(null);
      return;
    }
    const seq = ++selectSeq.current;
    setSelecting(true);
    setMessage(null);
    try {
      const group = await findGroup(store, file, rules, r, c);
      if (seq === selectSeq.current) setSelection(group);
    } catch (err) {
      if (seq === selectSeq.current) setMessage(errorMessage(err));
    } finally {
      if (seq === selectSeq.current) setSelecting(false);
    }
  }

  // Llevar el grupo seleccionado a una caja
  async function refine(bin: Bin) {
    const group = selection;
    if (!group || !file || !store || submittingRef.current) return; // doble clic: el segundo se ignora
    if (!canRefine) return setMessage("Tu rol no tiene permiso para refinar.");
    if (group.noise) return setMessage("Ese grupo es ruido: no se puede refinar.");
    if (group.refined) return setMessage("Ese grupo ya está refinado.");
    // Protección: una caja distinta de la que dicen las reglas suma un error (WRONG_BIN) en Lumon
    if (group.bin && bin !== group.bin && !window.confirm(`Según las reglas este grupo va a ${group.bin}. ¿Llevarlo igual a ${bin}? Si es incorrecto, Lumon suma un error.`)) return;

    submittingRef.current = true;
    setSubmitting(true);
    setMessage(null);

    // Regla de Kier: UNA Idempotency-Key por INTENCIÓN (este grupo -> esta caja).
    // Si la red falla o llega 503, request() reintenta con la MISMA key: el backend no refina dos veces.
    if (!intentRef.current || intentRef.current.groupKey !== group.key || intentRef.current.bin !== bin) {
      intentRef.current = { groupKey: group.key, bin, key: crypto.randomUUID() };
    }
    const intent = intentRef.current;

    try {
      const result = await request<RefineResult>(`/files/${file.id}/refinements`, {
        method: "POST",
        body: { bin, cells: group.cells },
        headers: { "Idempotency-Key": intent.key },
        retries: 5,
      });
      intentRef.current = null;
      // Marcar las celdas con su caja SIN volver a pedir la grilla, y usar el progreso del servidor
      group.cells.forEach(({ r, c }) => store.setBin(r, c, bin));
      setFile((f) => (f ? { ...f, ...result.file } : f));
      setSelection(null);
      setMessage(`✔ Grupo de ${result.size} celdas llevado a ${bin}.`);
    } catch (err) {
      setMessage(explainRefineError(err));
      if (err instanceof ApiError) {
        if (["ALREADY_REFINED", "GROUP_INVALID", "WRONG_BIN"].includes(err.code)) intentRef.current = null;
        if (err.code === "ALREADY_REFINED") {
          const tiles = (err.details as { tiles?: Array<[number, number]> } | null)?.tiles ?? [];
          tiles.forEach(([tr, tc]) => store.reload(tr, tc)); // 409: volver a pedir los bloques afectados
          setSelection(null);
        }
        if (err.code === "WRONG_BIN") {
          const mistakes = (err.details as { mistakes?: number } | null)?.mistakes;
          if (mistakes !== undefined) setFile((f) => (f ? { ...f, mistakes } : f));
        }
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  // ---------- Arrastrar el grupo a una caja (Pointer Events, sin librería) ----------
  function binAt(x: number, y: number): Bin | null {
    const value = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-bin]")?.dataset.bin;
    return BINS.find((b) => b === value) ?? null;
  }

  function startDrag(event: ReactPointerEvent) {
    if (!selection || selection.noise || selection.refined || !canRefine) return;
    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;
    const onMove = (e: PointerEvent) => {
      if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < 5) return;
      moved = true;
      setDrag({ x: e.clientX, y: e.clientY, over: binAt(e.clientX, e.clientY) });
    };
    const onUp = (e: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDrag(null);
      if (!moved) return;
      const bin = binAt(e.clientX, e.clientY);
      if (bin) void refine(bin);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // ---------- Render ----------
  if (loadError) {
    return (
      <div role="alert" className="p-6 space-y-3">
        <p className="text-red-300">{loadError}</p>
        <button onClick={() => setReloadKey((k) => k + 1)} className="px-3 py-1 rounded bg-slate-700">
          Reintentar
        </button>{" "}
        <Link to="/files" className="underline">
          Volver a los archivos
        </Link>
      </div>
    );
  }
  if (!file || !rules || !store) return <p role="status" className="p-6">Cargando archivo…</p>;

  if (file.status === "COMPLETE") {
    return (
      <div className="p-8 space-y-4 text-center">
        <h1 className="text-3xl font-bold text-teal-300">Archivo completado</h1>
        <p>
          {file.name}: 100 % refinado · {file.mistakes} errores.
        </p>
        <Link to="/files" className="inline-block px-4 py-2 rounded bg-teal-700 hover:bg-teal-600">
          Volver a los archivos
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      <header className="flex flex-wrap gap-4 items-baseline">
        <h1 className="text-xl font-bold">{file.name}</h1>
        <span>
          {file.rows} × {file.cols}
        </span>
        <span>Progreso: {Math.round(file.progress.overall * 100)} %</span>
        <span>
          Grupos: {file.refinedGroups}/{file.totalGroups}
        </span>
        <span>Errores: {file.mistakes}</span>
        <span className="text-sm text-slate-400">Bloques pedidos: {store.requested}</span>
        <Link to="/files" className="ml-auto underline">
          Volver
        </Link>
      </header>
      <p className="text-sm text-slate-400">
        Reglas: temblor ≥ {rules.tremorThreshold} · conectividad {rules.connectivity} · grupo de {rules.minGroupSize} a{" "}
        {rules.maxGroupSize} · {rules.binning.strategy} → [{rules.binning.order.join(", ")}]
      </p>

      <div className="flex flex-wrap gap-4 items-start">
        <Grid
          file={file}
          rules={rules}
          store={store}
          version={version}
          selected={selectedKeys}
          initialRow={toIndex(params.get("r"), file.rows)}
          initialCol={toIndex(params.get("c"), file.cols)}
          onActivate={activate}
          onDragStart={startDrag}
          onBinKey={(i) => void refine(BINS[i])}
          onPositionChange={(r, c) => setParams({ r: String(r), c: String(c) }, { replace: true })}
        />

        <aside className="w-72 space-y-4">
          <section aria-live="polite" className="space-y-1">
            <h2 className="font-semibold">Grupo seleccionado</h2>
            {selecting ? (
              <p>Buscando el grupo completo…</p>
            ) : selection ? (
              <>
                <p>
                  Tamaño: {selection.size}
                  {selection.tooBig ? "+" : ""} celdas
                </p>
                {selection.noise ? (
                  <p className="text-amber-300">Es ruido: no se puede refinar.</p>
                ) : selection.refined ? (
                  <p>Ya está refinado.</p>
                ) : (
                  <p>
                    Caja según las reglas: <strong className="text-teal-300">{selection.bin}</strong>
                  </p>
                )}
              </>
            ) : (
              <p className="text-slate-400">Haz clic (o Enter) en una celda roja que tiembla.</p>
            )}
          </section>

          <section aria-label="Cajas" className="grid grid-cols-2 gap-2">
            {BINS.map((bin, i) => (
              <button
                key={bin}
                data-bin={bin}
                onClick={() => void refine(bin)}
                disabled={!canRefine || !selection || selection.noise || selection.refined || submitting}
                className={`p-2 rounded border text-left space-y-1 disabled:opacity-60 ${
                  drag?.over === bin ? "border-amber-300 bg-slate-700" : selection?.bin === bin ? "border-teal-400" : "border-slate-600"
                }`}
              >
                <span className="font-bold">{bin}</span> <span className="text-xs text-slate-400">(tecla {i + 1})</span>
                {selection?.bin === bin && !selection.noise && !selection.refined && (
                  <span className="block text-xs text-teal-300">✓ sugerida</span>
                )}
                <progress className="w-full" value={file.progress[bin]} max={1} aria-label={`Progreso de ${bin}`} />
                <span className="text-xs">{Math.round(file.progress[bin] * 100)} %</span>
              </button>
            ))}
          </section>
          {!canRefine && <p className="text-sm text-amber-300">Tu rol solo puede ver la grilla.</p>}
          {submitting && <p role="status">Refinando…</p>}
          {message && <p role="status">{message}</p>}
          <p className="text-xs text-slate-400">
            Teclado: flechas, PageUp/PageDown, Home/End para moverte · Enter selecciona el grupo · 1–4 lo lleva a
            WO/FC/DR/MA. También puedes arrastrar el grupo (amarillo) a una caja.
          </p>
        </aside>
      </div>

      {drag && (
        <div
          className="fixed z-50 pointer-events-none px-2 py-1 rounded bg-amber-400 text-black text-sm"
          style={{ left: drag.x + 12, top: drag.y + 12 }}
        >
          Grupo de {selection?.size} {drag.over ? `→ ${drag.over}` : ""}
        </div>
      )}
    </div>
  );
}
