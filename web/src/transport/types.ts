import type { PuzzleTemplate } from "../content/types";
import type { ClientEvent, ServerEvent, SessionMode } from "../protocol";

/** "interest" cycles the puzzle skin; a template name opens that puzzle. */
export type DemoTrigger = "pause" | "safety" | "error" | "skip" | "interest" | PuzzleTemplate;

export interface TutorTransport {
  readonly kind: "mock" | "websocket";
  /** Opens a session (POST /sessions, then the live channel). */
  start(mode: SessionMode, onEvent: (event: ServerEvent) => void): Promise<void>;
  send(event: ClientEvent): void;
  close(): void;
  /** Mock only: fires scripted edge cases so a demo can show every screen. */
  demo?(trigger: DemoTrigger): void;
}
