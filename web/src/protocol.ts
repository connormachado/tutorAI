// The session contract between the browser and Platy's server. This is the frontend's
// proposal (see web/README.md) until Connor's backend agrees it. The mock transport and
// the WebSocket transport both speak exactly these events.

export type SessionMode = "onboarding" | "tutoring";

export interface Problem {
  problem_id: string;
  skill_id: string;
  /** LaTeX, rendered with KaTeX. */
  prompt: string;
  /** Short plain-language instruction, e.g. "Solve for x". */
  instruction: string;
  /** 1-based position in this session, for "Problem 2 of 3". */
  position: number;
  total: number;
}

export interface SafetyResource {
  name: string;
  contact: string;
  description: string;
}

export type ServerEvent =
  /** A streamed tutor reply (R-06). Deltas with the same message_id append; done closes it. */
  | { type: "tutor_message"; message_id: string; delta: string; done: boolean }
  | ({ type: "problem" } & Problem)
  | { type: "answer_result"; problem_id: string; result: "correct" | "partial" | "incorrect" | "unreadable" }
  /** Hard reset at a natural breakpoint (R-17, A-4): the UI clears the visible chat. */
  | { type: "reset"; reason: "problem_end" | "topic_switch" }
  /** De-escalation ladder, first rung (R-21). */
  | { type: "pause_suggested" }
  | { type: "topic_switch"; label: string }
  /** R-22. Detection is still an open design question; the UI slot exists. */
  | { type: "safety_escalation"; resources: SafetyResource[] }
  /** Fail closed (P-3): the session is over, show a calm error. */
  | { type: "error"; code: string }
  | { type: "session_end"; solved: number };

export type ClientEvent =
  | { type: "kid_message"; text: string }
  | { type: "answer"; problem_id: string; text: string }
  | { type: "hint_requested"; problem_id: string }
  /** The kid chose "keep going" on the pause screen. */
  | { type: "resume" }
  | { type: "end_session" };
