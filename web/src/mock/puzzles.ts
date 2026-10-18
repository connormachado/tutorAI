import { applyMove, isSolved } from "../content/balance";
import { balanceStage, missingStage, type Outcomes, spotStage } from "../content/progress";
import type { CheckId, CheckOutcome, PaletteId, Pans, Puzzle, PuzzleMove, PuzzleTemplate, Skin } from "../content/types";
import {
  balance, type BalanceInstance, type MissingInstance, missingStep, type Rng, type SpotInstance, spotTheError,
} from "./generate";
import { bareNumber, hasSolution, readable, sameLine } from "./grade";

// Mock-only puzzle items, interest skins and grading. They stand in for the server (R-32,
// R-35): pick an item, generate an instance, resolve the skin, grade each move, and pick the
// tutor's ask-first line for a miss (R-03). Item text follows content/prompts/puzzle-v1.md;
// the spot-the-error item is content/prompts/examples/lin2-undo-sign-spot-error.json.
// Everything here is fake content (P-13).

export type Interest = "soccer" | "football" | "gaming" | "neutral";

export const INTERESTS: Interest[] = ["soccer", "football", "gaming", "neutral"];

// Made-up teams in real-looking colors. Never a real team's name, logo or players (R-35).
export const SKINS: Record<Interest, Skin> = {
  soccer: {
    interest: "soccer", colors: "teal_silver", team_name: "Harbor Puffins", emblem: "wave",
    player_names: ["Ade", "Lucía", "Kenji"],
    words: { container: "kit bag", containers: "kit bags", unit: "ball", units: "balls" },
  },
  football: {
    interest: "football", colors: "orange_navy", team_name: "Canyon Meteors", emblem: "star",
    player_names: ["Marcus", "Priya", "Diego"],
    words: { container: "crate", containers: "crates", unit: "football", units: "footballs" },
  },
  gaming: {
    interest: "gaming", colors: "purple_black", team_name: "Pixel Pandas", emblem: "bolt",
    player_names: ["Rin", "Sam", "Zoe"],
    words: { container: "loot chest", containers: "loot chests", unit: "coin", units: "coins" },
  },
  neutral: {
    interest: "neutral", colors: "blue_red", team_name: "Platy Squad", emblem: "shield",
    player_names: ["Maya", "Omar", "Lena"],
    words: { container: "bag", containers: "bags", unit: "block", units: "blocks" },
  },
};

/** The interest's skin with the student's own picks on top. */
export function skinFor(interest: Interest, colors: PaletteId | null): Skin {
  return colors ? { ...SKINS[interest], colors } : SKINS[interest];
}

export interface Ask {
  /** One kind question that gets the student to explain, without naming the slip. */
  ask: string;
  /** For after they explain: points at the fix without giving it. */
  nudge: string;
}

export interface Item {
  item_id: string;
  template: PuzzleTemplate;
  skill_id: string;
  /** The tutor's line as the puzzle opens. */
  intro: string;
  instructions: string;
  /** Graduated; the tutor never gives one before a first try (R-02). */
  hints: [string, string, string];
  /** Tutor lines after a correct check, by check id. */
  replies: Partial<Record<CheckId, string>>;
  asks: Record<string, Ask>;
  /** R-30: asked once the puzzle is solved. */
  reflection: string;
  thanks: string;
}

// Text fills from {name} slots: the skin's words and the instance's numbers. LaTeX in here
// avoids braces so it can't be mistaken for a slot.
export const ITEMS: Record<PuzzleTemplate, Item> = {
  spot_the_error: {
    item_id: "lin2-undo-sign-spot-error",
    template: "spot_the_error",
    skill_id: "two_step_equations",
    intro: "{player} from the {team} solved this one, but something went wrong. Let's find it.",
    instructions: "One line in this solution is wrong. Tap it, then write what it should say.",
    hints: [
      "Go line by line. For each line, ask: does this undo what's being done to $x$?",
      "Look at how the 'minus' part was handled. What's the opposite of taking something away?",
      "To undo a subtraction, add the same amount to both sides. Which line didn't do that?",
    ],
    replies: {
      found_error: "Good eye. What should that line say instead?",
      fixed_step: "Yes. Now finish the problem from your line.",
      final_answer: "That's it, $x = {answer}$. Check: ${a} \\cdot {answer} - {b} = {c}$.",
    },
    asks: {
      wrong_line: {
        ask: "What does that line do to both sides, and does it follow from the line just above it?",
        nudge: "Check each line against the one before it, starting from the problem. Where does it stop following?",
      },
      same_op: {
        ask: "The equation takes ${b}$ away from ${a}x$. What did your line do to the ${b}$?",
        nudge: "Taking ${b}$ away a second time doesn't undo it. Think about what would put it back.",
      },
      skipped: {
        ask: "That's where it ends up. What does this line look like right after the first move, before dividing?",
        nudge: "This line still has ${a}x$ on one side.",
      },
      fix_other: {
        ask: "How did you get that line from the problem above it?",
        nudge: "Look at what happens to the ${b}$. What undoes taking it away?",
      },
      old_answer: {
        ask: "That's what the old line gave. Does it still follow from your fixed line?",
        nudge: "Start from your fixed line. What's still being done to $x$?",
      },
      final_other: {
        ask: "How did you get that from your fixed line?",
        nudge: "What's still being done to $x$ in your fixed line?",
      },
      not_alone: {
        ask: "That line's true. What's x on its own?",
        nudge: "What's still being done to $x$ in that line?",
      },
    },
    reflection: "What made you suspect that line? Where would you start looking next time?",
    thanks: "Thanks. Checking each line against the one above it catches a lot of slips.",
  },
  missing_step: {
    item_id: "lin2-missing-step",
    template: "missing_step",
    skill_id: "two_step_equations",
    intro: "{player} solved this for the {team}, but a line went missing.",
    instructions: "One line of {player}'s solution is missing. Write the line that goes in the gap.",
    hints: [
      "Look at the problem and the last line. What has to happen to get from one to the other?",
      "Before you can divide, the ${b}$ has to go. What undoes adding it?",
      "Subtract ${b}$ from both sides. What line does that leave?",
    ],
    replies: {
      missing_line: "Yes, that's the missing step. Then dividing by ${a}$ gives $x = {answer}$.",
    },
    asks: {
      same_op: {
        ask: "The equation adds ${b}$ to ${a}x$. What did your line do to the ${b}$?",
        nudge: "Adding ${b}$ again doesn't undo it. What does?",
      },
      skipped: {
        ask: "That's true, but it's where the solution ends up. What does the line look like right after the first move?",
        nudge: "The missing line still has ${a}x$ in it.",
      },
      other: {
        ask: "How did you get that from the problem?",
        nudge: "What has to happen to the ${b}$ before you can divide?",
      },
    },
    reflection: "How did you work out what was missing? Would that help on a problem with no gaps?",
    thanks: "Thanks. Thinking about what has to happen between two lines is how you plan a solution.",
  },
  balance: {
    item_id: "lin2-balance",
    template: "balance",
    skill_id: "two_step_equations",
    intro: "This one's a balance scale. Every {container} holds the same number of {units}. How many?",
    instructions: "Get one {container} alone without tipping the scale.",
    hints: [
      "What's on the side with the {containers}, besides the {containers}?",
      "Take away the loose {units} first, from both sides so it stays level.",
      "Take {b_units} off both sides, then split what's left.",
    ],
    replies: {
      solved: "Level, and one {container} is alone. Each {container} holds {answer_units}, so $x = {answer}$.",
    },
    asks: {
      uneven_units: {
        ask: "What happens to the loose {units} if you split both sides into ${g}$ groups?",
        nudge: "A split only works if everything shares out evenly. Is there something to take away first?",
      },
      uneven_x: {
        ask: "How many {containers} would go in each group if you split both sides into ${g}$ groups?",
        nudge: "Try a number of groups that shares the {containers} out evenly.",
      },
      too_many: {
        ask: "How many loose {units} are on each side right now?",
        nudge: "You can only take away {units} that are on both sides.",
      },
      nothing: {
        ask: "What would you like to do to both sides?",
        nudge: "Try taking some {units} off, or splitting both sides into groups.",
      },
    },
    reflection: "Why did you take the {units} off before splitting? Would the other order have worked?",
    thanks: "Thanks. Undo the adding first, then the multiplying: it works the same way on paper.",
  },
};

interface LiveBase {
  item: Item;
  instance_id: string;
  outcomes: Outcomes;
  /** False until the first real attempt, so no hint comes before a try (R-02). */
  tried: boolean;
  hints: number;
  /** Incorrect checks so far, for the de-escalation ladder (R-21). */
  misses: number;
}

/** A puzzle the mock server is running: its numbers stay put when the skin changes. */
export type LivePuzzle =
  | (LiveBase & { template: "spot_the_error"; n: SpotInstance })
  | (LiveBase & { template: "missing_step"; n: MissingInstance })
  | (LiveBase & { template: "balance"; n: BalanceInstance; pans: Pans });

export function newPuzzle(template: PuzzleTemplate, rng: Rng, instance_id: string): LivePuzzle {
  const base = { item: ITEMS[template], instance_id, outcomes: {}, tried: false, hints: 0, misses: 0 };
  switch (template) {
    case "spot_the_error":
      return { ...base, template, n: spotTheError(rng) };
    case "missing_step":
      return { ...base, template, n: missingStep(rng) };
    case "balance": {
      const n = balance(rng);
      return { ...base, template, n, pans: n.start };
    }
  }
}

type Vars = Record<string, string | number>;

function vars(live: LivePuzzle, skin: Skin): Vars {
  const { a, b, c, answer } = live.n;
  const w = skin.words;
  const v: Vars = { ...w, team: skin.team_name, player: skin.player_names[0] ?? "", a, b, c, answer };
  v.answer_units = `${answer} ${answer === 1 ? w.unit : w.units}`;
  v.b_units = `${b} ${b === 1 ? w.unit : w.units}`;
  return v;
}

export function fill(text: string, v: Vars): string {
  return text.replace(/\{(\w+)\}/g, (slot, key: string) => (key in v ? String(v[key]) : slot));
}

/** What the tutor says, filled for this puzzle and skin. */
export function line(live: LivePuzzle, skin: Skin, pick: (item: Item) => string, extra: Vars = {}): string {
  return fill(pick(live.item), { ...vars(live, skin), ...extra });
}

export function toWire(live: LivePuzzle, skin: Skin): Puzzle {
  const base = {
    item_id: live.item.item_id,
    instance_id: live.instance_id,
    skill_id: live.item.skill_id,
    instructions: line(live, skin, (i) => i.instructions),
    equation: live.n.latex,
    skin,
  };
  switch (live.template) {
    case "spot_the_error":
      return { ...base, template: live.template, lines: live.n.linesLatex };
    case "missing_step":
      return { ...base, template: live.template, lines: live.n.linesLatex };
    case "balance":
      return { ...base, template: live.template, start: live.n.start };
  }
}

export interface Verdict {
  check: CheckId;
  outcome: CheckOutcome;
  /** The tutor's line after a correct check. An ordinary scale move gets none. */
  reply?: string;
  /** The ask-first pair after a miss (R-03). */
  ask?: Ask;
  /** Balance: the pans after an accepted move. */
  pans?: Pans;
  /** The puzzle is finished. */
  solved: boolean;
}

/** Grades one move. Null when the move doesn't belong to this puzzle or its current stage. */
export function gradeMove(live: LivePuzzle, move: PuzzleMove, skin: Skin): Verdict | null {
  const say = (pick: (item: Item) => string | undefined, extra: Vars = {}) =>
    line(live, skin, (i) => pick(i) ?? "", extra) || undefined;
  const miss = (check: CheckId, key: string, extra: Vars = {}): Verdict => {
    const a = live.item.asks[key]!;
    const ask = { ask: line(live, skin, () => a.ask, extra), nudge: line(live, skin, () => a.nudge, extra) };
    return { check, outcome: "incorrect", ask, solved: false };
  };
  const pass = (check: CheckId, solved = false): Verdict => ({
    check, outcome: "correct", reply: say((i) => i.replies[check]), solved,
  });
  const unreadable = (check: CheckId): Verdict => ({ check, outcome: "unreadable", solved: false });

  switch (live.template) {
    case "spot_the_error": {
      const n = live.n;
      const stage = spotStage(live.outcomes);
      if (move.check === "found_error" && stage === "find") {
        return move.line === 0 ? pass("found_error") : miss("found_error", "wrong_line");
      }
      if (move.check === "fixed_step" && stage === "fix") {
        const t = move.text;
        if (!readable(t)) return unreadable("fixed_step");
        if (sameLine(t, n.fix)) return pass("fixed_step");
        // Taking b away again, whether simplified or written out as "- b - b".
        if (sameLine(t, n.slip) || sameLine(t, `${n.a}*x - ${2 * n.b} = ${n.c - n.b}`)) return miss("fixed_step", "same_op");
        if (sameLine(t, `x = ${n.answer}`)) return miss("fixed_step", "skipped");
        return miss("fixed_step", "fix_other");
      }
      if (move.check === "final_answer" && stage === "finish") {
        // The item's check is equivalent_to x = {answer}: "x = 12", "12 = x" and "1x = 12" are
        // x on its own, and a bare number counts too. Another true line isn't finished yet.
        const t = move.text;
        const wrong = Number(n.lines[1]!.split("=")[1]);
        if (readable(t)) {
          if (sameLine(t, `x = ${n.answer}`)) return pass("final_answer", true);
          if (hasSolution(t, n.answer)) return miss("final_answer", "not_alone");
          return miss("final_answer", hasSolution(t, wrong) ? "old_answer" : "final_other");
        }
        const value = bareNumber(t);
        if (value === null) return unreadable("final_answer");
        const is = (k: number) => Math.abs(value - k) < 1e-9;
        if (is(n.answer)) return pass("final_answer", true);
        return miss("final_answer", is(wrong) ? "old_answer" : "final_other");
      }
      return null;
    }
    case "missing_step": {
      const n = live.n;
      if (move.check !== "missing_line" || missingStage(live.outcomes) !== "fill") return null;
      const t = move.text;
      if (!readable(t)) return unreadable("missing_line");
      if (sameLine(t, n.expected)) return pass("missing_line", true);
      // Adding b again, simplified or written out as "+ b + b".
      if (sameLine(t, n.slip) || sameLine(t, `${n.a}*x + ${2 * n.b} = ${n.c + n.b}`)) return miss("missing_line", "same_op");
      if (sameLine(t, `x = ${n.answer}`)) return miss("missing_line", "skipped");
      return miss("missing_line", "other");
    }
    case "balance": {
      if (move.check !== "move" || balanceStage(live.outcomes) !== "play") return null;
      const r = applyMove(live.pans, live.n.start, move.move);
      if (!r.ok) return miss("move", r.reason, move.move.op === "split" ? { g: move.move.groups } : {});
      if (isSolved(r.pans)) return { ...pass("solved", true), check: "move", pans: r.pans };
      return { check: "move", outcome: "correct", pans: r.pans, solved: false };
    }
  }
}

/** The next hint, or null when they're used up. */
export function nextHint(live: LivePuzzle, skin: Skin): string | null {
  const hint = live.item.hints[live.hints];
  return hint === undefined ? null : line(live, skin, () => hint);
}
