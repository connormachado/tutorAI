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
- A third review round found 8 more real problems and 15 small ones; all but two small ones are fixed, each with a test or a browser check:
  - Keyboard: sending a move no longer drops focus (controls are held with `aria-disabled` while a move is graded), the next answer box takes focus when a stage changes, a solved puzzle hands focus to the chat box, and "I need a hint" and "Start over" show a focus ring again.
  - Grading: a final answer like `1x = 12`, `x + 0 = 12` or `(x) = 12` counts (the item's `equivalent_to x = {answer}`), another letter (`y = 12`) doesn't, and a line with a stray symbol (`2x = 12) - 5`) is unreadable instead of graded on the part before it (`parseMathStrict`). The missing-step generator no longer makes problems where dividing first also works.
  - Teaching: a hint asked for while Platy waits on the student's explanation gets "Tell me what you were thinking first" (R-03); three misses on a puzzle suggest a pause, as on a problem (R-21); the wrong-line nudge points at a way to check rather than at the right line.
  - Chat timing: `kid_message` has no problem id, so a message sent after Keep going used to be graded against the next problem. The browser now holds the chat (typing still works, sending waits) while a move is graded and until the next problem or puzzle arrives.
  - Smaller: scale moves with a fractional count are refused, a pause during the warm-up no longer queues a second warm-up, "Take 1 ball", and the gaming and neutral teams are renamed (below).
- Docs: §6.5 of `docs/content-library.md` now lists the built puzzle events. In the spot-the-error example, `fixed_step` is `equivalent_to` the corrected line (so `x = 8` doesn't count as fixing step 1) and `final_answer` is `equivalent_to` `x = {answer}` (so an unfinished line doesn't pass). `puzzle-v1.md` explains `equivalent_to` for equations and final answers.

## Decisions and why
- Made-up teams (Harbor Puffins, Canyon Meteors, Pixel Pandas, Platy Squad) in real-looking colors. A test keeps team names clear of real pro team nicknames and common club words, now including the Premier League ("Pixel Foxes" was Leicester City's nickname).
- The balance scale is drawn as a level plank with "sides", not hanging pans: every move is done to both sides, so it never tips. A move is drawn only after the server accepts it.
- Puzzle chat stays in the chat panel: what the student typed or tapped shows as their bubble, so the tutor's question about it reads in context. Kid text lives in React state only (P-1).
- Interest and color picks last for the session only, in the mock's memory.

## Contract changes
- New session events (above). They're a proposal for the backend until Connor agrees them, like the rest of `web/README.md`'s session contract.

## Open questions for Connor (either cofounder can approve the answers)
- Does the server send the skin already resolved (as built), or the interest tag plus slot values?
- Should `kid_message` carry the id of the problem or puzzle on screen? Then the server could drop a message whose problem is gone, instead of the browser holding the chat between problems. Either way, the server must always answer `puzzle_next` with `puzzle_done`, or the chat stays held.
- Grading for `fixed_step` and `missing_line` needs a "this exact step" check in `primer.mathcheck`: x alone on one side with the same coefficient, and the same number on the other (sides swapped or sums not worked out are fine; `x = 8` or the problem copied out aren't). Add it there, or as a content helper?

## Next steps
- The 13+ age check screen (R-31) and an on-screen math keypad, which also need nothing from Connor.
- Two small review findings left open: a chained line like `2x = 7 + 5 = 12` is called unreadable, and spot-the-error's hints are all about finding the wrong line, so they don't help in the last step (dividing). The second needs hints per stage in the item format.
- When the server lands: move generation and grading from `web/src/mock/` to Python (`primer.mathcheck`), and the item text to packaged item files.

## Gotchas
- The chat is held, not disabled, between problems and while a puzzle move is graded (`SessionState.moving`, the `hold` prop on `Chat`). A held control uses `aria-disabled`, so it keeps keyboard focus; use real `disabled` only for states that last.
- `web/src/mock/` is all stand-in. The real server must regrade everything; nothing the browser sends counts as "correct".
- Vitest runs in a node environment with no component tests, so the screens were checked with Playwright screenshots at 1366×768 and 390×844, not unit tests.
