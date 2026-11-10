// Encontrar el GRUPO de una celda: componente conexo (BFS) de celdas que dan miedo.
// El grupo puede cruzar varios bloques: si el BFS llega a un bloque sin cargar, se pide y se repite.
import type { Bin, LumonFile, Rules } from "../lib/types";
import type { TileStore } from "./tileStore";

export interface Cell {
  r: number;
  c: number;
}

export interface Group {
  key: string; // identifica al grupo (sus celdas ordenadas)
  cells: Cell[];
  size: number;
  tooBig: boolean; // superó maxGroupSize (se cortó el BFS)
  noise: boolean; // fuera de [minGroupSize, maxGroupSize]: no se puede refinar
  bin: Bin | null; // caja que corresponde según las reglas
  refined: boolean; // ya está en una caja
}

const DIRS_4 = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const DIRS_8 = [...DIRS_4, [-1, -1], [-1, 1], [1, -1], [1, 1]];

function bfs(store: TileStore, file: LumonFile, rules: Rules, startR: number, startC: number) {
  const dirs = rules.connectivity === 8 ? DIRS_8 : DIRS_4;
  const seen = new Set<number>([startR * file.cols + startC]);
  const queue: Cell[] = [{ r: startR, c: startC }];
  const cells: Cell[] = [];
  const missing = new Map<string, [number, number]>(); // bloques que faltan cargar

  while (queue.length > 0) {
    const cell = queue.shift()!;
    cells.push(cell);
    if (cells.length > rules.maxGroupSize) return { cells, missing: [], tooBig: true };

    for (const [dr, dc] of dirs) {
      const r = cell.r + dr;
      const c = cell.c + dc;
      if (r < 0 || c < 0 || r >= file.rows || c >= file.cols) continue;
      const id = r * file.cols + c;
      if (seen.has(id)) continue;
      const info = store.cell(r, c);
      if (!info) {
        const tr = Math.floor(r / store.tileSize);
        const tc = Math.floor(c / store.tileSize);
        missing.set(`${tr}:${tc}`, [tr, tc]);
        continue;
      }
      seen.add(id);
      if (info.tremor >= rules.tremorThreshold) queue.push({ r, c });
    }
  }
  return { cells, missing: [...missing.values()], tooBig: false };
}

// Caja según las reglas del archivo:
//   DIGIT_SUM_MOD: índice = suma de dígitos % 4     MAX_DIGIT_MOD: índice = dígito máximo % 4
//   caja = order[índice]
export function binForDigits(digits: number[], rules: Rules): Bin {
  const index =
    rules.binning.strategy === "DIGIT_SUM_MOD"
      ? digits.reduce((sum, d) => sum + d, 0) % 4
      : Math.max(...digits) % 4;
  return rules.binning.order[index];
}

export async function findGroup(
  store: TileStore,
  file: LumonFile,
  rules: Rules,
  r: number,
  c: number,
): Promise<Group> {
  for (let round = 0; round < 30; round++) {
    const { cells, missing, tooBig } = bfs(store, file, rules, r, c);
    if (tooBig || missing.length === 0) {
      const sorted = [...cells].sort((a, b) => a.r - b.r || a.c - b.c);
      const noise = tooBig || sorted.length < rules.minGroupSize || sorted.length > rules.maxGroupSize;
      const digits = sorted.map((cell) => store.cell(cell.r, cell.c)?.digit ?? 0);
      return {
        key: sorted.map((cell) => `${cell.r}:${cell.c}`).join("|"),
        cells: sorted,
        size: sorted.length,
        tooBig,
        noise,
        bin: noise ? null : binForDigits(digits, rules),
        refined: sorted.every((cell) => store.cell(cell.r, cell.c)?.bin !== "."),
      };
    }
    // Faltan bloques vecinos: pedirlos y repetir el BFS
    await Promise.all(missing.map(([tr, tc]) => store.ensure(tr, tc)));
  }
  throw new Error("No se pudo completar el grupo.");
}
