import { describe, expect, it } from "vitest";
import type { BalancePuzzle, Puzzle } from "../content/types";
import { SKINS } from "../mock/puzzles";
import { initialState, reducer, type SessionState } from "./state";

const live = (): SessionState => reducer(initialState, { type: "started" });

describe("session reducer", () => {
  it("appends streamed deltas to one tutor bubble", () => {
    let s = live();
    s = reducer(s, { type: "server", event: { type: "tutor_message", message_id: "t1", delta: "Hi ", done: false } });
    s = reducer(s, { type: "server", event: { type: "tutor_message", message_id: "t1", delta: "there", done: true } });
    expect(s.messages).toEqual([{ id: "t1", from: "tutor", text: "Hi there", streaming: false }]);
  });

  it("keeps a streamed reply in one bubble when the child speaks mid-stream", () => {
    let s = live();
    s = reducer(s, { type: "server", event: { type: "tutor_message", message_id: "t1", delta: "What does ", done: false } });
    s = reducer(s, { type: "child_said", id: "k1", text: "I think line 1 is wrong." });
    s = reducer(s, { type: "server", event: { type: "tutor_message", message_id: "t1", delta: "that do?", done: true } });
    expect(s.messages.map((m) => [m.id, m.text])).toEqual([["t1", "What does that do?"], ["k1", "I think line 1 is wrong."]]);
  });

  it("clears the conversation on a hard reset (R-17)", () => {
    let s = live();
    s = reducer(s, { type: "child_said", id: "k1", text: "x = 5" });
    s = reducer(s, { type: "server", event: { type: "reset", reason: "problem_end" } });
    expect(s.messages).toEqual([]);
    expect(s.problem).toBeNull();
    expect(s.resetNote).not.toBeNull();
  });

  it("drops everything the child said when the session errors (P-3)", () => {
    let s = live();
    s = reducer(s, { type: "child_said", id: "k1", text: "secret canary" });
    s = reducer(s, { type: "server", event: { type: "error", code: "socket_closed" } });
    expect(JSON.stringify(s)).not.toContain("secret canary");
    expect(s.phase).toBe("error");
  });

  describe("puzzles", () => {
    const scale: BalancePuzzle = {
      template: "balance", item_id: "lin2-balance", instance_id: "balance-1", skill_id: "two_step_equations",
      instructions: "Get one kit bag alone without tipping the scale.", equation: "3x + 5 = 20", skin: SKINS.soccer,
      start: { left: { x: 3, units: 5 }, right: { x: 0, units: 20 } },
    };
    const show = (s: SessionState, puzzle: Puzzle) => reducer(s, { type: "server", event: { type: "puzzle", puzzle } });
    const verdict = (s: SessionState, check: "move" | "solved", outcome: "correct" | "incorrect") =>
      reducer(s, { type: "server", event: { type: "puzzle_result", instance_id: "balance-1", check, outcome } });
    const take = (n: number) => ({ type: "puzzle_move_sent" as const, move: { check: "move" as const, move: { op: "remove_units" as const, n } } });

    it("draws a scale move only once the server accepts it", () => {
      let s = show(live(), scale);
      s = reducer(s, take(5));
      expect(s.puzzle?.pans).toEqual(scale.start);
      s = verdict(s, "move", "correct");
      expect(s.puzzle?.pans).toEqual({ left: { x: 3, units: 0 }, right: { x: 0, units: 15 } });
      s = reducer(s, { type: "puzzle_move_sent", move: { check: "move", move: { op: "split", groups: 2 } } });
      s = verdict(s, "move", "incorrect");
      expect(s.puzzle).toMatchObject({ pans: { left: { x: 3, units: 0 } }, pending: null, last: { check: "move", outcome: "incorrect" } });
    });

    it("holds every kind of move until its verdict, so a second tap can't overtake it", () => {
      const spot: Puzzle = {
        template: "spot_the_error", item_id: "lin2-undo-sign-spot-error", instance_id: "spot-1",
        skill_id: "two_step_equations", instructions: "One line is wrong.", equation: "2x - 7 = 9",
        skin: SKINS.soccer, lines: ["2x = 2", "x = 1"],
      };
      let s = show(live(), spot);
      s = reducer(s, { type: "puzzle_move_sent", move: { check: "found_error", line: 1 } });
      expect(s.puzzle?.pending).toEqual({ check: "found_error", line: 1 });
      s = reducer(s, { type: "server", event: { type: "puzzle_result", instance_id: "spot-1", check: "found_error", outcome: "incorrect" } });
      expect(s.puzzle?.pending).toBeNull();
    });

    it("keeps progress when the same puzzle comes back in a new skin (R-38)", () => {
      let s = show(live(), scale);
      s = reducer(s, take(5));
      s = verdict(s, "move", "correct");
      s = show(s, { ...scale, skin: { ...SKINS.gaming, colors: "green_gold" } });
      expect(s.puzzle?.pans?.right.units).toBe(15);
      expect(s.puzzle?.puzzle.skin.team_name).toBe(SKINS.gaming.team_name);
      // A new instance starts fresh.
      s = show(s, { ...scale, instance_id: "balance-2" });
      expect(s.puzzle?.pans).toEqual(scale.start);
    });

    it("finishes a worked example on its last faded step", () => {
      const solo: Puzzle = {
        template: "worked_example", item_id: "lin2-worked-example", instance_id: "worked-1", skill_id: "two_step_equations",
        instructions: "Solve it one step at a time.", equation: "3x + 5 = 20", skin: SKINS.soccer, steps: [null, null], why: null,
      };
      const step = (check: "first_step" | "final_answer") => ({
        type: "server" as const, event: { type: "puzzle_result" as const, instance_id: "worked-1", check, outcome: "correct" as const },
      });
      let s = reducer(show(live(), solo), step("first_step"));
      expect(s.puzzle?.done).toBe(false);
      s = reducer(s, step("final_answer"));
      expect(s.puzzle?.done).toBe(true);
    });

    it("is done once solved, and gone after puzzle_done or a reset", () => {
      let s = verdict(show(live(), scale), "solved", "correct");
      expect(s.puzzle?.done).toBe(true);
      expect(reducer(s, { type: "server", event: { type: "puzzle_done", instance_id: "balance-1" } }).puzzle).toBeNull();
      expect(reducer(s, { type: "server", event: { type: "reset", reason: "problem_end" } }).puzzle).toBeNull();
    });

    it("holds the chat from keep going until the next problem, so nothing lands on the wrong one", () => {
      const problem = {
        type: "problem" as const, problem_id: "p1", skill_id: "s", prompt: "3x + 5 = 20", instruction: "Solve", position: 1, total: 3,
      };
      let s = verdict(show(live(), scale), "solved", "correct");
      expect(s.moving).toBe(false);
      s = reducer(s, { type: "puzzle_next_sent" });
      expect(s.moving).toBe(true);
      // A new look for the same puzzle doesn't count as arriving somewhere new.
      s = show(s, { ...scale, skin: SKINS.gaming });
      s = reducer(s, { type: "server", event: { type: "puzzle_done", instance_id: "balance-1" } });
      s = reducer(s, { type: "server", event: { type: "reset", reason: "problem_end" } });
      expect(s.moving).toBe(true);
      s = reducer(s, { type: "server", event: problem });
      expect(s.moving).toBe(false);
      // The same holds after a solved problem, and a new puzzle ends it too.
      s = reducer(s, { type: "server", event: { type: "answer_result", problem_id: "p1", result: "correct" } });
      expect(s.moving).toBe(true);
      expect(show(s, { ...scale, instance_id: "balance-2" }).moving).toBe(false);
    });

    it("ignores verdicts for another puzzle", () => {
      const s = show(live(), scale);
      const other = reducer(s, { type: "server", event: { type: "puzzle_result", instance_id: "x", check: "solved", outcome: "correct" } });
      expect(other).toBe(s);
    });
  });
});
