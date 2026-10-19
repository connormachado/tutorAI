import { describe, expect, it } from "vitest";
import { hasSolution, linearForm, readable, sameLine } from "./grade";

describe("mock puzzle grading", () => {
  it("reads a line the way a child types it", () => {
    expect(linearForm("2x = 16")).toEqual({ a: 2, b: -16 });
    expect(linearForm("2*x = 16")).toEqual({ a: 2, b: -16 });
    expect(linearForm("16 = 2X")).toEqual({ a: -2, b: 16 });
  });

  it("checks a line's solution like mathcheck's solution_set_is", () => {
    expect(hasSolution("2x = 16", 8)).toBe(true);
    expect(hasSolution("x = 8", 8)).toBe(true);
    expect(hasSolution("2x = 2", 8)).toBe(false);
    // An identity has every number as a solution, not exactly one.
    expect(hasSolution("x = x", 8)).toBe(false);
  });

  it("accepts the same line with its sides swapped or its sums not worked out yet", () => {
    expect(sameLine("2x = 16", "2*x = 16")).toBe(true);
    expect(sameLine("16 = 2x", "2*x = 16")).toBe(true);
    expect(sameLine("x*2 = 9 + 7", "2*x = 16")).toBe(true);
    expect(sameLine("2x - 7 + 7 = 9 + 7", "2*x = 16")).toBe(true);
  });

  it("reads a negative number after a plus or minus", () => {
    expect(sameLine("7x = 18 + -11", "7*x = 7")).toBe(true);
    expect(hasSolution("7x = 18 - -11", 29 / 7)).toBe(true);
  });

  it("compares any two lines side by side", () => {
    expect(sameLine("2x - 5 - 5 = 7 - 5", "2*x - 10 = 2")).toBe(true);
    expect(sameLine("2 = 2x - 10", "2*x - 10 = 2")).toBe(true);
    expect(sameLine("2x - 5 = 7", "2*x - 10 = 2")).toBe(false);
  });

  it("isn't fooled by a curve that meets the line at a few points", () => {
    expect(readable("x^3 - 3x^2 + 4x = 12")).toBe(false);
    expect(readable("2*sqrt(x^2) = 12")).toBe(false);
  });

  it("refuses an equivalent equation that isn't this step", () => {
    // Dividing is the next step, not this one, even though x = 8 is true.
    expect(sameLine("x = 8", "2*x = 16")).toBe(false);
    // The problem itself, or any line that still has a number beside the x.
    expect(sameLine("2x - 7 = 9", "2*x = 16")).toBe(false);
    expect(sameLine("2x + 12 = 28", "2*x = 16")).toBe(false);
    expect(sameLine("2x - 16 = 0", "2*x = 16")).toBe(false);
    expect(sameLine("-2x = -16", "2*x = 16")).toBe(false);
    expect(sameLine("2x = 2", "2*x = 16")).toBe(false);
  });

  it("calls anything that isn't one linear equation in x unreadable", () => {
    for (const text of ["8", "2x", "x^2 = 4", "1/x = 2", "y = 3", "2x = 16 = 2x", "", "hello"]) {
      expect(readable(text), text).toBe(false);
    }
  });
});
