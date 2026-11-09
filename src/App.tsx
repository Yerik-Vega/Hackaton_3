// Fase 0: "hola mundo" para desplegar y verificar el dominio lo antes posible.
export default function App() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Lumon MDR</h1>
      <p className="text-slate-400">Build: {__BUILD_SHA__}</p>
    </main>
  );
}
