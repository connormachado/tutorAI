import type { Node } from "./parse";

// Numeric value(s) of an expression. "±" makes two values. Returns null when the
// expression has a variable, a hole, or a relation in it.
export function evaluate(node: Node): number[] | null {
  switch (node.kind) {
    case "num": {
      const n = Number(node.value);
      return Number.isFinite(n) ? [n] : null;
    }
    case "pi":
      return [Math.PI];
    case "var":
    case "missing":
    case "rel":
    case "list":
      return null;
    case "group":
      return evaluate(node.body);
    case "neg": {
      const arg = evaluate(node.arg);
      if (!arg) return null;
      return node.sign === "-" ? arg.map((v) => -v) : arg.flatMap((v) => [v, -v]);
    }
    case "sqrt":
      return map1(node.arg, (v) => (v < 0 ? NaN : Math.sqrt(v)));
    case "pow":
      return map2(node.base, node.exp, (a, b) => [a ** b]);
    case "frac":
      return map2(node.num, node.den, (a, b) => [a / b]);
    case "bin":
      return map2(node.left, node.right, (a, b) => {
        switch (node.op) {
          case "+":
            return [a + b];
          case "-":
            return [a - b];
          case "±":
            return [a + b, a - b];
          case "÷":
            return [a / b];
          default:
            return [a * b];
        }
      });
  }
}

function map1(n: Node, f: (v: number) => number): number[] | null {
  const vs = evaluate(n);
  return vs && clean(vs.map(f));
}

function map2(l: Node, r: Node, f: (a: number, b: number) => number[]): number[] | null {
  const a = evaluate(l);
  const b = evaluate(r);
  if (!a || !b) return null;
  return clean(a.flatMap((x) => b.flatMap((y) => f(x, y))));
}

function clean(vs: number[]): number[] | null {
  return vs.every(Number.isFinite) ? vs : null;
}

const EPS = 1e-9;
const near = (a: number, b: number) => Math.abs(a - b) < EPS;

// Where an expression is sampled. A curve can meet a straight line at a few points (x^3 - 3x^2
// + 4x meets 2x at 0, 1 and 2), so these include negatives and fractions too.
const SAMPLES = [0, 1, 2, -3, 0.5, 7.25];

/** An expression in x as slope*x + constant, or null if it isn't linear in x. */
export function linearOf(node: Node): { slope: number; constant: number } | null {
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

/** Puts a number in for x. Puzzles and steps use x only; a capital X is still x. */
export function substitute(node: Node, value: number): Node {
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
