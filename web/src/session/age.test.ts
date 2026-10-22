import { describe, expect, it } from "vitest";
import { isThirteenOrOlder } from "./age";

const today = { year: 2026, month: 10 };

describe("age check (R-36)", () => {
  it("turns away anyone who hasn't certainly turned 13", () => {
    expect(isThirteenOrOlder({ year: 2013, month: 9 }, today)).toBe(true);
    expect(isThirteenOrOlder({ year: 2000, month: 12 }, today)).toBe(true);
    // Born this month 13 years ago: without a day it might not have happened yet, so not yet.
    expect(isThirteenOrOlder({ year: 2013, month: 10 }, today)).toBe(false);
    expect(isThirteenOrOlder({ year: 2013, month: 11 }, today)).toBe(false);
    expect(isThirteenOrOlder({ year: 2016, month: 1 }, today)).toBe(false);
    expect(isThirteenOrOlder({ year: 2012, month: 12 }, { year: 2026, month: 1 })).toBe(true);
    // A birthday in the future is no answer at all.
    expect(isThirteenOrOlder({ year: 2026, month: 12 }, today)).toBe(false);
  });
});
