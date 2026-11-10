// Grilla VIRTUALIZADA hecha a mano (sin librerías):
// el contenedor tiene el tamaño de la grilla completa (rows × cols × CELL) para que el scroll funcione,
// pero solo se renderizan las celdas visibles + un margen (OVERSCAN). Nunca más de ~1 200 celdas en el DOM.
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { LumonFile, Rules } from "../lib/types";
import type { TileStore } from "./tileStore";

export const CELL = 28; // px por celda
const VIEW_W = 1120; // ancho máximo de la vista
const VIEW_H = 560; // alto de la vista
const OVERSCAN = 2; // filas/columnas extra alrededor de lo visible

// Color de las celdas ya refinadas, según su caja
const BIN_CLASS: Record<string, string> = {
  W: "bg-sky-800 text-sky-100",
  F: "bg-emerald-800 text-emerald-100",
  D: "bg-violet-800 text-violet-100",
  M: "bg-rose-800 text-rose-100",
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

interface Props {
  file: LumonFile;
  rules: Rules;
  store: TileStore;
  version: number; // cambia cuando llega un bloque -> re-render
  selected: Set<string>; // celdas del grupo seleccionado ("r:c")
  initialRow: number;
  initialCol: number;
  onActivate: (r: number, c: number) => void; // clic o Enter en una celda
  onDragStart: (event: ReactPointerEvent) => void; // empezar a arrastrar el grupo
  onBinKey: (index: number) => void; // teclas 1-4
  onPositionChange: (r: number, c: number) => void; // para guardar ?r=&c= en la URL
}

export function Grid(props: Props) {
  const { file, rules, store, version, selected } = props;
  const ref = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ top: props.initialRow * CELL, left: props.initialCol * CELL });
  const [focus, setFocus] = useState({ r: props.initialRow, c: props.initialCol });
  const moveDomFocus = useRef(false);

  // Al montar: ir directo a la posición de la URL
  useLayoutEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = props.initialRow * CELL;
    ref.current.scrollLeft = props.initialCol * CELL;
  }, []);

  // Rango visible (+ margen)
  const firstRow = Math.max(0, Math.floor(scroll.top / CELL) - OVERSCAN);
  const lastRow = Math.min(file.rows - 1, Math.floor((scroll.top + VIEW_H) / CELL) + OVERSCAN);
  const firstCol = Math.max(0, Math.floor(scroll.left / CELL) - OVERSCAN);
  const lastCol = Math.min(file.cols - 1, Math.floor((scroll.left + VIEW_W) / CELL) + OVERSCAN);

  // Pedir SOLO los bloques que tocan el rango visible (el store cancela los que salieron de la vista)
  useEffect(() => {
    const size = file.tileSize;
    const needed: Array<[number, number]> = [];
    for (let tr = Math.floor(firstRow / size); tr <= Math.floor(lastRow / size); tr++) {
      for (let tc = Math.floor(firstCol / size); tc <= Math.floor(lastCol / size); tc++) needed.push([tr, tc]);
    }
    store.sync(needed);
  }, [store, file.tileSize, firstRow, lastRow, firstCol, lastCol, version]);

  // Guardar la posición en la URL 300 ms después de dejar de hacer scroll (replace: no llena el historial)
  useEffect(() => {
    const timer = window.setTimeout(
      () => props.onPositionChange(Math.floor(scroll.top / CELL), Math.floor(scroll.left / CELL)),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [scroll.top, scroll.left]);

  // Tras mover el foco con el teclado, enfocar la celda en el DOM
  useEffect(() => {
    if (!moveDomFocus.current) return;
    moveDomFocus.current = false;
    ref.current?.querySelector<HTMLElement>(`[data-r="${focus.r}"][data-c="${focus.c}"]`)?.focus({ preventScroll: true });
  }, [focus]);

  function scrollIntoView(r: number, c: number) {
    const el = ref.current;
    if (!el) return;
    if (r * CELL < el.scrollTop) el.scrollTop = r * CELL;
    else if ((r + 1) * CELL > el.scrollTop + el.clientHeight) el.scrollTop = (r + 1) * CELL - el.clientHeight;
    if (c * CELL < el.scrollLeft) el.scrollLeft = c * CELL;
    else if ((c + 1) * CELL > el.scrollLeft + el.clientWidth) el.scrollLeft = (c + 1) * CELL - el.clientWidth;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let { r, c } = focus;
    const pageRows = Math.floor(VIEW_H / CELL) - 1;
    switch (event.key) {
      case "ArrowUp": r -= 1; break;
      case "ArrowDown": r += 1; break;
      case "ArrowLeft": c -= 1; break;
      case "ArrowRight": c += 1; break;
      case "PageUp": r -= pageRows; break;
      case "PageDown": r += pageRows; break;
      case "Home": c = 0; if (event.ctrlKey) r = 0; break;
      case "End": c = file.cols - 1; if (event.ctrlKey) r = file.rows - 1; break;
      case "Enter":
      case " ":
        event.preventDefault();
        props.onActivate(r, c);
        return;
      case "1":
      case "2":
      case "3":
      case "4":
        props.onBinKey(Number(event.key) - 1);
        return;
      default:
        return;
    }
    event.preventDefault();
    r = clamp(r, 0, file.rows - 1);
    c = clamp(c, 0, file.cols - 1);
    moveDomFocus.current = true;
    setFocus({ r, c });
    scrollIntoView(r, c);
  }

  function renderCell(r: number, c: number) {
    const info = store.cell(r, c);
    const isFocus = focus.r === r && focus.c === c;
    const isSelected = selected.has(`${r}:${c}`);
    const style: Record<string, string | number> = { position: "absolute", left: c * CELL, top: 0, width: CELL, height: CELL };
    let className = "flex items-center justify-center font-mono text-sm focus:outline-2 focus:outline-amber-300 focus:z-10";
    let label: string | undefined;

    if (!info) {
      className += " text-slate-700"; // placeholder del mismo tamaño: el layout no salta
    } else {
      const scary = info.tremor >= rules.tremorThreshold;
      if (isSelected) className += " bg-amber-400 text-black font-bold";
      else if (info.bin !== ".") className += ` ${BIN_CLASS[info.bin]}`;
      else if (scary) {
        // Tiembla más cuanto mayor es su tremor (con reduced motion no se mueve: ver index.css)
        className += " scary text-red-400 font-bold cursor-pointer";
        style["--amp"] = `${0.5 + (2 * (info.tremor - rules.tremorThreshold)) / Math.max(1, 100 - rules.tremorThreshold)}px`;
      } else className += " text-slate-400";
      if (scary) label = `${info.digit}, da miedo`;
    }

    return (
      <div
        key={c}
        role="gridcell"
        aria-colindex={c + 1}
        aria-selected={isSelected}
        aria-label={label}
        tabIndex={isFocus ? 0 : -1}
        data-r={r}
        data-c={c}
        className={className}
        style={style as CSSProperties}
        onClick={() => {
          setFocus({ r, c });
          props.onActivate(r, c);
        }}
        onPointerDown={isSelected ? props.onDragStart : undefined}
      >
        {info ? info.digit : "·"}
      </div>
    );
  }

  // Filas a renderizar: las visibles + la del foco (la celda con foco SIEMPRE está en el DOM)
  const rows: number[] = [];
  for (let r = firstRow; r <= lastRow; r++) rows.push(r);
  if (focus.r < firstRow || focus.r > lastRow) rows.push(focus.r);

  const colsFor = (r: number) => {
    const cols: number[] = [];
    for (let c = firstCol; c <= lastCol; c++) cols.push(c);
    if (r === focus.r && (focus.c < firstCol || focus.c > lastCol)) cols.push(focus.c);
    return cols;
  };

  return (
    <div
      ref={ref}
      role="grid"
      aria-label={`Grilla de ${file.name}`}
      aria-rowcount={file.rows}
      aria-colcount={file.cols}
      onScroll={(e) => setScroll({ top: e.currentTarget.scrollTop, left: e.currentTarget.scrollLeft })}
      onKeyDown={handleKeyDown}
      className="relative overflow-auto border border-slate-700 bg-slate-900 select-none flex-1"
      style={{ maxWidth: VIEW_W, height: VIEW_H, minWidth: 280 }}
    >
      <div role="rowgroup" style={{ position: "relative", width: file.cols * CELL, height: file.rows * CELL }}>
        {rows.map((r) => (
          <div
            key={r}
            role="row"
            aria-rowindex={r + 1}
            style={{ position: "absolute", top: r * CELL, left: 0, height: CELL, width: file.cols * CELL }}
          >
            {colsFor(r).map((c) => renderCell(r, c))}
          </div>
        ))}
      </div>
    </div>
  );
}
