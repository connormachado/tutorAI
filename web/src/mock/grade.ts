import { evaluate, linearOf } from "../math/evaluate";
import { type Node, parseMathStrict } from "../math/parse";

// Mock-only grading for puzzle lines. In the real app the server grades every check with
// platy.mathcheck (R-37); this stands in for it so the demo runs with no backend. It reads
// what a child types ("2x = 16", "16 = 2x") with the same parser as the answer box.

const EPS = 1e-9;
export const near = (a: number, b: number) => Math.abs(a - b) < EPS;

type Side = NonNullable<ReturnType<typeof linearOf>>;

/** Each side of "lhs = rhs" as slope*x + constant, or null if unreadable or not linear in x. */
export function sides(text: string): [Side, Side] | null {
  const node = parseMathStrict(text);
  if (node?.kind !== "rel" || node.ops.length !== 1 || node.ops[0] !== "=") return null;
  const [l, r] = (node.parts as [Node, Node]).map(linearOf);
  return l && r ? [l, r] : null;
}

/** "lhs = rhs" moved to one side as a*x + b, or null if unreadable or not linear in x. */
export function linearForm(text: string): { a: number; b: number } | null {
  const s = sides(text);
  return s && { a: s[0].slope - s[1].slope, b: s[0].constant - s[1].constant };
}

/** True when the line's only solution is `answer` (mathcheck's solution_set_is). */
export function hasSolution(text: string, answer: number): boolean {
  const f = linearForm(text);
  return f !== null && !near(f.a, 0) && near(-f.b / f.a, answer);
}

const sameSide = (p: Side, q: Side) => near(p.slope, q.slope) && near(p.constant, q.constant);

/**
 * True when the line is `expected` itself, side by side: sides swapped or sums not yet worked
 * out are fine, but not another equivalent equation. So "16 = 2x" and "2x = 9 + 7" are
 * "2*x = 16", but "x = 8", "2x - 16 = 0" and the problem copied out aren't.
 */
export function sameLine(text: string, expected: string): boolean {
  const f = sides(text);
  const e = sides(expected);
  if (!f || !e) return false;
  return (sameSide(f[0], e[0]) && sameSide(f[1], e[1])) || (sameSide(f[0], e[1]) && sameSide(f[1], e[0]));
}

export function readable(text: string): boolean {
  return linearForm(text) !== null;
}

/** The value of a line that is just a number, like "12" or "24/2", or null. */
export function bareNumber(text: string): number | null {
  const node = parseMathStrict(text);
  if (!node || node.kind === "rel" || node.kind === "list") return null;
  const r = evaluate(node);
  return r?.length === 1 ? r[0]! : null;
}
