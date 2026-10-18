import type { ClientEvent, ServerEvent, SessionMode } from "../protocol";

export type DemoTrigger = "pause" | "safety" | "error" | "skip";

export interface TutorTransport {
  readonly kind: "mock" | "websocket";
  /** Opens a session (POST /sessions, then the live channel). */
  start(mode: SessionMode, onEvent: (event: ServerEvent) => void): Promise<void>;
  send(event: ClientEvent): void;
  close(): void;
  /** Mock only: fires scripted edge cases so a demo can show every screen. */
  demo?(trigger: DemoTrigger): void;
}
