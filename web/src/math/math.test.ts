import { describe, expect, it } from "vitest";
import { splitMath } from "./MathText";
import { kidMathToLatex } from "./latex";

describe("kidMathToLatex", () => {
  it.each([
    ["3x+5=20", "3x + 5 = 20"],
    ["x^2", "{x}^{2}"],
    ["x²=49", "{x}^{2} = 49"],
    ["x^(n+1)", "{x}^{n + 1}"],
    ["sqrt(49)", "\\sqrt{49}"],
    ["√49", "\\sqrt{49}"],
    ["3/4", "\\frac{3}{4}"],
    ["3x/4", "\\frac{3x}{4}"],
    ["1/2x", "\\frac{1}{2}x"],
    ["(x+1)/(x-1)", "\\frac{x + 1}{x - 1}"],
    ["2(x-3)=10", "2 \\left(x - 3\\right) = 10"],
    ["x<=4", "x \\le 4"],
    ["±7", "\\pm 7"],
    ["±x", "\\pm x"],
    ["7, -7", "7,\\ -7"],
    ["2*3", "2 \\cdot 3"],
    ["2 3", "2 \\cdot 3"],
    ["pi x", "\\pi x"],
  ])("%s", (src, latex) => {
    expect(kidMathToLatex(src)).toBe(latex);
  });

  it("shows a box for what the kid hasn't typed yet", () => {
    expect(kidMathToLatex("x^")).toBe("{x}^{\\square}");
    expect(kidMathToLatex("3/")).toBe("\\frac{3}{\\square}");
  });

  it("closes an open parenthesis instead of failing", () => {
    expect(kidMathToLatex("2(x-3")).toBe("2 \\left(x - 3\\right)");
  });

  it("is empty for empty input", () => {
    expect(kidMathToLatex("  ")).toBe("");
  });
});

describe("splitMath", () => {
  it("splits inline $math$ from text", () => {
    expect(splitMath("Subtract $5$ from both sides.")).toEqual([
      { math: false, value: "Subtract " },
      { math: true, value: "5" },
      { math: false, value: " from both sides." },
    ]);
  });

  it("leaves an unclosed $ as text", () => {
    expect(splitMath("Get $3x")).toEqual([{ math: false, value: "Get $3x" }]);
  });
});
