import type { BalanceMove, Pan, Pans } from "./types";

// Balance-scale arithmetic, shared by the player (to draw the pans) and the mock server (to
// grade). Every move is applied to both pans at once, so the scale is always level; a move
// that can't be done to both sides is refused with a reason the tutor can ask about.

export type MoveResult =
  | { ok: true; pans: Pans }
  | { ok: false; reason: "too_many" | "uneven_x" | "uneven_units" | "nothing" };

export function applyMove(pans: Pans, start: Pans, move: BalanceMove): MoveResult {
  switch (move.op) {
    case "start_over":
      return { ok: true, pans: start };
    case "remove_units": {
      const n = move.n;
      // The browser's counts aren't trusted: 1.5 or NaN would pass the comparisons below.
      if (!Number.isInteger(n) || n < 1) return { ok: false, reason: "nothing" };
      if (n > pans.left.units || n > pans.right.units) return { ok: false, reason: "too_many" };
      return { ok: true, pans: { left: take(pans.left, n), right: take(pans.right, n) } };
    }
    case "split": {
      const g = move.groups;
      if (!Number.isInteger(g) || g < 2) return { ok: false, reason: "nothing" };
      const sides = [pans.left, pans.right];
      // Name the x-containers first: if they won't share out, taking units away can't help.
      if (!sides.every((p) => p.x % g === 0)) return { ok: false, reason: "uneven_x" };
      if (!sides.every((p) => p.units % g === 0)) return { ok: false, reason: "uneven_units" };
      return { ok: true, pans: { left: share(pans.left, g), right: share(pans.right, g) } };
    }
  }
}

const take = (p: Pan, n: number): Pan => ({ x: p.x, units: p.units - n });
const share = (p: Pan, g: number): Pan => ({ x: p.x / g, units: p.units / g });

/** True when one x-container is alone on one pan and only units are on the other. */
export function isSolved({ left, right }: Pans): boolean {
  const alone = (p: Pan) => p.x === 1 && p.units === 0;
  const onlyUnits = (p: Pan) => p.x === 0;
  return (alone(left) && onlyUnits(right)) || (alone(right) && onlyUnits(left));
}

export function panLatex({ x, units }: Pan): string {
  const parts: string[] = [];
  if (x > 0) parts.push(x === 1 ? "x" : `${x}x`);
  if (units > 0 || x === 0) parts.push(String(units));
  return parts.join(" + ");
}

export function pansLatex(p: Pans): string {
  return `${panLatex(p.left)} = ${panLatex(p.right)}`;
}
