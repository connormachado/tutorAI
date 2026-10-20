# Math keypad under every math box (R-18), the 13+ age check (R-36), and Connor's two doc fixes

- **Who:** michael   **Area:** frontend
- **Branch / PR:** claude/content-library-design-txzs0z (restarted from main) / [draft PR #4](https://github.com/tutorai-hq/tutorAI/pull/4)
- **R-ids:** R-18 (and R-27, phone sizing), R-36   **gate:** green (`scripts/check`); `web/` tsc + vitest 128/128

## What changed
- The 8-key symbol row under the answer box is now a full keypad: x, y, x², brackets, fraction, comma, caret arrows, delete, a calculator pad (digits, point, ÷ × − + =) and a tall ↵ key that checks the answer (`web/src/components/MathInput.tsx`).
- Which keys exist and what each does to the box is a pure module, `web/src/math/keypad.ts`, tested in `web/src/math/keypad.test.ts` (acceptance test: "types answers and steps the grader reads", which runs keypad output through `parseMathStrict`).
- Phones and tablets: the box sets `inputMode="none"`, so the device keyboard stays down and the keypad docks at the bottom of the screen while the box has focus. **abc** brings the device keyboard back for letters and words; leaving the box resets to the keypad. ↵ blurs the box so the tutor's reply in the chat isn't hidden.
- Laptops: the keypad sits under the box; its keys are out of the Tab order (a keyboard types everything directly), so Tab still goes box → Check.
- Puzzle line entries now get the keypad too (`LineEntry` lost `keys={false}`; the `keys` prop is gone).
- Dropped keys: xⁿ, √, ±, ≤, ≥ (outside the linear-equations unit). They can still be typed. The mock hint for problem 3 now says "type 7, -7" instead of offering ±7 (`web/src/mock/script.ts`).
- Checked with Playwright at 1366×768, 390×844 and 375×667 (touch): typing, caret moves, delete, abc and back, ↵, and Tab order.
- **Age check (R-36):** before anything else, "When were you born?" asks for a birth month and year (no defaults, years a century back, nothing on screen names the cutoff). 13+ goes on to the welcome screen; under 13 gets a kind stop screen with no way back until a reload. Every session screen sits behind it (`web/src/App.tsx`, `web/src/components/AgeCheck.tsx`). The decision is the pure `isThirteenOrOlder` in `web/src/session/age.ts`, tested in `web/src/session/age.test.ts` (acceptance: "turns away anyone who hasn't certainly turned 13").
- Connor's two asks from the 0420 note: `platy.mathcheck` in the `web/src/mock` comments, and `multi_step_equations` in place of `distributive_equations` in `docs/content-library.md` §9.

## Decisions and why
- **Keys type plain text the parser already reads**, so the box stays hand-editable. Minus types `-`; × and ÷ type the symbols.
- **Docked only while focused** on phones: inline, it pushed the puzzle's Check button off a small screen. The ↵ key covers the case where the dock hides Check.
- **y stays** (scope-skeptic suggested cutting it): the skill map's probes use y (`combining_like_terms.2`, `distributive_property.2`, `simplifying_expressions.1`). Other letters go through abc.
- **x², y and comma also show in puzzles.** The mock puzzle grader calls those lines unreadable, which is the same reply as any typed junk. Hiding three keys per context wasn't worth a prop.

- **Only the age yes/no is kept, in memory** (P-15). The month and year never leave `AgeCheck`. A birthday in the current month 13 years ago counts as not yet 13, since there's no day.
- **The under-13 block clears on reload.** P-15 allows a device-local flag to block a quick retry, but `web/src/privacy.test.ts` bans browser storage; the privacy reviewer called memory-only acceptable (P-15 allows the flag, doesn't require it). **Michael decided (2026-10-20): memory only for now**; revisit with the lawyer before public launch, since FTC guidance suggests blocking quick retries.

## Contract changes
- Answers can now contain `×` and `÷` more often (the tokenizer always accepted them). The server's child-math normaliser (R-29, pending) has to read `×`, `÷`, `−` and `^2`, the same as `web/src/math/parse.ts` does.

## Open questions for Connor
- R-36's mid-session half: when the tutor learns a student is under 13, the server needs an event that ends the session (for example `session_ended` with a reason code). `web/` would then show the same stop screen. What shape do you want?
- Still open from 0443: a problem id on `child_message`, and an exact-step check in `platy.mathcheck`.

## Next steps
1. Michael tries it on a real phone (iOS Safari especially): docking, abc and back, ↵. Only Chromium touch emulation was tested here.
2. Codex review for `[privacy]` (web/ changed), run by Connor or Michael: `/codex:adversarial-review --wait Check against PRIVACY.md. Find any path where conversation content, audio, photos or PII escapes the gateway.`

## Gotchas
- A focused input that becomes `disabled` gets no blur event, so `MathInput` resets its focus flag when `disabled` turns on. Otherwise the dock comes back by itself on the next problem.
- Re-focusing the box to swap keyboards fires a blur; `MathInput` ignores that one with a `refocusing` ref so the swap doesn't undo itself.
