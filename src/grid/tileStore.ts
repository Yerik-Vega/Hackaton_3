// Caché de bloques (tiles) de la grilla.
// - La grilla NUNCA se descarga entera: se piden solo los bloques que hacen falta (índices desde 0).
// - Nunca hay dos requests en vuelo para el mismo bloque.
// - Se cancelan (AbortController) los bloques que salieron de la vista antes de responder.
// - Respeta 429: no pide NADA hasta que pase Retry-After. Los 503 los reintenta request() con backoff.
import { ApiError, request } from "../lib/api";
import { sleep } from "../lib/sleep";
import type { Bin, Tile } from "../lib/types";

export interface CellInfo {
  digit: number;
  tremor: number;
  bin: string; // "." sin refinar, o W/F/D/M
}

interface LoadedTile {
  originRow: number;
  originCol: number;
  cols: number;
  values: string;
  tremor: Uint8Array;
  bins: string[];
  version: number;
}

interface InFlight {
  controller: AbortController;
  promise: Promise<void>;
}

const BIN_LETTER: Record<Bin, string> = { WO: "W", FC: "F", DR: "D", MA: "M" };

const tileKey = (tileRow: number, tileCol: number) => `${tileRow}:${tileCol}`;

// --- Estado compartido por TODA la sesión (aunque se cambie de archivo o se vuelva a entrar) ---
// 429: el límite es por sesión, así que la espera de Retry-After también.
let blockedUntil = 0;
// Un bloque cancelado en el navegador puede seguir "en vuelo" en el servidor (latencia del caos).
// Para no tener NUNCA dos requests en vuelo del mismo bloque, no se vuelve a pedir hasta que pase este tiempo.
const ABORT_COOLDOWN_MS = 5000;
const recentlyAborted = new Map<string, number>(); // "fileId:tr:tc" -> hora en que se canceló

// tremor viene en base64: un byte (0..100) por celda
function decode(tile: Tile): LoadedTile {
  const raw = atob(tile.tremor);
  const tremor = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) tremor[i] = raw.charCodeAt(i);
  return {
    originRow: tile.originRow,
    originCol: tile.originCol,
    cols: tile.cols,
    values: tile.values,
    tremor,
    bins: tile.bins.split(""),
    version: tile.version,
  };
}

export class TileStore {
  readonly fileId: number;
  readonly tileSize: number;
  requested = 0; // bloques pedidos (se muestra en pantalla)

  private tiles = new Map<string, LoadedTile>();
  private inFlight = new Map<string, InFlight>();
  private pinned = new Set<string>(); // bloques que necesita el BFS: no se cancelan
  private retryTimer: number | undefined;
  private retryAt = 0;
  private onChange: () => void;

  constructor(fileId: number, tileSize: number, onChange: () => void) {
    this.fileId = fileId;
    this.tileSize = tileSize;
    this.onChange = onChange;
  }

  // Dígito, temblor y caja de una celda global (r, c). null si su bloque no está cargado.
  cell(r: number, c: number): CellInfo | null {
    const tile = this.tiles.get(tileKey(Math.floor(r / this.tileSize), Math.floor(c / this.tileSize)));
    if (!tile) return null;
    const i = (r - tile.originRow) * tile.cols + (c - tile.originCol);
    return { digit: tile.values.charCodeAt(i) - 48, tremor: tile.tremor[i], bin: tile.bins[i] };
  }

  // Llamado por la grilla con los bloques visibles: pide los que faltan y cancela los que
  // quedaron lejos de la vista (a más de un bloque de distancia).
  sync(needed: Array<[number, number]>): void {
    if (needed.length === 0) return;
    const minTr = Math.min(...needed.map(([tr]) => tr)) - 1;
    const maxTr = Math.max(...needed.map(([tr]) => tr)) + 1;
    const minTc = Math.min(...needed.map(([, tc]) => tc)) - 1;
    const maxTc = Math.max(...needed.map(([, tc]) => tc)) + 1;
    for (const [key, flight] of this.inFlight) {
      const [tr, tc] = key.split(":").map(Number);
      const near = tr >= minTr && tr <= maxTr && tc >= minTc && tc <= maxTc;
      if (!near && !this.pinned.has(key)) this.cancel(key, flight);
    }
    for (const [tr, tc] of needed) void this.load(tr, tc);
  }

  // Cuánto falta para poder pedir este bloque (por 429 o porque se canceló hace poco)
  private waitTime(key: string): number {
    const abortedAt = recentlyAborted.get(`${this.fileId}:${key}`) ?? 0;
    return Math.max(blockedUntil - Date.now(), abortedAt + ABORT_COOLDOWN_MS - Date.now(), 0);
  }

  private cancel(key: string, flight: InFlight): void {
    flight.controller.abort();
    recentlyAborted.set(`${this.fileId}:${key}`, Date.now());
  }

  load(tileRow: number, tileCol: number): Promise<void> {
    const key = tileKey(tileRow, tileCol);
    if (this.tiles.has(key)) return Promise.resolve();
    const existing = this.inFlight.get(key);
    if (existing && !existing.controller.signal.aborted) return existing.promise; // ya está en vuelo

    const wait = this.waitTime(key);
    if (wait > 0) {
      this.scheduleRetry(wait); // esperar Retry-After o el enfriamiento tras cancelar
      return Promise.resolve();
    }

    const controller = new AbortController();
    const entry: InFlight = { controller, promise: Promise.resolve() };
    this.requested++;
    entry.promise = request<Tile>(`/files/${this.fileId}/tiles/${tileRow}/${tileCol}`, {
      signal: controller.signal,
      retryNetworkErrors: false, // el servidor podría seguir procesándolo: no duplicar
    })
      .then((tile) => {
        const old = this.tiles.get(key);
        if (old && old.version > tile.version) return; // una respuesta vieja no pisa a una nueva
        this.tiles.set(key, decode(tile));
        this.onChange();
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 429) {
          blockedUntil = Date.now() + (error.retryAfter ?? 1) * 1000;
          this.scheduleRetry(blockedUntil - Date.now());
        } else if (!controller.signal.aborted) {
          // corte de red u otro error: reintentar después del enfriamiento (sin duplicar en vuelo)
          recentlyAborted.set(`${this.fileId}:${key}`, Date.now());
          this.scheduleRetry(ABORT_COOLDOWN_MS);
        }
      })
      .finally(() => {
        if (this.inFlight.get(key) === entry) this.inFlight.delete(key);
      });
    this.inFlight.set(key, entry);
    return entry.promise;
  }

  // Para el BFS: espera hasta tener el bloque (respetando 429).
  async ensure(tileRow: number, tileCol: number): Promise<void> {
    const key = tileKey(tileRow, tileCol);
    this.pinned.add(key);
    try {
      for (let i = 0; i < 8 && !this.tiles.has(key); i++) {
        const wait = this.waitTime(key);
        if (wait > 0) await sleep(wait + 50);
        await this.load(tileRow, tileCol);
      }
    } finally {
      this.pinned.delete(key);
    }
    if (!this.tiles.has(key)) throw new Error("No se pudo cargar un bloque del grupo. Intenta de nuevo.");
  }

  // Tras refinar: marcar la celda con su caja sin volver a pedir la grilla
  setBin(r: number, c: number, bin: Bin): void {
    const tile = this.tiles.get(tileKey(Math.floor(r / this.tileSize), Math.floor(c / this.tileSize)));
    if (!tile) return;
    tile.bins[(r - tile.originRow) * tile.cols + (c - tile.originCol)] = BIN_LETTER[bin];
  }

  // Ante 409 ALREADY_REFINED: volver a pedir los bloques afectados
  reload(tileRow: number, tileCol: number): void {
    this.tiles.delete(tileKey(tileRow, tileCol));
    void this.load(tileRow, tileCol);
  }

  abortAll(): void {
    for (const [key, flight] of this.inFlight) this.cancel(key, flight);
    window.clearTimeout(this.retryTimer);
  }

  // Programa un nuevo sync() cuando termine la espera (se queda con la espera más corta)
  private scheduleRetry(ms: number): void {
    const at = Date.now() + ms + 50;
    if (this.retryTimer !== undefined && this.retryAt <= at) return;
    window.clearTimeout(this.retryTimer);
    this.retryAt = at;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = undefined;
      this.onChange(); // la grilla vuelve a llamar a sync()
    }, ms + 50);
  }
}
