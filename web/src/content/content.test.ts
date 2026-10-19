import { describe, expect, it } from "vitest";
import { applyMove, isSolved, pansLatex } from "./balance";
import { contrast, PALETTE } from "./palette";
import { balanceStage, missingStage, spotStage } from "./progress";
import type { Pans } from "./types";

const start: Pans = { left: { x: 3, units: 5 }, right: { x: 0, units: 20 } };

describe("balance scale", () => {
  it("takes units off both pans at once, so it stays level", () => {
    const r = applyMove(start, start, { op: "remove_units", n: 5 });
    expect(r).toEqual({ ok: true, pans: { left: { x: 3, units: 0 }, right: { x: 0, units: 15 } } });
  });

  it("refuses a count that isn't a whole number, since the browser's moves aren't trusted", () => {
    for (const n of [1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(applyMove(start, start, { op: "remove_units", n })).toEqual({ ok: false, reason: "nothing" });
    }
    for (const groups of [2.5, Number.NaN]) {
      expect(applyMove(start, start, { op: "split", groups })).toEqual({ ok: false, reason: "nothing" });
    }
  });

  it("refuses to take more units than a pan has", () => {
    expect(applyMove(start, start, { op: "remove_units", n: 6 })).toEqual({ ok: false, reason: "too_many" });
  });

  it("refuses a split that isn't even on both pans, which is why the order matters", () => {
    expect(applyMove(start, start, { op: "split", groups: 3 })).toEqual({ ok: false, reason: "uneven_units" });
  });

  it("says when it's the x-containers that won't split evenly", () => {
    const after = { left: { x: 3, units: 0 }, right: { x: 0, units: 15 } };
    expect(applyMove(after, start, { op: "split", groups: 5 })).toEqual({ ok: false, reason: "uneven_x" });
    expect(applyMove(start, start, { op: "split", groups: 2 })).toEqual({ ok: false, reason: "uneven_x" });
  });

  it("solves 3x + 5 = 20 in two moves", () => {
    const one = applyMove(start, start, { op: "remove_units", n: 5 });
    if (!one.ok) throw new Error("first move refused");
    const two = applyMove(one.pans, start, { op: "split", groups: 3 });
    if (!two.ok) throw new Error("second move refused");
    expect(isSolved(two.pans)).toBe(true);
    expect(pansLatex(two.pans)).toBe("x = 5");
  });

  it("starts over from the original pans", () => {
    const one = applyMove(start, start, { op: "remove_units", n: 2 });
    if (!one.ok) throw new Error("move refused");
    expect(applyMove(one.pans, start, { op: "start_over" })).toEqual({ ok: true, pans: start });
  });

  it("writes the pans as an equation", () => {
    expect(pansLatex(start)).toBe("3x + 5 = 20");
    expect(pansLatex({ left: { x: 3, units: 0 }, right: { x: 0, units: 15 } })).toBe("3x = 15");
  });

  it("isn't solved while anything else shares the pan with the x", () => {
    expect(isSolved({ left: { x: 1, units: 2 }, right: { x: 0, units: 7 } })).toBe(false);
    expect(isSolved(start)).toBe(false);
  });
});

describe("palette", () => {
  it("keeps white text readable on every primary color", () => {
    for (const c of Object.values(PALETTE)) expect(contrast(c.primary, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps every secondary color visible on the white card", () => {
    for (const c of Object.values(PALETTE)) expect(contrast(c.secondary, "#ffffff")).toBeGreaterThanOrEqual(3);
  });
});

describe("puzzle progress", () => {
  it("walks spot the error through find, fix, finish", () => {
    expect(spotStage({})).toBe("find");
    expect(spotStage({ found_error: "incorrect" })).toBe("find");
    expect(spotStage({ found_error: "correct" })).toBe("fix");
    expect(spotStage({ found_error: "correct", fixed_step: "correct" })).toBe("finish");
    expect(spotStage({ found_error: "correct", fixed_step: "correct", final_answer: "correct" })).toBe("done");
  });

  it("finishes missing step and balance on their one check", () => {
    expect(missingStage({ missing_line: "unreadable" })).toBe("fill");
    expect(missingStage({ missing_line: "correct" })).toBe("done");
    expect(balanceStage({ move: "correct" })).toBe("play");
    expect(balanceStage({ solved: "correct" })).toBe("done");
  });
});
