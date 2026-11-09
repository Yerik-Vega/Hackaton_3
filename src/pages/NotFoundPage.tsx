import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-3xl font-bold">404 · Esta sala no existe</h1>
      <p className="text-slate-300">La página que buscas no está en el piso separado.</p>
      <Link to="/files" className="inline-block px-4 py-2 rounded bg-teal-700 hover:bg-teal-600">
        Ir a los archivos
      </Link>
    </main>
  );
}
