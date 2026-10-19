// Content items on the wire (R-37, R-38; docs/content-library.md §6). The server picks the
// item, generates its problem, resolves the skin and grades every check. The browser only
// shows the puzzle and reports what the student did; it never decides "correct".

export type PuzzleTemplate = "spot_the_error" | "missing_step" | "balance";

export type PaletteId = "red_pewter" | "blue_red" | "green_gold" | "purple_black" | "orange_navy" | "teal_silver";

/** Platy's own emblem art. Never a real team's logo (R-38). */
export type EmblemId = "star" | "bolt" | "shield" | "wave";

/**
 * R-38 slot values, already resolved by the server: the interest skin's defaults, then the
 * student's own picks. Slots only change how a puzzle looks and reads, never its math.
 */
export interface Skin {
  interest: string;
  colors: PaletteId;
  team_name: string;
  player_names: string[];
  emblem: EmblemId;
  /** Setting words for the template's wording, e.g. container "kit bag", unit "ball". */
  words: { container: string; containers: string; unit: string; units: string };
}

/** One side of a balance scale: how many x-containers and loose units sit on it. */
export interface Pan {
  x: number;
  units: number;
}

export interface Pans {
  left: Pan;
  right: Pan;
}

interface PuzzleBase {
  item_id: string;
  /** One generated problem of the item. A new instance means a fresh puzzle. */
  instance_id: string;
  skill_id: string;
  /** Already filled in with the skin's words and the instance's numbers. */
  instructions: string;
  /** The problem being solved, as LaTeX. */
  equation: string;
  skin: Skin;
}

export interface SpotTheErrorPuzzle extends PuzzleBase {
  template: "spot_the_error";
  /** The flawed solution, one LaTeX line per step. Exactly one is wrong. */
  lines: string[];
}

export interface MissingStepPuzzle extends PuzzleBase {
  template: "missing_step";
  /** The solution with one line blanked out (null). */
  lines: (string | null)[];
}

export interface BalancePuzzle extends PuzzleBase {
  template: "balance";
  start: Pans;
}

export type Puzzle = SpotTheErrorPuzzle | MissingStepPuzzle | BalancePuzzle;

export type BalanceMove = { op: "remove_units"; n: number } | { op: "split"; groups: number } | { op: "start_over" };

/** What the student did, for the server to grade. */
export type PuzzleMove =
  | { check: "found_error"; line: number }
  | { check: "fixed_step"; text: string }
  | { check: "final_answer"; text: string }
  | { check: "missing_line"; text: string }
  | { check: "move"; move: BalanceMove };

export type CheckId = PuzzleMove["check"] | "solved";

export type CheckOutcome = "correct" | "incorrect" | "unreadable";
