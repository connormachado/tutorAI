import { type Node, parseMath, unwrap } from "./parse";

const OP_LATEX: Record<string, string> = {
  "+": "+", "-": "-", "±": "\\pm", "*": "\\cdot", "×": "\\times", "÷": "\\div", implicit: "",
  "=": "=", "<": "<", ">": ">", "≤": "\\le", "≥": "\\ge", "≠": "\\ne",
};

export function toLatex(node: Node): string {
  switch (node.kind) {
    case "num":
      return node.value;
    case "var":
      return node.name;
    case "pi":
      return "\\pi";
    case "missing":
      return "\\square";
    case "group":
      return `\\left(${toLatex(node.body)}\\right)`;
    case "neg":
      return node.sign === "-" ? `-${toLatex(node.arg)}` : `\\pm ${toLatex(node.arg)}`;
    case "bin": {
      const left = toLatex(node.left);
      let sep = node.op === "implicit" ? implicitSep(node.right) : ` ${OP_LATEX[node.op]} `;
      if (sep === "" && /\\[a-zA-Z]+$/.test(left)) sep = " "; // "\pi x", not "\pix"
      return `${left}${sep}${toLatex(node.right)}`;
    }
    case "frac":
      return `\\frac{${toLatex(unwrap(node.num))}}{${toLatex(unwrap(node.den))}}`;
    case "pow":
      return `{${toLatex(node.base)}}^{${toLatex(unwrap(node.exp))}}`;
    case "sqrt":
      return `\\sqrt{${toLatex(node.arg)}}`;
    case "rel":
      return node.parts
        .map((p, i) => (i === 0 ? toLatex(p) : ` ${OP_LATEX[node.ops[i - 1]!]} ${toLatex(p)}`))
        .join("");
    case "list":
      return node.items.map(toLatex).join(",\\ ");
  }
}

// 2·3 written "2 3" needs a visible dot; 2x and 2(x+1) don't.
function implicitSep(right: Node): string {
  let first = right;
  while (first.kind === "bin" || first.kind === "pow") first = first.kind === "bin" ? first.left : first.base;
  if (first.kind === "num") return " \\cdot ";
  return first.kind === "var" || first.kind === "pi" ? "" : " ";
}

export function kidMathToLatex(src: string): string {
  return src.trim() === "" ? "" : toLatex(parseMath(src));
}
