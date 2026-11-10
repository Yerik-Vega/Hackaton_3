// /refiners/:id/badge — editor de fotocheck (versión mínima)
// Flujo: recortar -> 512x512 WebP sin metadatos -> SHA-256 -> ticket -> subir al storage (con progreso)
//        -> confirmar -> PATCH del expediente con If-Match (Regla de Milchick)
import { useEffect, useRef, useState, type DragEvent } from "react";
import { Link, useParams } from "react-router";
import { ApiError, errorMessage, request } from "../lib/api";
import { SUPABASE_KEY, SUPABASE_URL } from "../lib/config";

interface MediaTicket {
  ticketId: string;
  objectPath?: string;
}
interface Media {
  mediaId: number;
  url: string;
}

const MAX_BYTES = 120 * 1024;

// Recorte cuadrado centrado a 512x512 y WebP. Dibujar en <canvas> y exportar genera un archivo
// NUEVO: sin EXIF/XMP/ubicación. Se baja la calidad hasta quedar bajo 120 KB.
async function toBadgeWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("El navegador no permite usar canvas.");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 512, 512);
  for (const quality of [0.85, 0.7, 0.55, 0.4, 0.3]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob || blob.type !== "image/webp") throw new Error("Tu navegador no puede generar imágenes WebP.");
    if (blob.size <= MAX_BYTES) return blob;
  }
  throw new Error("No se pudo dejar la imagen bajo 120 KB.");
}

async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function BadgePage() {
  const { id } = useParams();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [pendingMediaId, setPendingMediaId] = useState<number | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Pegar una imagen desde el portapapeles
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const pasted = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (pasted) choose(pasted);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  function choose(f: File) {
    setFile(f);
    setResult(null);
    setStatus(null);
    setProgress(0);
    setPreview(URL.createObjectURL(f));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const dropped = [...e.dataTransfer.files].find((f) => f.type.startsWith("image/"));
    if (dropped) choose(dropped);
  }

  // Subida con XMLHttpRequest: fetch no da el progreso de subida
  function upload(url: string, blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open("POST", url);
      xhr.setRequestHeader("apikey", SUPABASE_KEY);
      if (!SUPABASE_KEY.startsWith("sb_")) xhr.setRequestHeader("Authorization", `Bearer ${SUPABASE_KEY}`);
      xhr.setRequestHeader("Content-Type", "image/webp");
      xhr.setRequestHeader("x-upsert", "false");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(e.loaded / e.total);
      };
      xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`El storage respondió ${xhr.status}`)));
      xhr.onerror = () => reject(new Error("Error de red al subir"));
      xhr.onabort = () => reject(new Error("Subida cancelada"));
      xhr.send(blob);
    });
  }

  // Regla de Milchick: leer el expediente (ETag) y guardar con If-Match. Nunca If-Match: *.
  async function saveBadge(mediaId: number) {
    let etag = "";
    await request(`/refiners/${id}`, { onHeaders: (h) => (etag = h.get("ETag") ?? "") });
    await request(`/refiners/${id}`, { method: "PATCH", body: { badgeMediaId: mediaId }, headers: { "If-Match": etag } });
  }

  async function run() {
    if (!file) return;
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      setStatus("Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_KEY.");
      return;
    }
    setBusy(true);
    setStatus("Preparando imagen…");
    setProgress(0);
    try {
      const blob = await toBadgeWebp(file);
      const sha256 = await sha256Hex(blob);
      setStatus("Pidiendo permiso (ticket)…");
      const ticket = await request<MediaTicket>("/media/tickets", {
        method: "POST",
        body: { purpose: "BADGE", contentType: "image/webp", bytes: blob.size, sha256, width: 512, height: 512 },
      });
      setStatus("Subiendo…");
      await upload(`${SUPABASE_URL}/storage/v1/object/lumon-media/${ticket.objectPath}`, blob);
      setStatus("Confirmando…");
      const media = await request<Media>(`/media/tickets/${ticket.ticketId}/confirm`, {
        method: "POST",
        body: { url: `${SUPABASE_URL}/storage/v1/object/public/lumon-media/${ticket.objectPath}` },
      });
      setPendingMediaId(media.mediaId);
      await saveBadge(media.mediaId);
      setPendingMediaId(null);
      setResult(media.url);
      setStatus("Fotocheck actualizado ✔");
    } catch (err) {
      if (err instanceof ApiError && err.status === 412) {
        setStatus("El expediente cambió mientras subías (412). Revisa y pulsa 'Guardar de nuevo' para usar la versión nueva.");
      } else {
        setStatus(errorMessage(err));
      }
    } finally {
      setBusy(false);
      xhrRef.current = null;
    }
  }

  async function retrySave() {
    if (pendingMediaId === null) return;
    setBusy(true);
    try {
      await saveBadge(pendingMediaId);
      setPendingMediaId(null);
      setStatus("Fotocheck actualizado ✔");
    } catch (err) {
      setStatus(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold">Fotocheck del expediente #{id}</h1>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="p-6 border-2 border-dashed border-slate-600 rounded space-y-2"
      >
        <label htmlFor="badge-file" className="block">
          Elige una imagen, arrástrala aquí o pégala (Ctrl+V)
        </label>
        <input id="badge-file" type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && choose(e.target.files[0])} />
      </div>
      {preview && (
        <img src={preview} alt="Vista previa (se recorta al centro en cuadrado)" width={256} height={256} className="w-64 h-64 object-cover rounded" />
      )}
      <div className="flex gap-2">
        <button onClick={run} disabled={!file || busy} className="px-4 py-2 rounded bg-teal-700 hover:bg-teal-600 disabled:opacity-50">
          {status && !busy && !result ? "Reintentar" : "Subir fotocheck"}
        </button>
        <button onClick={() => xhrRef.current?.abort()} disabled={!busy} className="px-4 py-2 rounded bg-slate-700 disabled:opacity-50">
          Cancelar
        </button>
        {pendingMediaId !== null && !busy && (
          <button onClick={retrySave} className="px-4 py-2 rounded bg-amber-700">
            Guardar de nuevo
          </button>
        )}
      </div>
      <progress value={progress} max={1} className="w-full" aria-label="Progreso de la subida" />
      {status && <p role="status">{status}</p>}
      {result && <img src={result} alt="Fotocheck nuevo" width={128} height={128} className="w-32 h-32 rounded" />}
      <Link to="/refiners" className="underline">
        Volver a expedientes
      </Link>
    </div>
  );
}
