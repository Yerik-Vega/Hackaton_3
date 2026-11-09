import type { ReactNode } from "react";

// Pantalla centrada para mensajes de carga/estado
export function FullScreen({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="min-h-screen flex flex-col gap-4 items-center justify-center text-slate-200 p-6">
      {children}
    </div>
  );
}
