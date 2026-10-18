# Built the puzzle player in the React app, against the mock server

- **Who:** michael   **Area:** web
- **Branch / PR:** claude/content-library-design-txzs0z / draft PR #3 (stacked on PR #1's branch)
- **R-ids:** R-32, R-35 (approved by Michael, 2026-10-18)   **gate:** green (`scripts/check`, and `npm run check` and `npm run build` in `web/`)

## What changed
- Three puzzle templates in `web/`: spot the error, missing step and balance scale. `components/PuzzlePlayer.tsx` shows one in place of the problem card, with the parts in `components/puzzles/`.
- Skins and slots (R-35): each puzzle arrives with a resolved skin (team colors, made-up team and player names, an emblem, setting words like "kit bag" and "ball"). A **Colors** button lets the student pick their own team colors from a fixed palette. A new skin never changes the numbers.
- Protocol: `puzzle`, `puzzle_result` and `puzzle_done` from the server; `puzzle_move`, `puzzle_hint`, `puzzle_next` and `slot_pick` from the client (`protocol.ts`, `content/types.ts`, design doc §6.5). The browser reports what the student did and the server grades it.
- The mock server plays the server's part: it generates problems from each item's generator rules (`mock/generate.ts`), grades lines with a stand-in for `primer.mathcheck` (`mock/grade.ts`), and runs the items and skins in `mock/puzzles.ts`. A miss gets an ask-first question (R-03) and the nudge only after the student explains; no hint before a first try (R-02); a reflection question once solved (R-30).
- Repair route: answering `25/3` on problem 1 (adding the 5 instead of subtracting it) sends the student to a spot-the-error puzzle about that slip, then back to problem 1. The Demo menu opens each puzzle and switches the interest skin.
- Fixed a bug from PR #1: a tutor reply that was still streaming split into two bubbles if the kid typed mid-reply.
- `MathInput` takes `keys={false}` to hide the symbol keys where only a linear line is wanted. The kid-math parser now reads a negative after a plus or minus (`18 + -11`).
- Two review rounds, every finding fixed with a test: line grading was too loose (the problem copied out passed as the missing step), a pause left a dead puzzle on the mock server, a fast second tap could overtake the first, the uneven-split question named the wrong thing, generators could show the answer on screen or let a split work first, an unreadable line unlocked hints, and an unfinished final answer ("2x = 16") was called unreadable. Also 44px scale buttons, a keyboard-safe color picker, and a status line for each accepted scale move.
- Docs: §6.5 of `docs/content-library.md` now lists the built puzzle events. In the spot-the-error example, `fixed_step` is `equivalent_to` the corrected line (so `x = 8` doesn't count as fixing step 1) and `final_answer` is `equivalent_to` `x = {answer}` (so an unfinished line doesn't pass). `puzzle-v1.md` explains `equivalent_to` for equations and final answers.

## Decisions and why
- Made-up teams (Harbor Puffins, Canyon Meteors, Pixel Foxes, Team Platy) in real-looking colors. A test keeps team names clear of real pro team nicknames.
- The balance scale is drawn as a level plank with "sides", not hanging pans: every move is done to both sides, so it never tips. A move is drawn only after the server accepts it.
- Puzzle chat stays in the chat panel: what the student typed or tapped shows as their bubble, so the tutor's question about it reads in context. Kid text lives in React state only (P-1).
- Interest and color picks last for the session only, in the mock's memory.

## Contract changes
- New session events (above). They're a proposal for the backend until Connor agrees them, like the rest of `web/README.md`'s session contract.

## Open questions for Connor (either cofounder can approve the answers)
- Does the server send the skin already resolved (as built), or the interest tag plus slot values?
- Grading for `fixed_step` and `missing_line` needs a "this exact step" check in `primer.mathcheck`: x alone on one side with the same coefficient, and the same number on the other (sides swapped or sums not worked out are fine; `x = 8` or the problem copied out aren't). Add it there, or as a content helper?

## Next steps
- The 13+ age check screen (R-31) and an on-screen math keypad, which also need nothing from Connor.
- When the server lands: move generation and grading from `web/src/mock/` to Python (`primer.mathcheck`), and the item text to packaged item files.

## Gotchas
- `web/src/mock/` is all stand-in. The real server must regrade everything; nothing the browser sends counts as "correct".
- Vitest runs in a node environment with no component tests, so the screens were checked with Playwright screenshots at 1366×768 and 390×844, not unit tests.
