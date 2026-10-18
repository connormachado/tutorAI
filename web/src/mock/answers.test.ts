import { describe, expect, it } from "vitest";
import { checkAnswer, readAnswer } from "./answers";

describe("readAnswer", () => {
  it.each([
    ["5", [5]],
    ["x = 5", [5]],
    ["5=x", [5]],
    ["x=10/2", [5]],
    ["x = 7 or x = -7", [7, -7]],
    ["7, -7", [7, -7]],
    ["±7", [7, -7]],
    ["sqrt(49)", [7]],
  ])("%s", (text, values) => {
    expect(readAnswer(text)).toEqual(values);
  });

  it("refuses anything that isn't a number", () => {
    expect(readAnswer("banana")).toBeNull();
    expect(readAnswer("x + 1")).toBeNull();
    expect(readAnswer("x < 5")).toBeNull();
    expect(readAnswer("")).toBeNull();
  });
});

describe("checkAnswer", () => {
  it("grades against the solution set", () => {
    expect(checkAnswer("x=5", [5])).toBe("correct");
    expect(checkAnswer("x=6", [5])).toBe("incorrect");
    expect(checkAnswer("7", [7, -7])).toBe("partial");
    expect(checkAnswer("±7", [7, -7])).toBe("correct");
    expect(checkAnswer("7, 8", [7, -7])).toBe("incorrect");
    expect(checkAnswer("hmm", [5])).toBe("unreadable");
  });
});
