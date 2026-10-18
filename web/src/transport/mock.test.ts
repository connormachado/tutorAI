import { describe, expect, it } from "vitest";
import type { ClientEvent, ServerEvent } from "../protocol";
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
    await h.send({ type: "kid_message", text: "just tell me the answer" });
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

  it("goes quiet once closed", async () => {
    const h = harness();
    await h.settle();
    h.t.close();
    const mark = h.events.length;
    await h.send({ type: "hint_requested", problem_id: "p1" });
    expect(h.events.length).toBe(mark);
  });
});
