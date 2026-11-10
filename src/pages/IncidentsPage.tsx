// /incidents (lista) y /incidents/new (reporte con 1 a 3 fotos subidas en paralelo)
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { errorMessage, request } from "../lib/api";
import { SUPABASE_KEY, SUPABASE_URL } from "../lib/config";

interface Incident {
  id: number;
  title: string;
  description: string;
  severity: string;
  photos: { mediaId: number; url: string; width: number; height: number }[];
}

// Lado mayor 1200 px (entre 800 y 1600), WebP <= 300 KB y sin metadatos (canvas genera un archivo nuevo)
async function toIncidentWebp(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = 1200 / Math.max(bitmap.width, bitmap.height);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  for (const quality of [0.8, 0.6, 0.45, 0.3]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob || blob.type !== "image/webp") throw new Error("Tu navegador no puede generar WebP.");
    if (blob.size <= 300 * 1024) return { blob, width, height };
  }
  throw new Error("No se pudo dejar la foto bajo 300 KB.");
}

async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface Photo {
  file: File;
  progress: number;
  mediaId: number | null;
  error: string | null;
  xhr: XMLHttpRequest | null;
}

export function IncidentNewPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("LOW");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const photosRef = useRef<Photo[]>([]);
  photosRef.current = photos;

  const patch = (i: number, changes: Partial<Photo>) =>
    setPhotos((list) => list.map((p, j) => (j === i ? { ...p, ...changes } : p)));

  // Sube UNA foto: preparar -> ticket -> storage (con progreso) -> confirmar
  async function uploadPhoto(i: number, file: File) {
    patch(i, { progress: 0, error: null, mediaId: null });
    try {
      const { blob, width, height } = await toIncidentWebp(file);
      const sha256 = await sha256Hex(blob);
      const ticket = await request<{ ticketId: string; objectPath?: string }>("/media/tickets", {
        method: "POST",
        body: { purpose: "INCIDENT", contentType: "image/webp", bytes: blob.size, sha256, width, height },
      });
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        patch(i, { xhr });
        xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/lumon-media/${ticket.objectPath}`);
        xhr.setRequestHeader("apikey", SUPABASE_KEY);
        if (!SUPABASE_KEY.startsWith("sb_")) xhr.setRequestHeader("Authorization", `Bearer ${SUPABASE_KEY}`);
        xhr.setRequestHeader("Content-Type", "image/webp");
        xhr.upload.onprogress = (e) => e.lengthComputable && patch(i, { progress: e.loaded / e.total });
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Storage respondió ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Error de red"));
        xhr.onabort = () => reject(new Error("Cancelada"));
        xhr.send(blob);
      });
      const media = await request<{ mediaId: number }>(`/media/tickets/${ticket.ticketId}/confirm`, {
        method: "POST",
        body: { url: `${SUPABASE_URL}/storage/v1/object/public/lumon-media/${ticket.objectPath}` },
      });
      patch(i, { mediaId: media.mediaId, progress: 1, xhr: null });
    } catch (err) {
      patch(i, { error: errorMessage(err), xhr: null });
    }
  }

  function addFiles(files: FileList | null) {
    const chosen = [...(files ?? [])].filter((f) => f.type.startsWith("image/")).slice(0, 3 - photos.length);
    const start = photos.length;
    setPhotos([...photos, ...chosen.map((file) => ({ file, progress: 0, mediaId: null, error: null, xhr: null }))]);
    chosen.forEach((file, k) => void uploadPhoto(start + k, file)); // en paralelo
  }

  const allConfirmed = photos.length > 0 && photos.every((p) => p.mediaId !== null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!allConfirmed) return;
    setSending(true);
    setMsg(null);
    try {
      await request("/incidents", {
        method: "POST",
        body: { title, description, severity, mediaIds: photos.map((p) => p.mediaId) },
      });
      setMsg("Reporte enviado ✔");
      setTitle("");
      setDescription("");
      setPhotos([]);
    } catch (err) {
      setMsg(errorMessage(err)); // el formulario y las fotos confirmadas se conservan
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="p-6 space-y-3 max-w-xl">
      <h1 className="text-2xl font-bold">Nuevo reporte de incidencia</h1>
      <label htmlFor="it" className="block text-sm">Título</label>
      <input id="it" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600" />
      <label htmlFor="id" className="block text-sm">Descripción</label>
      <textarea id="id" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600" />
      <label htmlFor="is" className="block text-sm">Severidad</label>
      <select id="is" value={severity} onChange={(e) => setSeverity(e.target.value)} className="px-3 py-2 rounded bg-slate-800 border border-slate-600">
        {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <label htmlFor="ip" className="block text-sm">Fotos (1 a 3)</label>
      <input id="ip" type="file" accept="image/*" multiple disabled={photos.length >= 3} onChange={(e) => addFiles(e.target.files)} />
      <ul className="space-y-2">
        {photos.map((p, i) => (
          <li key={i} className="space-y-1">
            <span className="text-sm">{p.file.name} {p.mediaId ? "✔ confirmada" : p.error ? `✖ ${p.error}` : ""}</span>
            <progress value={p.progress} max={1} className="w-full" aria-label={`Progreso de ${p.file.name}`} />
            {p.xhr && <button type="button" onClick={() => p.xhr?.abort()} className="text-sm underline">Cancelar</button>}
            {p.error && <button type="button" onClick={() => void uploadPhoto(i, p.file)} className="text-sm underline">Reintentar</button>}
          </li>
        ))}
      </ul>
      <button type="submit" disabled={!allConfirmed || sending || title.length < 3} className="px-4 py-2 rounded bg-teal-700 disabled:opacity-50">
        {sending ? "Enviando…" : "Enviar reporte"}
      </button>
      {msg && <p role="status">{msg}</p>}
    </form>
  );
}

export default function IncidentsPage() {
  const [items, setItems] = useState<Incident[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    request<{ content: Incident[] }>("/incidents?page=0&size=25")
      .then((page) => setItems(page.content))
      .catch((err) => setError(errorMessage(err)));
  }, []);
  return (
    <div className="p-6 space-y-3">
      <h1 className="text-2xl font-bold">Incidencias</h1>
      <Link to="/incidents/new" className="underline text-teal-300">Nuevo reporte</Link>
      {error && <p role="alert" className="text-red-300">{error}</p>}
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.id} className="p-3 rounded bg-slate-900">
            <h2 className="font-semibold">{it.title} · {it.severity}</h2>
            <p className="text-sm text-slate-300">{it.description}</p>
            <div className="flex gap-2">
              {it.photos.map((ph) => (
                <img key={ph.mediaId} src={ph.url} alt={`Foto de ${it.title}`} width={96} height={96} loading="lazy" className="w-24 h-24 object-cover rounded" />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
