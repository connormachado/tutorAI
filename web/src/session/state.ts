import type { Problem, SafetyResource, ServerEvent } from "../protocol";

// Everything here lives in React state only. Kid content is never written to browser
// storage, cookies, the URL or a log (P-1, P-10), and it is dropped on a reset or when
// the session ends. src/privacy.test.ts guards this.

export interface ChatMessage {
  id: string;
  from: "tutor" | "kid";
  text: string;
  streaming: boolean;
}

export type AnswerFeedback = "correct" | "partial" | "incorrect" | "unreadable" | null;

export type Overlay =
  | { kind: "pause" }
  | { kind: "break"; until: number }
  | { kind: "safety"; resources: SafetyResource[] }
  | null;

export interface SessionState {
  phase: "welcome" | "live" | "ended" | "error";
  messages: ChatMessage[];
  problem: Problem | null;
  feedback: AnswerFeedback;
  /** Shown briefly when a hard reset clears the page. */
  resetNote: string | null;
  overlay: Overlay;
  errorCode: string | null;
  solved: number;
}

export const initialState: SessionState = {
  phase: "welcome",
  messages: [],
  problem: null,
  feedback: null,
  resetNote: null,
  overlay: null,
  errorCode: null,
  solved: 0,
};

export type Action =
  | { type: "started" }
  | { type: "server"; event: ServerEvent }
  | { type: "kid_said"; id: string; text: string }
  | { type: "answer_sent" }
  | { type: "reset_note_done" }
  | { type: "take_break"; until: number }
  | { type: "close_overlay" }
  | { type: "restart" };

const RESET_NOTES = {
  problem_end: "Nice work. Fresh page for the next one.",
  topic_switch: "Let's switch it up.",
};

export function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "started":
      return { ...initialState, phase: "live" };
    case "restart":
      return initialState;
    case "kid_said":
      return {
        ...state,
        messages: [...state.messages, { id: action.id, from: "kid", text: action.text, streaming: false }],
      };
    case "answer_sent":
      // Clear the last verdict so the next one shows even if it's the same.
      return { ...state, feedback: null };
    case "reset_note_done":
      return { ...state, resetNote: null };
    case "take_break":
      return { ...state, overlay: { kind: "break", until: action.until } };
    case "close_overlay":
      return { ...state, overlay: null };
    case "server":
      return onServer(state, action.event);
  }
}

function onServer(state: SessionState, event: ServerEvent): SessionState {
  if (state.phase !== "live") return state;
  switch (event.type) {
    case "tutor_message": {
      const last = state.messages.at(-1);
      if (last && last.id === event.message_id) {
        const updated = { ...last, text: last.text + event.delta, streaming: !event.done };
        return { ...state, messages: [...state.messages.slice(0, -1), updated] };
      }
      const msg: ChatMessage = { id: event.message_id, from: "tutor", text: event.delta, streaming: !event.done };
      return { ...state, messages: [...state.messages, msg] };
    }
    case "problem": {
      const { type: _type, ...problem } = event;
      return { ...state, problem, feedback: null };
    }
    case "answer_result":
      if (state.problem?.problem_id !== event.problem_id) return state;
      return {
        ...state,
        feedback: event.result,
        solved: event.result === "correct" ? state.solved + 1 : state.solved,
      };
    case "reset":
      // A hard reset (R-17): the visible conversation is gone, not hidden.
      return {
        ...state,
        messages: [],
        problem: null,
        feedback: null,
        // A topic_switch event just before the reset already named the new topic.
        resetNote: event.reason === "topic_switch" && state.resetNote ? state.resetNote : RESET_NOTES[event.reason],
      };
    case "topic_switch":
      return { ...state, overlay: null, resetNote: event.label };
    case "pause_suggested":
      return { ...state, overlay: { kind: "pause" } };
    case "safety_escalation":
      return { ...state, overlay: { kind: "safety", resources: event.resources } };
    case "error":
      return { ...initialState, phase: "error", errorCode: event.code };
    case "session_end":
      return { ...initialState, phase: "ended", solved: event.solved };
  }
}
