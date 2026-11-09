import { Link } from "react-router";

export default function NoPermissionPage({ permission }: { permission: string }) {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Sin permiso</h1>
      <p className="text-slate-300">
        Tu rol no tiene el permiso <code className="text-amber-300">{permission}</code> para ver esta página.
      </p>
      <Link to="/estado" className="inline-block px-4 py-2 rounded bg-slate-700 hover:bg-slate-600">
        Ir a Estado
      </Link>
    </div>
  );
}
