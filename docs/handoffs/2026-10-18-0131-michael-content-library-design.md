# Proposed the content library design and its authoring prompts, then fitted them to the demo contract

- **Who:** michael   **Area:** docs
- **Branch / PR:** claude/content-library-design-txzs0z / draft PR #3
- **R-ids:** proposes R-32 to R-38   **gate:** green (`scripts/check`; docs and prompts only, no code)

## What changed
- `docs/content-library.md`: the content library design. Items are skill × angle × format, each with a JSON descriptor policy can choose from. Covers formats (with a "could be in the demo?" column), the descriptor, how selection fits policy, the authoring pipeline, a first slice of about 27 items, and proposed R-32 to R-38.
- Revised to fit the "Demo contract" in `CLAUDE.md` and main's `src/primer/skills/` and `primer.mathcheck` (§2.1 summarises it). Then updated for Michael's choice of the React app as the frontend: content players are components in `web/`, and the server chooses and grades.
- `content/prompts/`: the authoring prompts (shared house style and JSON contract, brief, worked example, reel, puzzle, story, song, whiteboard scene, interest variant, critic). Author-time only; the app never loads them.
- The prompts now use mathcheck's syntax (no `**`, no `3x`), snake_case node ids, `easy_win` (was `confidence`, which collided with R-30), a `reflection_prompt`, probe avoidance, and checks with a `kind` (`solution_set`, `equivalent_to`, `ui_state`). Puzzle feedback became ask-first prompts the tutor uses when policy allows.
- `content/prompts/examples/`: a balance-scale reel, its soccer variant and a spot-the-error puzzle. Checked: every math block passes `primer.mathcheck` (via a throwaway script, not committed), and broken copies fail (wrong answer, bad step, error flag flipped, `3x`).

## Decisions and why
- Proposal: selection is a pure `select_item` that policy calls, and showing an item is a `TutorMove` that `checks.py` gates (reveal rules, R-02). Puzzles report results and stop; policy decides hints (R-02, R-03).
- Proposal: all item math and all interactive checks go through `primer.mathcheck`, so there's no second sympy checker (R-29 applied to content).
- Proposal: published items are packaged data in `src/primer/content/items/`, covered by the `[pedagogy]` trigger; authoring tools live in `tools/content/` as a separate uv project (Manim needs NumPy 2, pyBKT needs `numpy<2`).
- **Michael chose the React app in `web/` as the demo frontend** (2026-10-18). PR #1 amends the demo contract to match, with Streamlit kept as Connor's internal testing tool. So content players live in `web/`, and the browser never decides correctness.
- Proposal (§7): personalize by choosing and assembling, not by generating media per student. Five layers: primer selection (including pace), live templates with per-student numbers and interest skins, pre-made variants per interest tag for the top tags, the tutor's own words, and per-student media only in V2+. Short reels become animated templates in `web/` rather than Manim videos.
- Proposal: observed format affinity instead of "learning styles". Session-only in the demo.
- **Michael and Connor agreed the whiteboard is in V1** (2026-10-18). Connor or Michael still has to update A-8 in `DECISIONS.md` and the "Not V1" list. §4.1 keeps it small; "check my work" is safety-first, the vision model only transcribes, and mathcheck finds the wrong line.
- Proposed author-time services: ElevenLabs voice (via `manim-voiceover`), Eleven Music, Suno v6 as the alternative. No student data reaches them.

## Contract changes
- None implemented. Proposed: a `show_item` tutor action and a `content` module (§6.1); a `misconceptions` field on `SkillNode` or a sibling file (§5); content and whiteboard events for `web/src/protocol.ts` (§6.5).

## Open questions for Connor (either cofounder can approve the answers)
- Does any content go in the demo, or does the library wait until after the core loop?
- OK for `select_item` inside policy, `show_item` gated by `checks.py`, and items under `src/primer/content/items/` in `[pedagogy]`? Does R-06's cap apply to item text?
- `misconceptions` on `SkillNode`, or a sibling file?
- `tools/content/` as a separate uv project outside A-2's scope, written down as such?
- One shared normaliser for kid-typed math (`2x`, `X`, `−`) before mathcheck?
- Pinned ZDR roles for whiteboard vision and voice (P-14). Accept, merge or cut R-32 to R-38 (§10, §11).

## Next steps
- Get answers to the open questions; "content in the demo?" comes first.
- Build the descriptor model and validator in the gate, against `SkillMap`, after R-32 and R-33 are accepted.
- Run `brief-v1` on the three first-slice skills once the linear-equations map exists.
- Update `reel-v1` (and the descriptor) for template reels: generator rules and skins per interest tag (§7.2).

## Gotchas
- mathcheck refuses implicit multiplication, `**`, capital letters and two letters in a row. Write `3*x`, not `3x`.
- Skill ids in the examples are placeholders until Connor's map lands.
