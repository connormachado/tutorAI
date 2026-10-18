import type { Pans } from "../content/types";

// Mock-only problem generators for the three puzzle templates. They follow each item's
// generator rules (content/prompts/puzzle-v1.md), so every instance has whole-number answers
// and no answer that a guess at a number already on screen could hit. The real server would
// generate these and check them with primer.mathcheck before sending them.

export type Rng = () => number;

/** A small seeded generator (mulberry32), so tests and demos are repeatable. */
export function seeded(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const gcd = (m: number, n: number): number => (n === 0 ? m : gcd(n, m % n));

function draw<T>(rng: Rng, make: (rng: Rng) => T | null): T {
  for (let i = 0; i < 10_000; i++) {
    const found = make(rng);
    if (found) return found;
  }
  throw new Error("no instance satisfies the generator rules");
}

export interface Numbers {
  a: number;
  b: number;
  c: number;
  answer: number;
}

export interface SpotInstance extends Numbers {
  /** a*x - b = c, in checker syntax and as LaTeX. */
  equation: string;
  latex: string;
  /** The flawed solution: b is subtracted instead of added at line 0, then divided correctly. */
  lines: string[];
  linesLatex: string[];
  /** What line 0 should say. */
  fix: string;
  /** The line the slip produces, for spotting it when a kid repeats it. */
  slip: string;
}

export function spotTheError(rng: Rng): SpotInstance {
  return draw(rng, (r) => {
    const a = int(r, 2, 6);
    const answer = int(r, 2, 12);
    const b = int(r, 2, 15);
    const c = a * answer - b;
    // The wrong path must also land on a whole number, so a fraction doesn't give it away.
    // No number on screen may be the answer, including the flawed line's right side.
    if (c <= 0 || c - b <= 0 || (2 * b) % a !== 0 || [a, b, c, c - b].includes(answer)) return null;
    const wrong = (c - b) / a;
    return {
      a, b, c, answer,
      equation: `${a}*x - ${b} = ${c}`,
      latex: `${a}x - ${b} = ${c}`,
      lines: [`${a}*x = ${c - b}`, `x = ${wrong}`],
      linesLatex: [`${a}x = ${c - b}`, `x = ${wrong}`],
      fix: `${a}*x = ${c + b}`,
      slip: `${a}*x = ${c - b}`,
    };
  });
}

export interface MissingInstance extends Numbers {
  /** a*x + b = c. */
  equation: string;
  latex: string;
  /** The solution with the middle line blanked out. */
  linesLatex: (string | null)[];
  /** The blanked line, and the line the slip of adding b would give. */
  expected: string;
  slip: string;
}

export function missingStep(rng: Rng): MissingInstance {
  return draw(rng, (r) => {
    const a = int(r, 2, 9);
    const answer = int(r, 1, 12);
    const b = int(r, 1, 20);
    const c = a * answer + b;
    // a and b share no factor, so no divide works before the b comes off and the blanked line
    // is the only next step.
    if (gcd(a, b) !== 1 || answer === a || answer === b || c > 120) return null;
    return {
      a, b, c, answer,
      equation: `${a}*x + ${b} = ${c}`,
      latex: `${a}x + ${b} = ${c}`,
      linesLatex: [null, `x = ${answer}`],
      expected: `${a}*x = ${c - b}`,
      slip: `${a}*x = ${c + b}`,
    };
  });
}

export interface BalanceInstance extends Numbers {
  latex: string;
  start: Pans;
}

export function balance(rng: Rng): BalanceInstance {
  return draw(rng, (r) => {
    const a = int(r, 2, 4);
    const answer = int(r, 1, 6);
    const b = int(r, 1, 8);
    const c = a * answer + b;
    // a and b share no factor, so no split works before the units come off and the order of
    // moves matters. c stays small enough to draw every unit.
    if (gcd(a, b) !== 1 || c > 30 || answer === a || answer === b) return null;
    return {
      a, b, c, answer,
      latex: `${a}x + ${b} = ${c}`,
      start: { left: { x: a, units: b }, right: { x: 0, units: c } },
    };
  });
}
