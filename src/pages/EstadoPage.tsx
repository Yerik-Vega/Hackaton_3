import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { errorMessage, request } from "../lib/api";
import { ApiError } from "../lib/api";
import { BUILD, SUPABASE_KEY, SUPABASE_URL } from "../lib/config";

interface StorageCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

// Registrar Supabase en Lumon (PUT /integrations/storage): el backend lo prueba de verdad
function StorageSection({ onDone }: { onDone: () => void }) {
  const [checks, setChecks] = useState<StorageCheck[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function register() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await request<{ checks: StorageCheck[] }>("/integrations/storage", {
        method: "PUT",
        body: { provider: "SUPABASE", projectUrl: SUPABASE_URL, bucket: "lumon-media", publicKey: SUPABASE_KEY },
      });
      setChecks(res.checks);
      setMsg("Storage verificado ✔");
      onDone();
    } catch (err) {
      const details = err instanceof ApiError ? (err.details as { checks?: StorageCheck[] } | null) : null;
      setChecks(details?.checks ?? []);
      setMsg(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Storage (Supabase)</h2>
      <p className="text-sm text-slate-300">Proyecto: {SUPABASE_URL || "falta VITE_SUPABASE_URL"}</p>
      <button
        onClick={register}
        disabled={busy || !SUPABASE_URL || !SUPABASE_KEY}
        className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
      >
        {busy ? "Probando…" : "Registrar y verificar storage"}
      </button>
      {msg && <p className="text-sm">{msg}</p>}
      <ul className="list-disc pl-6 text-sm">
        {checks.map((c) => (
          <li key={c.name}>
            {c.passed ? "✔" : "✖"} {c.name} {c.detail ?? ""}
          </li>
        ))}
      </ul>
    </section>
  );
}
import type { ClearanceCheckResult, DeployChallenge, IntegrationStatus } from "../lib/types";

interface RosterMember {
  name: string;
  code: string;
}
interface Roster {
  members: RosterMember[];
  complete: boolean;
  locked: boolean;
}

// Integrantes del equipo (los mismos de hackathon.json)
const DEFAULT_ROSTER: RosterMember[] = [
  { name: "Treicy Calsina", code: "202520007" },
  { name: "Mathias Alonso", code: "202210384" },
  { name: "Yerik Vega", code: "202520144" },
];

// Inscribir a los 3 integrantes para los sorteos de las rondas (PUT /team/roster)
function RosterSection() {
  const { can } = useAuth();
  const [roster, setRoster] = useState<Roster | null>(null);
  const [members, setMembers] = useState<RosterMember[]>(DEFAULT_ROSTER);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    request<Roster>("/team/roster")
      .then((r) => {
        setRoster(r);
        if (r.members.length === 3) setMembers(r.members);
      })
      .catch((err) => setMsg(errorMessage(err)));
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      setRoster(await request<Roster>("/team/roster", { method: "PUT", body: { members } }));
      setMsg("Roster guardado ✔");
    } catch (err) {
      setMsg(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const update = (i: number, field: keyof RosterMember, value: string) =>
    setMembers(members.map((m, j) => (j === i ? { ...m, [field]: value } : m)));

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Integrantes (roster)</h2>
      {roster && (
        <p className="text-sm">
          {roster.complete ? "Roster completo ✔" : "Roster incompleto ✖"} {roster.locked && "· bloqueado (ya hubo sorteo)"}
        </p>
      )}
      {members.map((m, i) => (
        <div key={i} className="flex gap-2">
          <label className="sr-only" htmlFor={`name-${i}`}>
            Nombre {i + 1}
          </label>
          <input
            id={`name-${i}`}
            value={m.name}
            onChange={(e) => update(i, "name", e.target.value)}
            className="flex-1 px-3 py-1 rounded bg-slate-800 border border-slate-600"
          />
          <label className="sr-only" htmlFor={`code-${i}`}>
            Código {i + 1}
          </label>
          <input
            id={`code-${i}`}
            value={m.code}
            onChange={(e) => update(i, "code", e.target.value)}
            className="w-36 px-3 py-1 rounded bg-slate-800 border border-slate-600"
          />
        </div>
      ))}
      <button
        onClick={save}
        disabled={saving || !can("team:manage") || roster?.locked}
        className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Guardar roster"}
      </button>
      {msg && <p className="text-sm">{msg}</p>}
    </section>
  );
}

// /estado: build desplegado, salud de la API, integraciones, clearance
// y el botón que corre la revisión automática (POST /clearance/check).
export default function EstadoPage() {
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [origin, setOrigin] = useState(window.location.origin);
  const [challenge, setChallenge] = useState<DeployChallenge | null>(null);
  const [deployMsg, setDeployMsg] = useState<string | null>(null);

  const [chaos, setChaos] = useState<0 | 1 | 2>(1);
  const [chaosMsg, setChaosMsg] = useState<string | null>(null);

  const [check, setCheck] = useState<ClearanceCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  async function loadStatus() {
    setStatusError(null);
    try {
      setStatus(await request<IntegrationStatus>("/integrations/status"));
    } catch (err) {
      setStatusError(errorMessage(err));
    }
  }

  useEffect(() => {
    request("/meta/health", { auth: false })
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false));
    loadStatus();
  }, []);

  async function askChallenge() {
    setDeployMsg(null);
    try {
      setChallenge(
        await request<DeployChallenge>("/integrations/deploy/challenge", { method: "POST", body: { origin } }),
      );
    } catch (err) {
      setDeployMsg(errorMessage(err));
    }
  }

  async function verifyDeploy() {
    setDeployMsg(null);
    try {
      await request("/integrations/deploy/verify", { method: "POST" });
      setDeployMsg("Dominio verificado ✔");
      loadStatus();
    } catch (err) {
      setDeployMsg(errorMessage(err));
    }
  }

  async function saveChaos() {
    setChaosMsg(null);
    try {
      await request("/workspace/chaos", { method: "PUT", body: { level: chaos } });
      setChaosMsg(`Caos en nivel ${chaos} ✔`);
    } catch (err) {
      setChaosMsg(errorMessage(err));
    }
  }

  async function runCheck() {
    setChecking(true);
    setCheckError(null);
    try {
      setCheck(await request<ClearanceCheckResult>("/clearance/check", { method: "POST" }));
      loadStatus();
    } catch (err) {
      setCheckError(errorMessage(err));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Estado</h1>

      <section className="space-y-1">
        <h2 className="text-lg font-semibold">General</h2>
        <p>
          Build desplegado: <code className="text-teal-300">{BUILD}</code>
        </p>
        <p>API: {apiOk === null ? "comprobando…" : apiOk ? "responde ✔" : "no responde ✖"}</p>
      </section>

      <section className="space-y-1">
        <h2 className="text-lg font-semibold">Integraciones</h2>
        {statusError && <p className="text-red-300">{statusError}</p>}
        {status && (
          <ul className="list-disc pl-6">
            <li>
              Dominio: {status.deploy.origin ?? "sin verificar"}{" "}
              {status.deploy.verifiedAt ? "✔ verificado" : "✖ no verificado"}
            </li>
            <li>Último build visto: {status.deploy.lastBuildSeen ?? "—"}</li>
            <li>
              Storage: {status.storage.provider ?? "sin configurar"} {status.storage.verifiedAt ? "✔" : "✖"}
            </li>
            <li>Piso de Pruebas: {status.clearance.granted ? "abierto ✔" : "cerrado ✖"}</li>
          </ul>
        )}
      </section>

      <RosterSection />
      <StorageSection onDone={loadStatus} />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Verificar dominio</h2>
        <div className="flex gap-2 flex-wrap">
          <label htmlFor="origin" className="sr-only">
            Origen
          </label>
          <input
            id="origin"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="flex-1 min-w-60 px-3 py-2 rounded bg-slate-800 border border-slate-600"
          />
          <button onClick={askChallenge} className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600">
            1. Pedir token
          </button>
          <button onClick={verifyDeploy} className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600">
            2. Verificar
          </button>
        </div>
        {challenge && (
          <p className="text-sm">
            Publica este token en <code>public{challenge.wellKnownPath}</code>, haz deploy y luego verifica:{" "}
            <code className="text-amber-300 break-all">{challenge.token}</code>
          </p>
        )}
        {deployMsg && <p className="text-sm">{deployMsg}</p>}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Modo caos (para probar)</h2>
        <div className="flex gap-2 items-center">
          <label htmlFor="chaos">Nivel</label>
          <select
            id="chaos"
            value={chaos}
            onChange={(e) => setChaos(Number(e.target.value) as 0 | 1 | 2)}
            className="px-3 py-2 rounded bg-slate-800 border border-slate-600"
          >
            <option value={0}>0 · sin caos</option>
            <option value={1}>1 · evaluación</option>
            <option value={2}>2 · agresivo</option>
          </select>
          <button onClick={saveChaos} className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600">
            Aplicar
          </button>
        </div>
        {chaosMsg && <p className="text-sm">{chaosMsg}</p>}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Revisión automática</h2>
        <button
          onClick={runCheck}
          disabled={checking}
          className="px-4 py-2 rounded bg-teal-700 hover:bg-teal-600 disabled:opacity-50"
        >
          {checking ? "Revisando…" : "Abrir el Piso de Pruebas"}
        </button>
        {checkError && <p className="text-red-300">{checkError}</p>}
        {check && (
          <div>
            <p>{check.granted ? "Piso de Pruebas abierto ✔" : "Todavía no ✖"}</p>
            <ul className="list-disc pl-6">
              {check.checks.map((c) => (
                <li key={c.name}>
                  {c.passed ? "✔" : "✖"} {c.name}: {c.detail}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
