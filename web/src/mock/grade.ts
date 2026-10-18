import { evaluate } from "../math/evaluate";
import { type Node, parseMathStrict } from "../math/parse";

// Mock-only grading for puzzle lines. In the real app the server grades every check with
// primer.mathcheck (R-32); this stands in for it so the demo runs with no backend. It reads
// what a kid types ("2x = 16", "16 = 2x") with the same parser as the answer box.

const EPS = 1e-9;
const near = (a: number, b: number) => Math.abs(a - b) < EPS;

interface Side {
  slope: number;
  constant: number;
}

// Where each side is sampled. A curve can meet a straight line at a few points (x^3 - 3x^2
// + 4x meets 2x at 0, 1 and 2), so these include negatives and fractions too.
const SAMPLES = [0, 1, 2, -3, 0.5, 7.25];

/** One side of an equation as slope*x + constant, or null if it isn't linear in x. */
function side(node: Node): Side | null {
  const values: number[] = [];
  for (const x of SAMPLES) {
    const r = evaluate(substitute(node, x));
    if (r?.length !== 1) return null;
    values.push(r[0]!);
  }
  const [f0, f1] = values as [number, number];
  const slope = f1 - f0;
  // x^2, 1/x, sqrt(x^2) and friends aren't linear.
  if (!SAMPLES.every((x, i) => near(values[i]!, f0 + slope * x))) return null;
  return { slope, constant: f0 };
}

function sides(text: string): [Side, Side] | null {
  const node = parseMathStrict(text);
  if (node?.kind !== "rel" || node.ops.length !== 1 || node.ops[0] !== "=") return null;
  const [l, r] = (node.parts as [Node, Node]).map(side);
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

// Puzzles use x only; a capital X is still x.
function substitute(node: Node, value: number): Node {
  const s = (n: Node) => substitute(n, value);
  switch (node.kind) {
    case "var":
      return node.name.toLowerCase() === "x" ? { kind: "num", value: String(value) } : node;
    case "num":
    case "pi":
    case "missing":
      return node;
    case "group":
      return { ...node, body: s(node.body) };
    case "neg":
      return { ...node, arg: s(node.arg) };
    case "bin":
      return { ...node, left: s(node.left), right: s(node.right) };
    case "frac":
      return { ...node, num: s(node.num), den: s(node.den) };
    case "pow":
      return { ...node, base: s(node.base), exp: s(node.exp) };
    case "sqrt":
      return { ...node, arg: s(node.arg) };
    case "rel":
      return { ...node, parts: node.parts.map(s) };
    case "list":
      return { ...node, items: node.items.map(s) };
  }
}
