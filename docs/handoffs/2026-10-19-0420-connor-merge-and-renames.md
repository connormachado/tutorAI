# Merged Michael's three PRs, amended A-8/A-9/A-11, renamed kid → child and primer → platy, shipped the skill map (R-10)

- **Who:** connor   **Area:** harness + docs + backend
- **Branch / PR:** main / merges of the session-handoff PR, PR #1 (demo frontend) and PR #3 (content library), then `12c615b`…`254e4d8`, then the R-10 skill-map commit after `70681f1`
- **R-ids:** R-10 (skill map), R-22 (narrowed), R-36, R-37, R-38, R-43–R-47 (renumbered)   **gate:** green on every commit (`scripts/check`, pre-commit); `web/` tsc + vitest 123/123 after the child rename

## What changed
- **PRs merged:** all three, each rebased onto main first. `web/` came in byte-identical to the PR branches apart from the renames below.
- **R-ids renumbered at merge:**
  - R-31 → **R-36** (age gate), R-32 → **R-37** (content library), R-35 → **R-38** (skins).
  - Doc-proposed R-33, R-34, R-36, R-37, R-38 → **R-43–R-47**.
  - R-31–R-35 and R-39–R-42 are unused.
  - Updated in `REQUIREMENTS.md`, `docs/content-library.md`, `web/` comments and your handoff notes.
- **`DECISIONS.md` (applied by Connor as gate patches):**
  - **A-8** amended: the whiteboard is V1.
  - **A-9 note:** the V1 demo is 13+, with no parent onboarding or account features. The safety parent-notice path stays: detection, then an in-memory notice, then the demo panel.
  - New **A-11:** `web/` (React + Vite) with a FastAPI server; Streamlit dropped; LLM calls still only through `platy.gateway`.
- **`CLAUDE.md`:** demo command, closed stack (`fastapi`), state and caching rules, and server/`web/` privacy rules rewritten for A-11.
- **`REQUIREMENTS.md`:** whiteboard out of Not-V1; the RAG ground-truth line restored to Not-V1; R-22 narrowed to the A-9 note; open questions 3–4 updated and 6 resolved.
- **"kid" → "child" everywhere**, including `web/` identifiers (see Contract changes). `PRIVACY.md` now says "child" means any student of any age, not COPPA's under-13 sense. That came from a privacy-reviewer finding.
- **Python package `primer` → `platy`:** `src/platy/`, imports, `pyproject.toml`, `uv.lock`, `.importlinter`, `scripts/triggers.toml`, `scripts/edge_diff.py`, living docs.
- **`[privacy]` now covers `src/platy/server*`, `src/platy/fsio*` and `web/*`.** `.claude/agents/privacy-boundary-reviewer.md` gained a browser-side checklist. The live-test switch is now `PLATY_RUN_LLM`.
- **Skill map shipped (R-10):** `src/platy/skills/data/skill_map.json` has 16 nodes, one top-level node (`linear_equation_word_problems`), max depth 6 and 48 probes, every answer checked by sympy. `load_skill_map()` reads it, and `uv run python -m platy.skills.validate_skill_map` prints the summary (`tests/test_skill_map.py::test_shipped_skill_map_is_valid`).

## Decisions and why
- **Michael is an equal approver.** Your approver edits stayed as written.
- **One demo frontend:** `web/`, not Streamlit (A-11). "No async" is relaxed to "none outside the server's request/WebSocket handlers", because FastAPI WebSockets need it.
- **The safety parent notice stays without parent features.** It's a legal duty, not a feature.
- **`web/` is `[privacy]`** so browser-side child-content flows (storage, console, analytics, other hosts) get reviewed.
- **Claude may commit non-gate changes** (Connor, 2026-10-19: `CLAUDE.md` The loop step 3, `/ship`, `/handoff`). It commits only what you or Connor decided, never rules it made up, and gate files still need you or Connor with `ALLOW_GATE_CHANGE=1`.
- **RAG restored to Not-V1** (Connor's call). `docs/content-library.md` §5 calls `tutor_notes` the RAG ground-truth layer, so scope-skeptic will CUT `tutor_notes` code until it has an R-id.

## Contract changes
- **Protocol and state renames:**
  - `kid_message` → `child_message`
  - reducer action `kid_said` → `child_said`
  - sender `"kid"` → `"child"`
  - `kidMathToLatex` → `childMathToLatex`
  - `.bubble--kid` → `.bubble--child`
- **Python imports are `platy.*`** (for example `platy.mathcheck`). `web/README.md` and some `web/` comments still say `primer.mathcheck`; `web/` was left untouched in the package rename.
- **Commands:** `npm --prefix web run dev` and `npm --prefix web run check`. The latter isn't part of `scripts/check`.
- **npm dependencies** in `web/package.json` are approved.
- **Skill-map node ids are real now** (the JSON is the list). `one_step_equations` and `two_step_equations` from `docs/content-library.md` exist. `distributive_equations` doesn't; the nearest node is `multi_step_equations` (expand brackets, then solve). No current content example reuses a probe's equation (§5).
- **Every commit touching `web/`** now runs a `claude -p` diagram refresh at pre-commit, and under `/ship` the privacy reviewer plus Codex.

## Open questions for Michael
- Does `docs/content-library.md` §5 `tutor_notes` need rewording, or its own R-id, now that RAG is back under Not-V1?
- R-43–R-47 are still proposed, including R-47, the whiteboard. A-8 now allows it, so do we accept, merge or cut them?

## Next steps
1. **Michael:** start from main, not the old PR branches. Change `primer.mathcheck` to `platy.mathcheck` in `web/README.md` and the `web/src` comments. Swap `distributive_equations` in `docs/content-library.md` for a real node id.
2. **Connor:** build step 1, approving the pending R-28, R-29, R-30, P-14 and R-22 demo-note drafts.
3. **Connor, before the server lands:**
   - approve an ASGI server dependency (for example uvicorn)
   - decide how a2-egress treats `http` and `websockets` imports in server code
   - add `fastapi` to `pyproject.toml`, which is a `[privacy]` change
4. **Still open from the 0443 note** (none were answered tonight): resolved skin vs. interest tag, a problem id on `child_message`, and an exact-step check in `platy.mathcheck`.

## Gotchas
- **The PR branches are stale.** The rebase gave main's copies of those commits new ids. The merged commit messages still carry the old R-ids (R-31, R-32, R-35).
- **After pulling, run `uv sync --locked`.** `uv run --locked` leaves the old `primer` install in `.venv`.
- **Probe prompts use display notation** (`3x`, `3(x - 4)`), but `platy.mathcheck` refuses implicit multiplication. Grading what a student types (R-29, pending) needs a whitelisted parser that accepts it.
- **Gate-file changes** came in as patches that Connor applied and committed with `ALLOW_GATE_CHANGE=1`. Sessions don't edit them.
