import { describe, expect, it } from "vitest";
import { initialState, reducer, type SessionState } from "./state";

const live = (): SessionState => reducer(initialState, { type: "started" });

describe("session reducer", () => {
  it("appends streamed deltas to one tutor bubble", () => {
    let s = live();
    s = reducer(s, { type: "server", event: { type: "tutor_message", message_id: "t1", delta: "Hi ", done: false } });
    s = reducer(s, { type: "server", event: { type: "tutor_message", message_id: "t1", delta: "there", done: true } });
    expect(s.messages).toEqual([{ id: "t1", from: "tutor", text: "Hi there", streaming: false }]);
  });

  it("clears the conversation on a hard reset (R-17)", () => {
    let s = live();
    s = reducer(s, { type: "kid_said", id: "k1", text: "x = 5" });
    s = reducer(s, { type: "server", event: { type: "reset", reason: "problem_end" } });
    expect(s.messages).toEqual([]);
    expect(s.problem).toBeNull();
    expect(s.resetNote).not.toBeNull();
  });

  it("drops everything the kid said when the session errors (P-3)", () => {
    let s = live();
    s = reducer(s, { type: "kid_said", id: "k1", text: "secret canary" });
    s = reducer(s, { type: "server", event: { type: "error", code: "socket_closed" } });
    expect(JSON.stringify(s)).not.toContain("secret canary");
    expect(s.phase).toBe("error");
  });
});
