import type { ClientEvent, ServerEvent, SessionMode } from "../protocol";
import type { TutorTransport } from "./types";

// Talks to Platy's own server only (P-2, P-11). `baseUrl` is same-origin in production.
// Fail closed (P-3): any socket error or close ends the session with an error event,
// with no retry and no fallback.
export class WebSocketTransport implements TutorTransport {
  readonly kind = "websocket";
  private socket: WebSocket | null = null;
  private closedByUs = false;

  constructor(private readonly baseUrl: string) {}

  async start(mode: SessionMode, onEvent: (event: ServerEvent) => void): Promise<void> {
    const res = await fetch(new URL("/sessions", this.baseUrl), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    if (!res.ok) {
      onEvent({ type: "error", code: `start_${res.status}` });
      return;
    }
    const { session_id } = (await res.json()) as { session_id: string };
    const wsUrl = new URL(`/sessions/${encodeURIComponent(session_id)}/live`, this.baseUrl);
    wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";

    const socket = new WebSocket(wsUrl);
    this.socket = socket;
    socket.onmessage = (msg) => onEvent(JSON.parse(String(msg.data)) as ServerEvent);
    socket.onerror = () => onEvent({ type: "error", code: "socket_error" });
    socket.onclose = () => {
      if (!this.closedByUs) onEvent({ type: "error", code: "socket_closed" });
    };
  }

  send(event: ClientEvent): void {
    this.socket?.send(JSON.stringify(event));
  }

  close(): void {
    this.closedByUs = true;
    this.socket?.close();
    this.socket = null;
  }
}
