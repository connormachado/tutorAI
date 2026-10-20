import { describe, expect, it } from "vitest";
import { KEYPAD, press, type Key } from "./keypad";
import { parseMathStrict } from "./parse";

const key = (label: string): Key => {
  const found = [...KEYPAD.symbols, ...KEYPAD.numbers].find((k) => k.label === label);
  if (!found) throw new Error(`no key ${label}`);
  return found;
};

/** Presses keys in order into an empty box, the way a child taps them. */
function tap(...labels: string[]): string {
  let field = { value: "", start: 0, end: 0 };
  for (const label of labels) {
    const next = press(field, key(label).action);
    field = { value: next.value, start: next.caret, end: next.caret };
  }
  return field.value;
}

describe("keypad (R-18)", () => {
  it("types answers and steps the grader reads", () => {
    expect(tap("x", "=", "2", "5", "a⁄b", "3")).toBe("x=25/3");
    expect(tap("3", "(", "x", "−", "4", ")", "=", "1", "2")).toBe("3(x-4)=12");
    expect(tap("2", "x", "÷", "2", "=", "1", "2", "×", "3")).toBe("2x÷2=12×3");
    expect(tap("y", "=", "−", "0", ".", "5")).toBe("y=-0.5");
    expect(tap("x", "x²", "=", "4", "9")).toBe("x^2=49");
    expect(tap("7", ",", "−", "7")).toBe("7,-7");
    for (const text of ["x=25/3", "3(x-4)=12", "2x÷2=12×3", "y=-0.5", "x^2=49", "7,-7"]) {
      expect(parseMathStrict(text), text).not.toBeNull();
    }
  });

  it("inserts at the caret and replaces a selection", () => {
    expect(press({ value: "x=5", start: 2, end: 2 }, key("1").action)).toEqual({ value: "x=15", caret: 3 });
    expect(press({ value: "x=57", start: 2, end: 4 }, key("8").action)).toEqual({ value: "x=8", caret: 3 });
  });

  it("deletes the character before the caret, or the selection", () => {
    const back = key("⌫").action;
    expect(press({ value: "x=15", start: 4, end: 4 }, back)).toEqual({ value: "x=1", caret: 3 });
    expect(press({ value: "x=15", start: 2, end: 2 }, back)).toEqual({ value: "x15", caret: 1 });
    expect(press({ value: "x=15", start: 0, end: 0 }, back)).toEqual({ value: "x=15", caret: 0 });
    expect(press({ value: "x=15", start: 1, end: 4 }, back)).toEqual({ value: "x", caret: 1 });
  });

  it("moves the caret without running off either end", () => {
    const left = key("←").action;
    const right = key("→").action;
    expect(press({ value: "x=5", start: 2, end: 2 }, left)).toEqual({ value: "x=5", caret: 1 });
    expect(press({ value: "x=5", start: 0, end: 0 }, left)).toEqual({ value: "x=5", caret: 0 });
    expect(press({ value: "x=5", start: 3, end: 3 }, right)).toEqual({ value: "x=5", caret: 3 });
    // With a selection, an arrow lands on that side of it, like a text box does.
    expect(press({ value: "x=57", start: 2, end: 4 }, left)).toEqual({ value: "x=57", caret: 2 });
    expect(press({ value: "x=57", start: 2, end: 4 }, right)).toEqual({ value: "x=57", caret: 4 });
  });
});
