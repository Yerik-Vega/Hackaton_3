// Espera `ms` milisegundos. Si se aborta la señal, deja de esperar.
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

// Espera creciente (backoff exponencial con un poco de azar = "jitter").
// Si el servidor mandó Retry-After (segundos), se respeta ese valor.
export function backoffMs(attempt: number, retryAfterSeconds: number | null = null): number {
  if (retryAfterSeconds !== null && retryAfterSeconds > 0) return retryAfterSeconds * 1000;
  return Math.min(10_000, 500 * 2 ** attempt) + Math.random() * 250;
}
