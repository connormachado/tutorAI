// Parses the math a kid types ("3x+5=20", "x^2", "sqrt(49)", "3/4") into a small AST.
// It never throws: half-typed input ("x^", "(3+") parses with `missing` holes so the
// live preview can show a box where the kid still has to type something.

export type Node =
  | { kind: "num"; value: string }
  | { kind: "var"; name: string }
  | { kind: "pi" }
  | { kind: "missing" }
  | { kind: "group"; body: Node }
  | { kind: "neg"; sign: "-" | "±"; arg: Node }
  | { kind: "bin"; op: BinOp; left: Node; right: Node }
  | { kind: "frac"; num: Node; den: Node }
  | { kind: "pow"; base: Node; exp: Node }
  | { kind: "sqrt"; arg: Node }
  | { kind: "rel"; ops: RelOp[]; parts: Node[] }
  | { kind: "list"; items: Node[] };

export type BinOp = "+" | "-" | "±" | "*" | "×" | "÷" | "implicit";
export type RelOp = "=" | "<" | ">" | "≤" | "≥" | "≠";

type Token =
  | { t: "num"; v: string }
  | { t: "id"; v: string }
  | { t: "op"; v: string }
  | { t: "sup"; v: string };

const SUPERSCRIPTS: Record<string, string> = { "²": "2", "³": "3" };
const ALIASES: Record<string, string> = {
  "−": "-", "–": "-", "·": "*", "⋅": "*", "<=": "≤", ">=": "≥", "!=": "≠", "+-": "±",
};

export function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    const two = src.slice(i, i + 2);
    if (/\s/.test(c)) {
      i++;
    } else if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j]!)) j++;
      out.push({ t: "num", v: src.slice(i, j) });
      i = j;
    } else if (/[a-zA-Z]/.test(c)) {
      let j = i;
      while (j < src.length && /[a-zA-Z]/.test(src[j]!)) j++;
      splitWord(src.slice(i, j), out);
      i = j;
    } else if (two in ALIASES) {
      out.push({ t: "op", v: ALIASES[two]! });
      i += 2;
    } else if (c in SUPERSCRIPTS) {
      out.push({ t: "sup", v: SUPERSCRIPTS[c]! });
      i++;
    } else if (c === "π") {
      out.push({ t: "id", v: "pi" });
      i++;
    } else {
      out.push({ t: "op", v: ALIASES[c] ?? c });
      i++;
    }
  }
  return out;
}

// "sqrt" and "pi" are words; any other run of letters is a product of single variables (xy = x·y).
function splitWord(word: string, out: Token[]): void {
  let rest = word;
  while (rest.length > 0) {
    const lower = rest.toLowerCase();
    if (lower.startsWith("sqrt")) {
      out.push({ t: "op", v: "√" });
      rest = rest.slice(4);
    } else if (lower.startsWith("pi")) {
      out.push({ t: "id", v: "pi" });
      rest = rest.slice(2);
    } else {
      out.push({ t: "id", v: rest[0]! });
      rest = rest.slice(1);
    }
  }
}

const REL_OPS = new Set<string>(["=", "<", ">", "≤", "≥", "≠"]);

class Parser {
  private pos = 0;
  constructor(private readonly toks: Token[]) {}

  // "7, -7" is a list. A token that can't start anything (a stray ")") is skipped rather than
  // failing the preview.
  parse(): Node {
    const items = [this.relation()];
    while (this.pos < this.toks.length) {
      if (this.isOp(",")) {
        this.pos++;
        items.push(this.relation());
      } else {
        this.pos++;
      }
    }
    return items.length === 1 ? items[0]! : { kind: "list", items };
  }

  private peek(): Token | undefined {
    return this.toks[this.pos];
  }

  private isOp(v: string): boolean {
    const tok = this.peek();
    return tok?.t === "op" && tok.v === v;
  }

  private relation(): Node {
    const parts = [this.sum()];
    const ops: RelOp[] = [];
    for (let tok = this.peek(); tok?.t === "op" && REL_OPS.has(tok.v); tok = this.peek()) {
      this.pos++;
      ops.push(tok.v as RelOp);
      parts.push(this.sum());
    }
    return ops.length === 0 ? parts[0]! : { kind: "rel", ops, parts };
  }

  private sum(): Node {
    let left: Node;
    const lead = this.peek();
    if (lead?.t === "op" && (lead.v === "-" || lead.v === "±")) {
      this.pos++;
      left = { kind: "neg", sign: lead.v, arg: this.term() };
    } else {
      if (lead?.t === "op" && lead.v === "+") this.pos++;
      left = this.term();
    }
    for (let tok = this.peek(); tok?.t === "op" && "+-±".includes(tok.v); tok = this.peek()) {
      this.pos++;
      left = { kind: "bin", op: tok.v as BinOp, left, right: this.signedTerm() };
    }
    return left;
  }

  // A negative number right after a plus or minus: "18 + -11", "18 - -11".
  private signedTerm(): Node {
    if (!this.isOp("-")) return this.term();
    this.pos++;
    return { kind: "neg", sign: "-", arg: this.term() };
  }

  private term(): Node {
    let left = this.fracUnit();
    for (;;) {
      const tok = this.peek();
      if (tok?.t === "op" && (tok.v === "*" || tok.v === "×" || tok.v === "÷")) {
        this.pos++;
        left = { kind: "bin", op: tok.v, left, right: this.fracUnit() };
      } else if (this.startsAtom()) {
        left = { kind: "bin", op: "implicit", left, right: this.fracUnit() };
      } else {
        return left;
      }
    }
  }

  // "3x/4" is (3x)/4 and "1/2x" is (1/2)x: the numerator is the run of juxtaposed factors,
  // the denominator is one factor.
  private fracUnit(): Node {
    let node = this.product();
    while (this.isOp("/")) {
      this.pos++;
      node = { kind: "frac", num: node, den: this.power() };
    }
    return node;
  }

  private product(): Node {
    let left = this.power();
    while (this.startsAtom() && !this.isOp("/")) {
      left = { kind: "bin", op: "implicit", left, right: this.power() };
    }
    return left;
  }

  private power(): Node {
    const base = this.atom();
    const tok = this.peek();
    if (tok?.t === "sup") {
      this.pos++;
      return { kind: "pow", base, exp: { kind: "num", value: tok.v } };
    }
    if (this.isOp("^")) {
      this.pos++;
      const sign = this.peek();
      if (sign?.t === "op" && sign.v === "-") {
        this.pos++;
        return { kind: "pow", base, exp: { kind: "neg", sign: "-", arg: this.atom() } };
      }
      return { kind: "pow", base, exp: this.atom() };
    }
    return base;
  }

  private startsAtom(): boolean {
    const tok = this.peek();
    if (!tok) return false;
    return tok.t === "num" || tok.t === "id" || (tok.t === "op" && (tok.v === "(" || tok.v === "√"));
  }

  private atom(): Node {
    const tok = this.peek();
    if (!tok) return { kind: "missing" };
    if (tok.t === "num") {
      this.pos++;
      return { kind: "num", value: tok.v };
    }
    if (tok.t === "id") {
      this.pos++;
      return tok.v === "pi" ? { kind: "pi" } : { kind: "var", name: tok.v };
    }
    if (tok.t === "op" && tok.v === "√") {
      this.pos++;
      return { kind: "sqrt", arg: unwrap(this.power()) };
    }
    if (tok.t === "op" && tok.v === "(") {
      this.pos++;
      const body = this.isOp(")") ? ({ kind: "missing" } as const) : this.relation();
      if (this.isOp(")")) this.pos++; // an unclosed "(" closes itself at the end
      return { kind: "group", body };
    }
    return { kind: "missing" };
  }
}

export function unwrap(node: Node): Node {
  return node.kind === "group" ? node.body : node;
}

export function parseMath(src: string): Node {
  return new Parser(tokenize(src)).parse();
}
