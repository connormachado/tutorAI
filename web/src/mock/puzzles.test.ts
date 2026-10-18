import { describe, expect, it } from "vitest";
import { PALETTE } from "../content/palette";
import type { PuzzleMove, PuzzleTemplate, Skin } from "../content/types";
import { seeded } from "./generate";
import {
  gradeMove, INTERESTS, ITEMS, line, type LivePuzzle, newPuzzle, nextHint, SKINS, skinFor, toWire,
} from "./puzzles";

const TEMPLATES: PuzzleTemplate[] = ["spot_the_error", "missing_step", "balance"];
const skin = SKINS.soccer;

function live<T extends PuzzleTemplate>(template: T, seed = 1) {
  return newPuzzle(template, seeded(seed), `${template}-1`) as Extract<LivePuzzle, { template: T }>;
}

/** Grades a move and records its outcome, the way the mock server does. */
function play(p: LivePuzzle, move: PuzzleMove) {
  const v = gradeMove(p, move, skin);
  if (v) {
    p.outcomes[v.check] = v.outcome;
    if (v.pans && p.template === "balance") p.pans = v.pans;
  }
  return v;
}

// Nicknames of real pro teams (NFL, NBA, MLB, NHL, MLS, WNBA, Premier League) and common club
// words. A skin's team may share none.
const REAL_TEAMS = `cardinals falcons ravens bills panthers bears bengals browns cowboys broncos lions packers
  texans colts jaguars chiefs raiders chargers rams dolphins vikings patriots saints giants jets eagles steelers
  49ers seahawks buccaneers titans commanders hawks celtics nets hornets bulls cavaliers mavericks nuggets pistons
  warriors rockets pacers clippers lakers grizzlies heat bucks timberwolves pelicans knicks thunder magic 76ers suns
  blazers kings spurs raptors jazz wizards diamondbacks braves orioles sox cubs reds guardians rockies tigers astros
  royals angels dodgers marlins brewers twins mets yankees athletics phillies pirates padres mariners rays rangers
  jays nationals ducks bruins sabres flames hurricanes blackhawks avalanche jackets stars wings oilers wild
  canadiens predators devils islanders senators flyers penguins sharks kraken blues lightning leafs canucks knights
  capitals mammoth galaxy sounders timbers whitecaps earthquakes dynamo rapids revolution herons aces dream fever
  liberty lynx mercury mystics sparks storm valkyries sky sun tempo union crew fire united city inter
  foxes gunners toffees magpies hammers villans villa cherries bees seagulls clarets cottagers wolves citizens
  canaries owls blades potters baggies cats forest palace rovers wanderers albion athletic county`.split(/\s+/);

describe("interest skins", () => {
  it("fills every slot, with Platy's own colors and made-up teams (R-35)", () => {
    for (const interest of INTERESTS) {
      const s: Skin = SKINS[interest];
      expect(s.interest).toBe(interest);
      expect(PALETTE[s.colors]).toBeDefined();
      expect(s.player_names).toHaveLength(3);
      for (const word of Object.values(s.words)) expect(word.trim()).not.toBe("");
      const words = s.team_name.toLowerCase().split(/\s+/);
      expect(words.filter((w) => REAL_TEAMS.includes(w)), s.team_name).toEqual([]);
    }
  });

  it("names each team so it reads after 'the'", () => {
    for (const interest of INTERESTS) {
      const intro = line(live("spot_the_error"), SKINS[interest], (i) => i.intro);
      expect(intro).not.toMatch(/\bthe team\b/i);
    }
  });

  it("lets the student's color pick replace the interest's default", () => {
    expect(skinFor("gaming", null).colors).toBe("purple_black");
    expect(skinFor("gaming", "green_gold")).toEqual({ ...SKINS.gaming, colors: "green_gold" });
  });
});

describe("puzzle items", () => {
  it("fills every line of text for every skin, with no slot left over", () => {
    for (const template of TEMPLATES) {
      const item = ITEMS[template];
      const texts = [
        item.intro, item.instructions, item.reflection, item.thanks, ...item.hints,
        ...Object.values(item.replies), ...Object.values(item.asks).flatMap((a) => [a.ask, a.nudge]),
      ];
      for (const interest of INTERESTS) {
        const p = live(template);
        for (const t of texts) {
          const filled = line(p, SKINS[interest], () => t!, { g: 2 });
          expect(filled, t).not.toMatch(/\{\w+\}/);
        }
      }
    }
  });

  it("keeps the math when the skin changes, so a new look never changes the problem", () => {
    const p = live("balance");
    const a = toWire(p, SKINS.soccer);
    const b = toWire(p, SKINS.gaming);
    expect(b.instance_id).toBe(a.instance_id);
    expect(b.equation).toBe(a.equation);
    expect(b.instructions).not.toBe(a.instructions);
  });

  it("says one ball, not one balls", () => {
    const p = live("balance");
    p.n = { ...p.n, b: 1 };
    p.hints = 2;
    expect(nextHint(p, skin)).toContain("Take 1 ball off both sides");
  });

  it("has three hints, none of which gives the answer (R-02)", () => {
    for (const template of TEMPLATES) {
      for (let seed = 1; seed <= 50; seed++) {
        const p = live(template, seed);
        for (let i = 0; i < 3; i++, p.hints++) expect(nextHint(p, skin)).not.toContain(`x = ${p.n.answer}`);
        expect(nextHint(p, skin)).toBeNull();
      }
    }
  });
});

describe("spot the error grading", () => {
  it("walks find, fix, finish to solved", () => {
    const p = live("spot_the_error");
    const { a, b, c, answer } = p.n;
    expect(play(p, { check: "found_error", line: 0 })).toMatchObject({ outcome: "correct", solved: false });
    expect(play(p, { check: "fixed_step", text: `${a}x = ${c + b}` })).toMatchObject({ outcome: "correct" });
    const done = play(p, { check: "final_answer", text: `x = ${answer}` });
    expect(done).toMatchObject({ outcome: "correct", solved: true });
    expect(done?.reply).toContain(`x = ${answer}`);
  });

  it("asks about the tapped line instead of saying which is wrong (R-03)", () => {
    const p = live("spot_the_error");
    const v = play(p, { check: "found_error", line: 1 });
    expect(v).toMatchObject({ outcome: "incorrect", ask: ITEMS.spot_the_error.asks.wrong_line });
  });

  it("won't take the problem copied out, or an equivalent line that isn't the step", () => {
    const p = live("spot_the_error");
    const { a, b, c } = p.n;
    play(p, { check: "found_error", line: 0 });
    expect(play(p, { check: "fixed_step", text: `${a}x - ${b} = ${c}` })?.outcome).toBe("incorrect");
    expect(play(p, { check: "fixed_step", text: `${a}x + 1 = ${c + b + 1}` })?.outcome).toBe("incorrect");
    expect(play(p, { check: "fixed_step", text: `${a}x = ${c} + ${b}` })?.outcome).toBe("correct");
  });

  it("treats taking b away a second time as the same slip", () => {
    const p = live("spot_the_error");
    const { a, b, c } = p.n;
    play(p, { check: "found_error", line: 0 });
    expect(play(p, { check: "fixed_step", text: `${a}x - ${b} - ${b} = ${c} - ${b}` })?.ask?.ask).toContain("What did your line do to the");
    // The problem copied out isn't "where it ends up", so it gets the plain question.
    expect(play(p, { check: "fixed_step", text: `${a}x - ${b} = ${c}` })?.ask?.ask).toBe("How did you get that line from the problem above it?");
  });

  it("spots the same slip again, and a line that skips ahead", () => {
    const p = live("spot_the_error");
    const { a, b, c, answer } = p.n;
    play(p, { check: "found_error", line: 0 });
    const again = play(p, { check: "fixed_step", text: `${a}x = ${c - b}` });
    expect(again?.ask?.ask).toContain(`What did your line do to the $${b}$`);
    expect(play(p, { check: "fixed_step", text: `x = ${answer}` })?.ask?.ask).toContain("before dividing");
    expect(play(p, { check: "fixed_step", text: "x + 1 =" })).toMatchObject({ outcome: "unreadable" });
  });

  it("never grades a step out of order", () => {
    const p = live("spot_the_error");
    expect(gradeMove(p, { check: "fixed_step", text: "2x = 16" }, skin)).toBeNull();
    expect(gradeMove(p, { check: "missing_line", text: "2x = 16" }, skin)).toBeNull();
  });

  it("asks for x on its own when the final answer is a true line that isn't finished", () => {
    const p = live("spot_the_error");
    const { a, b, c, answer } = p.n;
    play(p, { check: "found_error", line: 0 });
    play(p, { check: "fixed_step", text: `${a}x = ${c + b}` });
    const v = play(p, { check: "final_answer", text: `${a}x = ${c + b}` });
    expect(v).toMatchObject({ outcome: "incorrect", ask: { ask: "That line's true. What's x on its own?" } });
    expect(play(p, { check: "final_answer", text: `${answer} = x` })).toMatchObject({ outcome: "correct", solved: true });
  });

  it("takes x on its own in any form, the way the item's equivalent_to check says", () => {
    for (const form of ["x = N", "N = x", "1x = N", "N = 1x", "x + 0 = N", "(x) = N", "x/1 = N", "X = N", "N"]) {
      const p = live("spot_the_error");
      const { a, b, c, answer } = p.n;
      play(p, { check: "found_error", line: 0 });
      play(p, { check: "fixed_step", text: `${a}x = ${c + b}` });
      expect(play(p, { check: "final_answer", text: form.replace("N", String(answer)) }), form).toMatchObject({ outcome: "correct", solved: true });
    }
  });

  it("won't take another letter for x", () => {
    const p = live("spot_the_error");
    const { a, b, c, answer } = p.n;
    play(p, { check: "found_error", line: 0 });
    play(p, { check: "fixed_step", text: `${a}x = ${c + b}` });
    expect(play(p, { check: "final_answer", text: `y = ${answer}` })?.outcome).toBe("unreadable");
  });

  it("reads the whole line, not just the part before a stray symbol", () => {
    const p = live("spot_the_error");
    const { a, b, c, answer } = p.n;
    play(p, { check: "found_error", line: 0 });
    for (const junk of [") - 5", " ] 3", " # 3", " % 3"]) {
      expect(play(p, { check: "fixed_step", text: `${a}x = ${c + b}${junk}` })?.outcome, junk).toBe("unreadable");
    }
    play(p, { check: "fixed_step", text: `${a}x = ${c + b}` });
    expect(play(p, { check: "final_answer", text: `x = ${answer * 2} : 2` })?.outcome).toBe("unreadable");
  });

  it("notices when the final answer is the old line's answer", () => {
    const p = live("spot_the_error");
    const { a, b, c } = p.n;
    play(p, { check: "found_error", line: 0 });
    play(p, { check: "fixed_step", text: `${c + b} = ${a}x` });
    const old = Number(p.n.lines[1]!.split("=")[1]);
    expect(play(p, { check: "final_answer", text: String(old) })?.ask).toEqual(
      expect.objectContaining({ ask: expect.stringContaining("old line") }),
    );
  });
});

describe("missing step grading", () => {
  it("won't take the first line copied into the gap", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const p = live("missing_step", seed);
      const { a, b, c } = p.n;
      expect(play(p, { check: "missing_line", text: `${a}x + ${b} = ${c}` })?.outcome).toBe("incorrect");
      expect(play(p, { check: "missing_line", text: `${a}x + ${b + 1} = ${c + 1}` })?.outcome).toBe("incorrect");
    }
  });

  it("accepts the missing line with its sides swapped", () => {
    const p = live("missing_step");
    const { a, b, c } = p.n;
    expect(play(p, { check: "missing_line", text: `${c - b} = ${a}x` })).toMatchObject({ outcome: "correct", solved: true });
  });

  it("asks about adding instead of subtracting, and about skipping ahead", () => {
    const p = live("missing_step");
    const { a, b, c, answer } = p.n;
    expect(play(p, { check: "missing_line", text: `${a}x = ${c + b}` })?.ask?.ask).toContain(`adds $${b}$`);
    expect(play(p, { check: "missing_line", text: `x = ${answer}` })?.ask?.ask).toContain("where the solution ends up");
    expect(play(p, { check: "missing_line", text: `${a}x = 1` })?.ask?.ask).toContain("from the problem");
  });
});

describe("balance grading", () => {
  it("refuses splitting first and asks about the loose units", () => {
    const p = live("balance");
    const v = play(p, { check: "move", move: { op: "split", groups: p.n.a } });
    expect(v?.outcome).toBe("incorrect");
    expect(v?.ask?.ask).toBe(`What happens to the loose balls if you split both sides into $${p.n.a}$ groups?`);
    expect(p.pans).toEqual(p.n.start);
  });

  it("asks about the x-containers when they're what won't split", () => {
    const p = live("balance");
    play(p, { check: "move", move: { op: "remove_units", n: p.n.b } });
    const v = play(p, { check: "move", move: { op: "split", groups: p.n.a + 1 } });
    expect(v?.ask?.ask).toBe(`How many kit bags would go in each group if you split both sides into $${p.n.a + 1}$ groups?`);
    expect(v?.ask?.nudge).not.toContain("take away");
  });

  it("solves in two moves and then takes no more", () => {
    const p = live("balance");
    expect(play(p, { check: "move", move: { op: "remove_units", n: p.n.b } })).toMatchObject({ outcome: "correct", solved: false });
    const done = play(p, { check: "move", move: { op: "split", groups: p.n.a } });
    expect(done).toMatchObject({ check: "move", outcome: "correct", solved: true });
    expect(done?.reply).toContain(`$x = ${p.n.answer}$`);
    p.outcomes.solved = "correct";
    expect(gradeMove(p, { check: "move", move: { op: "start_over" } }, skin)).toBeNull();
  });
});
