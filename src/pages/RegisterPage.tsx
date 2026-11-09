import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../lib/api";

type Field = "teamName" | "email" | "password";
type FieldErrors = Partial<Record<Field | "_", string>>;

// Convierte el error del servidor en errores por campo:
// - 400 VALIDATION_ERROR -> details.fields { campo: mensaje }
// - 409 EMAIL_TAKEN / TEAM_NAME_TAKEN -> details.field
function toFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ApiError)) return { _: "No se pudo registrar." };
  const details = error.details as { fields?: Record<string, string>; field?: string } | null;
  if (details?.fields) return details.fields;
  if (details?.field) return { [details.field]: error.message };
  return { _: error.message };
}

export default function RegisterPage() {
  const { status, register } = useAuth();
  const [values, setValues] = useState({ teamName: "", email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  if (status === "authenticated") return <Navigate to="/files" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await register(values.teamName, values.email, values.password); // entra directo con la sesión
    } catch (err) {
      setErrors(toFieldErrors(err));
    } finally {
      setLoading(false);
    }
  }

  const fields: { name: Field; label: string; type: string; autoComplete: string }[] = [
    { name: "teamName", label: "Nombre de la cuadrilla", type: "text", autoComplete: "organization" },
    { name: "email", label: "Email", type: "email", autoComplete: "email" },
    { name: "password", label: "Contraseña (mín. 8)", type: "password", autoComplete: "new-password" },
  ];

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 bg-slate-900 p-6 rounded-lg" noValidate>
        <h1 className="text-2xl font-bold text-teal-300">Registrar cuadrilla</h1>
        {fields.map((field) => (
          <div key={field.name} className="space-y-1">
            <label htmlFor={field.name} className="block text-sm">
              {field.label}
            </label>
            <input
              id={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              value={values[field.name]}
              onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
              aria-invalid={errors[field.name] ? true : undefined}
              aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600"
            />
            {errors[field.name] && (
              <p id={`${field.name}-error`} className="text-red-300 text-sm">
                {errors[field.name]}
              </p>
            )}
          </div>
        ))}
        {errors._ && (
          <p role="alert" className="text-red-300 text-sm">
            {errors._}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded bg-teal-700 hover:bg-teal-600 disabled:opacity-50"
        >
          {loading ? "Registrando…" : "Registrar y entrar"}
        </button>
        <p className="text-sm text-slate-300">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-teal-300 underline">
            Entrar
          </Link>
        </p>
      </form>
    </main>
  );
}
