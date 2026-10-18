import type { CheckId, CheckOutcome } from "./types";

// Where a student is in a puzzle, read from the server's verdicts so far.

export type Outcomes = Partial<Record<CheckId, CheckOutcome>>;

const passed = (o: Outcomes, check: CheckId) => o[check] === "correct";

/** Spot the error: tap the wrong line, rewrite it, then finish the problem. */
export function spotStage(o: Outcomes): "find" | "fix" | "finish" | "done" {
  if (!passed(o, "found_error")) return "find";
  if (!passed(o, "fixed_step")) return "fix";
  if (!passed(o, "final_answer")) return "finish";
  return "done";
}

export function missingStage(o: Outcomes): "fill" | "done" {
  return passed(o, "missing_line") ? "done" : "fill";
}

export function balanceStage(o: Outcomes): "play" | "done" {
  return passed(o, "solved") ? "done" : "play";
}
