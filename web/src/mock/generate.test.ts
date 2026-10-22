import { describe, expect, it } from "vitest";
import { applyMove, isSolved, pansLatex } from "../content/balance";
import { balance, missingStep, seeded, spotTheError, workedExample } from "./generate";
import { hasSolution, sameLine } from "./grade";

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);

describe("spot the error generator", () => {
  it("makes problems whose only wrong line is the first, and whose fix is right", () => {
    for (const seed of SEEDS) {
      const p = spotTheError(seeded(seed));
      expect(hasSolution(p.equation, p.answer), p.equation).toBe(true);
      // Line 0 is the slip: it no longer has the problem's solution.
      expect(hasSolution(p.lines[0]!, p.answer)).toBe(false);
      // Line 1 follows correctly from line 0, so only line 0 is wrong.
      const wrong = Number(p.lines[1]!.split("=")[1]);
      expect(hasSolution(p.lines[0]!, wrong)).toBe(true);
      expect(Number.isInteger(wrong)).toBe(true);
      expect(hasSolution(p.fix, p.answer)).toBe(true);
      expect(sameLine(p.slip, p.lines[0]!)).toBe(true);
    }
  });

  it("never puts the answer on screen, in the problem or the flawed lines", () => {
    for (let seed = 1; seed <= 5000; seed++) {
      const p = spotTheError(seeded(seed));
      const shown = [p.equation, ...p.lines].join(" ").match(/\d+/g)!.map(Number);
      expect(shown, p.equation).not.toContain(p.answer);
      expect(p.c).toBeGreaterThan(0);
    }
  });
});

describe("missing step generator", () => {
  it("blanks the step between the problem and the answer", () => {
    for (const seed of SEEDS) {
      const p = missingStep(seeded(seed));
      expect(hasSolution(p.equation, p.answer)).toBe(true);
      expect(hasSolution(p.expected, p.answer)).toBe(true);
      expect(hasSolution(p.slip, p.answer)).toBe(false);
      expect(p.linesLatex).toEqual([null, `x = ${p.answer}`]);
      expect([p.a, p.b]).not.toContain(p.answer);
    }
  });

  it("never lets a divide come first, so the blanked step is the only next line", () => {
    for (let seed = 1; seed <= 2000; seed++) {
      const p = missingStep(seeded(seed));
      for (let d = 2; d <= p.a; d++) expect(p.a % d === 0 && p.b % d === 0, p.equation).toBe(false);
    }
  });
});

describe("balance generator", () => {
  it("makes scales solved by taking the units off, then splitting", () => {
    for (const seed of SEEDS) {
      const p = balance(seeded(seed));
      const one = applyMove(p.start, p.start, { op: "remove_units", n: p.b });
      if (!one.ok) throw new Error("removing the units was refused");
      const two = applyMove(one.pans, p.start, { op: "split", groups: p.a });
      if (!two.ok) throw new Error("splitting was refused");
      expect(isSolved(two.pans)).toBe(true);
      expect(pansLatex(two.pans)).toBe(`x = ${p.answer}`);
    }
  });

  it("makes splitting first impossible, so the order of moves matters", () => {
    for (const seed of SEEDS) {
      const p = balance(seeded(seed));
      for (let g = 2; g <= 9; g++) expect(applyMove(p.start, p.start, { op: "split", groups: g }).ok, p.latex).toBe(false);
      expect(p.c).toBeLessThanOrEqual(30);
      expect([p.a, p.b]).not.toContain(p.answer);
    }
  });

  it("repeats the same problem for the same seed", () => {
    expect(balance(seeded(7))).toEqual(balance(seeded(7)));
  });
});

describe("worked example generator", () => {
  it("makes two-step problems whose first step, either way round, leads to the answer", () => {
    for (const seed of SEEDS) {
      const p = workedExample(seeded(seed));
      expect(hasSolution(p.equation, p.answer), p.equation).toBe(true);
      expect(hasSolution(p.expected, p.answer)).toBe(true);
      expect(hasSolution(p.divideFirst, p.answer)).toBe(true);
      expect(hasSolution(p.slip, p.answer)).toBe(false);
      expect(p.linesLatex).toEqual([`${p.a}x = ${p.c - p.b}`, `x = ${p.answer}`]);
      expect([...p.order].sort()).toEqual([0, 1, 2]);
    }
  });

  it("doesn't always put the right reason first", () => {
    const firsts = new Set(SEEDS.map((seed) => workedExample(seeded(seed)).order[0]));
    expect(firsts).toEqual(new Set([0, 1, 2]));
  });
});
