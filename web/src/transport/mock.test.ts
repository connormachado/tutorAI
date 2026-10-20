import { describe, expect, it } from "vitest";
import type { PuzzleMove } from "../content/types";
import type { ClientEvent, ServerEvent } from "../protocol";
import { EXPLAIN_FIRST } from "../mock/script";
import { MockTransport } from "./mock";

const FAST = { thinkMs: 0, wordMs: 0, resetMs: 0 };

function harness() {
  const events: ServerEvent[] = [];
  const t = new MockTransport(FAST);
  void t.start("tutoring", (e) => events.push(e));
  const settle = () => t.whenIdle();
  const send = async (e: ClientEvent) => {
    t.send(e);
    await settle();
  };
  // Full tutor replies, joined from streamed deltas, since `from`.
  const said = (from = 0) => {
    const byId = new Map<string, string>();
    for (const e of events.slice(from)) {
      if (e.type === "tutor_message") byId.set(e.message_id, (byId.get(e.message_id) ?? "") + e.delta);
    }
    return [...byId.values()];
  };
  const problems = () => events.filter((e) => e.type === "problem").map((e) => e.problem_id);
  return { t, events, settle, send, said, problems };
}

describe("MockTransport", () => {
  it("opens with a greeting and the first problem", async () => {
    const h = harness();
    await h.settle();
    expect(h.said()[0]).toContain("I'm Platy");
    expect(h.problems()).toEqual(["p1"]);
  });

  it("asks for reasoning on the first miss instead of giving the answer (R-02, R-03)", async () => {
    const h = harness();
    await h.settle();
    const mark = h.events.length;
    await h.send({ type: "answer", problem_id: "p1", text: "x = 4" });
    expect(h.events[mark]).toEqual({ type: "answer_result", problem_id: "p1", result: "incorrect" });
    const reply = h.said(mark).join(" ");
    expect(reply).toContain("what you did first");
    expect(reply).not.toContain("x = 5");
  });

  it("names a specific slip when the wrong answer shows one", async () => {
    const h = harness();
    await h.settle();
    const mark = h.events.length;
    await h.send({ type: "answer", problem_id: "p1", text: "15" });
    expect(h.said(mark).join(" ")).toContain("$3x = 15$ is right");
  });

  it("won't hand over the answer when asked", async () => {
    const h = harness();
    await h.settle();
    const mark = h.events.length;
    await h.send({ type: "child_message", text: "just tell me the answer" });
    expect(h.said(mark).join(" ")).toContain("won't just hand it over");
  });

  it("resets and moves on after a correct answer (R-17)", async () => {
    const h = harness();
    await h.settle();
    await h.send({ type: "answer", problem_id: "p1", text: "x=5" });
    expect(h.events).toContainEqual({ type: "reset", reason: "problem_end" });
    expect(h.problems()).toEqual(["p1", "p2"]);
  });

  it("suggests a pause after three misses, then pivots to an easier problem (R-21)", async () => {
    const h = harness();
    await h.settle();
    for (const text of ["1", "2", "3"]) await h.send({ type: "answer", problem_id: "p1", text });
    expect(h.events.at(-1)).toEqual({ type: "pause_suggested" });
    await h.send({ type: "resume" });
    expect(h.events).toContainEqual({ type: "reset", reason: "topic_switch" });
    expect(h.problems()).toEqual(["p1", "warmup"]);
    await h.send({ type: "answer", problem_id: "warmup", text: "5" });
    expect(h.problems()).toEqual(["p1", "warmup", "p1"]);
  });

  it("adds the warm-up only once when a pause comes during the warm-up", async () => {
    const h = harness();
    await h.settle();
    h.t.demo("pause");
    await h.send({ type: "resume" });
    h.t.demo("pause");
    await h.send({ type: "resume" });
    expect(h.problems()).toEqual(["p1", "warmup", "warmup"]);
    await h.send({ type: "answer", problem_id: "warmup", text: "5" });
    expect(h.problems()).toEqual(["p1", "warmup", "warmup", "p1"]);
  });

  it("takes a partial answer to x^2 = 49 and asks for the other root", async () => {
    const h = harness();
    await h.settle();
    await h.send({ type: "answer", problem_id: "p1", text: "5" });
    await h.send({ type: "answer", problem_id: "p2", text: "8" });
    const mark = h.events.length;
    await h.send({ type: "answer", problem_id: "p3", text: "7" });
    expect(h.said(mark).join(" ")).toContain("one more number");
    await h.send({ type: "answer", problem_id: "p3", text: "7 or -7" });
    expect(h.events.at(-1)).toEqual({ type: "session_end", solved: 3 });
  });

  describe("puzzles (R-37)", () => {
    const puzzlesIn = (h: ReturnType<typeof harness>) =>
      h.events.flatMap((e) => (e.type === "puzzle" ? [e.puzzle] : []));
    const results = (h: ReturnType<typeof harness>, from = 0) =>
      h.events.slice(from).flatMap((e) => (e.type === "puzzle_result" ? [[e.check, e.outcome]] : []));
    // The numbers of a spot-the-error instance, read back from what the child sees.
    const spotNumbers = (equation: string) => {
      const [a, b, c] = (equation.match(/^(\d+)x - (\d+) = (\d+)$/) ?? []).slice(1).map(Number) as [number, number, number];
      return { a, b, c, answer: (c + b) / a };
    };

    it("sends a slip with a repair puzzle there first, then back to the problem", async () => {
      const h = harness();
      await h.settle();
      await h.send({ type: "answer", problem_id: "p1", text: "25/3" });
      expect(h.said().join(" ")).toContain("I have a hunch");
      expect(h.events).toContainEqual({ type: "topic_switch", label: "Quick puzzle" });
      const [puzzle] = puzzlesIn(h);
      if (puzzle?.template !== "spot_the_error") throw new Error("expected spot the error");
      const { a, b, c, answer } = spotNumbers(puzzle.equation);
      const id = puzzle.instance_id;
      await h.send({ type: "puzzle_move", instance_id: id, move: { check: "found_error", line: 0 } });
      await h.send({ type: "puzzle_move", instance_id: id, move: { check: "fixed_step", text: `${a}x = ${c + b}` } });
      const mark = h.events.length;
      await h.send({ type: "puzzle_move", instance_id: id, move: { check: "final_answer", text: String(answer) } });
      expect(h.said(mark).join(" ")).toContain("What made you suspect that line?");
      await h.send({ type: "child_message", text: "the minus looked off" });
      expect(h.events).toContainEqual({ type: "puzzle_done", instance_id: id });
      expect(h.problems()).toEqual(["p1", "p1"]);
      expect(h.said().join(" ")).toContain("back to the one from before");
      expect(results(h)).toEqual([["found_error", "correct"], ["fixed_step", "correct"], ["final_answer", "correct"]]);
    });

    it("repairs a slip only once, then names it", async () => {
      const h = harness();
      await h.settle();
      await h.send({ type: "answer", problem_id: "p1", text: "25/3" });
      h.t.demo("skip");
      await h.settle();
      const mark = h.events.length;
      await h.send({ type: "answer", problem_id: "p1", text: "25/3" });
      expect(h.said(mark).join(" ")).toContain("the $5$ got added to both sides");
      expect(puzzlesIn(h)).toHaveLength(1);
    });

    it("asks first after a miss, and nudges only once the child explains (R-03)", async () => {
      const h = harness();
      await h.settle();
      h.t.demo("spot_the_error");
      await h.settle();
      const id = puzzlesIn(h)[0]!.instance_id;
      let mark = h.events.length;
      await h.send({ type: "puzzle_move", instance_id: id, move: { check: "found_error", line: 1 } });
      expect(results(h, mark)).toEqual([["found_error", "incorrect"]]);
      expect(h.said(mark)).toEqual(["What does that line do to both sides, and does it follow from the line just above it?"]);
      mark = h.events.length;
      await h.send({ type: "child_message", text: "it divides by 2" });
      expect(h.said(mark).join(" ")).toContain("Check each line against the one before it");
    });

    it("gives no hint before a first try (R-02)", async () => {
      const h = harness();
      await h.settle();
      h.t.demo("missing_step");
      await h.settle();
      const id = puzzlesIn(h)[0]!.instance_id;
      let mark = h.events.length;
      await h.send({ type: "puzzle_hint", instance_id: id });
      expect(h.said(mark).join(" ")).toContain("one try first");
      await h.send({ type: "puzzle_move", instance_id: id, move: { check: "missing_line", text: "x = 0" } });
      await h.send({ type: "child_message", text: "I guessed" });
      mark = h.events.length;
      await h.send({ type: "puzzle_hint", instance_id: id });
      expect(h.said(mark).join(" ")).toContain("the problem and the last line");
    });

    it("changes the skin without touching the math or the progress (R-38)", async () => {
      const h = harness();
      await h.settle();
      h.t.demo("balance");
      await h.settle();
      const first = puzzlesIn(h)[0]!;
      if (first.template !== "balance") throw new Error("expected balance");
      const { left } = first.start;
      await h.send({ type: "puzzle_move", instance_id: first.instance_id, move: { check: "move", move: { op: "remove_units", n: left.units } } });
      h.t.demo("interest");
      await h.settle();
      await h.send({ type: "slot_pick", colors: "green_gold" });
      const [, football, picked] = puzzlesIn(h);
      expect(football).toMatchObject({ instance_id: first.instance_id, equation: first.equation });
      expect(football?.skin.interest).toBe("football");
      expect(picked?.skin).toMatchObject({ interest: "football", colors: "green_gold" });
      // The scale picks up where it was: the loose units are already gone.
      const mark = h.events.length;
      await h.send({ type: "puzzle_move", instance_id: first.instance_id, move: { check: "move", move: { op: "split", groups: left.x } } });
      expect(results(h, mark)).toEqual([["move", "correct"], ["solved", "correct"]]);
    });

    it("refuses a scale move that can't be done to both pans, and asks about it", async () => {
      const h = harness();
      await h.settle();
      h.t.demo("balance");
      await h.settle();
      const p = puzzlesIn(h)[0]!;
      if (p.template !== "balance") throw new Error("expected balance");
      const mark = h.events.length;
      await h.send({ type: "puzzle_move", instance_id: p.instance_id, move: { check: "move", move: { op: "split", groups: p.start.left.x } } });
      expect(results(h, mark)).toEqual([["move", "incorrect"]]);
      expect(h.said(mark).join(" ")).toContain("What happens to the loose balls");
    });

    it("drops the puzzle when a pause leads to the warm-up, and tutors normally after", async () => {
      const h = harness();
      await h.settle();
      h.t.demo("balance");
      await h.settle();
      h.t.demo("pause");
      await h.settle();
      await h.send({ type: "resume" });
      expect(h.problems()).toEqual(["p1", "warmup"]);
      let mark = h.events.length;
      await h.send({ type: "child_message", text: "help" });
      expect(h.said(mark).join(" ")).toContain("What number plus $4$ makes $9$?");
      await h.send({ type: "answer", problem_id: "warmup", text: "5" });
      expect(h.problems()).toEqual(["p1", "warmup", "p1"]);
      mark = h.events.length;
      await h.send({ type: "child_message", text: "help" });
      expect(h.said(mark).join(" ")).toContain("What's happening to $x$?");
    });

    it("doesn't count an unreadable line as a first try", async () => {
      const h = harness();
      await h.settle();
      h.t.demo("missing_step");
      await h.settle();
      const id = puzzlesIn(h)[0]!.instance_id;
      await h.send({ type: "puzzle_move", instance_id: id, move: { check: "missing_line", text: "?" } });
      const mark = h.events.length;
      await h.send({ type: "puzzle_hint", instance_id: id });
      expect(h.said(mark).join(" ")).toContain("one try first");
    });

    it("won't offer a hint it can't give yet when asked for the answer before a try", async () => {
      const h = harness();
      await h.settle();
      h.t.demo("spot_the_error");
      await h.settle();
      const mark = h.events.length;
      await h.send({ type: "child_message", text: "just tell me the answer" });
      const reply = h.said(mark).join(" ");
      expect(reply).toContain("one try first");
      expect(reply).not.toContain("Want a hint?");
    });

    it("waits for the child's explanation before giving a hint after a miss (R-03)", async () => {
      const h = harness();
      await h.settle();
      h.t.demo("spot_the_error");
      await h.settle();
      const id = puzzlesIn(h)[0]!.instance_id;
      await h.send({ type: "puzzle_move", instance_id: id, move: { check: "found_error", line: 1 } });
      let mark = h.events.length;
      await h.send({ type: "puzzle_hint", instance_id: id });
      await h.send({ type: "puzzle_hint", instance_id: id });
      expect(h.said(mark)).toEqual([EXPLAIN_FIRST, EXPLAIN_FIRST]);
      await h.send({ type: "child_message", text: "it divides by the number" });
      mark = h.events.length;
      await h.send({ type: "puzzle_hint", instance_id: id });
      expect(h.said(mark).join(" ")).toContain("Go line by line");
    });

    it("suggests a pause after three misses on a puzzle, as on a problem (R-21)", async () => {
      const h = harness();
      await h.settle();
      h.t.demo("missing_step");
      await h.settle();
      const id = puzzlesIn(h)[0]!.instance_id;
      for (const text of ["x = 0", "x = 100", "x = 101"]) {
        await h.send({ type: "puzzle_move", instance_id: id, move: { check: "missing_line", text } });
        if (!h.events.some((e) => e.type === "pause_suggested")) await h.send({ type: "child_message", text: "I guessed" });
      }
      expect(h.events.filter((e) => e.type === "pause_suggested")).toHaveLength(1);
      await h.send({ type: "resume" });
      expect(h.problems()).toEqual(["p1", "warmup"]);
    });

    it("gives no hint once the puzzle is solved, while the reflection question waits", async () => {
      const h = harness();
      await h.settle();
      h.t.demo("balance");
      await h.settle();
      const p = puzzlesIn(h)[0]!;
      if (p.template !== "balance") throw new Error("expected balance");
      await h.send({ type: "puzzle_move", instance_id: p.instance_id, move: { check: "move", move: { op: "remove_units", n: p.start.left.units } } });
      await h.send({ type: "puzzle_move", instance_id: p.instance_id, move: { check: "move", move: { op: "split", groups: p.start.left.x } } });
      const mark = h.events.length;
      await h.send({ type: "puzzle_hint", instance_id: p.instance_id });
      expect(h.said(mark)).toEqual([]);
    });

    it("fades a worked example from watching to writing every step, then goes back (R-37)", async () => {
      const h = harness();
      await h.settle();
      h.t.demo("worked_example");
      await h.settle();
      expect(h.events).toContainEqual({ type: "topic_switch", label: "Worked example" });
      const latest = () => {
        const p = puzzlesIn(h).at(-1);
        if (p?.template !== "worked_example") throw new Error("expected a worked example");
        const [a, b, c] = (p.equation.match(/^(\d+)x \+ (\d+) = (\d+)$/) ?? []).slice(1).map(Number) as [number, number, number];
        return { p, a, b, c, answer: (c - b) / a };
      };
      const move = (id: string, m: PuzzleMove) => h.send({ type: "puzzle_move", instance_id: id, move: m });

      const watch = latest().p;
      expect(watch.steps.every((s) => s !== null)).toBe(true);
      await move(watch.instance_id, { check: "why", choice: watch.why!.choices.findIndex((t) => t.startsWith("It undoes")) });
      await h.send({ type: "puzzle_next", instance_id: watch.instance_id });
      expect(h.events).toContainEqual({ type: "puzzle_done", instance_id: watch.instance_id });

      const finish = latest();
      expect(finish.p.steps.map((s) => s !== null)).toEqual([true, false]);
      await move(finish.p.instance_id, { check: "final_answer", text: `x = ${finish.answer}` });
      await h.send({ type: "child_message", text: "ready" });

      const solo = latest();
      expect(solo.p.steps).toEqual([null, null]);
      await move(solo.p.instance_id, { check: "first_step", text: `${solo.a}x = ${solo.c - solo.b}` });
      const mark = h.events.length;
      await move(solo.p.instance_id, { check: "final_answer", text: String(solo.answer) });
      expect(h.said(mark).join(" ")).toContain("Which step");
      await h.send({ type: "puzzle_next", instance_id: solo.p.instance_id });
      expect(new Set(puzzlesIn(h).map((p) => p.instance_id)).size).toBe(3);
      expect(h.problems()).toEqual(["p1", "p1"]);
    });

    it("moves on from a finished puzzle when the child taps keep going", async () => {
      const h = harness();
      await h.settle();
      h.t.demo("balance");
      await h.settle();
      const p = puzzlesIn(h)[0]!;
      if (p.template !== "balance") throw new Error("expected balance");
      const id = p.instance_id;
      await h.send({ type: "puzzle_next", instance_id: id });
      expect(h.events).not.toContainEqual({ type: "puzzle_done", instance_id: id });
      await h.send({ type: "puzzle_move", instance_id: id, move: { check: "move", move: { op: "remove_units", n: p.start.left.units } } });
      await h.send({ type: "puzzle_move", instance_id: id, move: { check: "move", move: { op: "split", groups: p.start.left.x } } });
      await h.send({ type: "puzzle_next", instance_id: id });
      expect(h.events).toContainEqual({ type: "puzzle_done", instance_id: id });
      expect(h.problems()).toEqual(["p1", "p1"]);
    });
  });

  it("goes quiet once closed", async () => {
    const h = harness();
    await h.settle();
    h.t.close();
    const mark = h.events.length;
    await h.send({ type: "hint_requested", problem_id: "p1" });
    expect(h.events.length).toBe(mark);
  });
});
