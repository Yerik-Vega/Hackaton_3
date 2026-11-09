import { Component, type ReactNode } from "react";

// Si una ruta falla al renderizar, mostramos un error con opción de volver
// (en vez de dejar la app en blanco). Los Error Boundaries solo existen como clase.
interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="p-8 space-y-4">
          <h1 className="text-xl font-bold">Algo salió mal en esta página</h1>
          <p className="text-slate-400">{this.state.error.message}</p>
          <a href="/files" className="inline-block px-4 py-2 rounded bg-teal-700 hover:bg-teal-600">
            Volver a los archivos
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}
