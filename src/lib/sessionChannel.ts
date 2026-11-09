// Canal entre pestañas del mismo navegador (BroadcastChannel).
// - "token":  otra pestaña renovó/inició sesión y comparte el access token nuevo.
// - "logout": otra pestaña cerró sesión (o la sesión se revocó) -> todas vuelven al login.
export type SessionMessage =
  | { type: "token"; accessToken: string }
  | { type: "logout"; reason: string };

const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("lumon-session") : null;

export function broadcast(msg: SessionMessage): void {
  channel?.postMessage(msg);
}

export function onSessionMessage(callback: (msg: SessionMessage) => void): () => void {
  if (!channel) return () => {};
  const handler = (event: MessageEvent<SessionMessage>) => callback(event.data);
  channel.addEventListener("message", handler);
  return () => channel.removeEventListener("message", handler);
}
