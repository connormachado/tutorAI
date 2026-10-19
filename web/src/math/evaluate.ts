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
