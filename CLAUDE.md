# The Primer

Adaptive, privacy-first algebra tutor for kids. Python 3.12 + uv. Source of truth: `REQUIREMENTS.md` (R-ids), `PRIVACY.md` (P-ids), `DECISIONS.md` (A-ids, Connor's and Michael's; never edit). Harness design: `02-harness-proposal.md`.

IMPORTANT: never persist raw conversation. Kid messages, model replies, transcripts, audio and photos never reach a DB, file, temp file, cache or log (P-1, P-10). Only `primer.gateway` talks to third-party networks (P-2).

## Commands
- `scripts/check`: the gate (ruff, pyright strict, pytest `-m "not llm"`, import-linter). It must be green before a turn ends; the Stop hook enforces it.
- `uv run pytest -q path::test`: one test. `uv add <pkg>` / `uv add --dev <pkg>`: dependencies (never pip).
- `scripts/diagram`: regenerate `diagrams/AS-BUILT.md` (pre-commit does this; never hand-edit it).

## Handoffs
Connor (backend) and Michael (frontend, `web/`) work in parallel. **Before starting, read the newest notes in `docs/handoffs/`** (`ls docs/handoffs/ | sort | tail -3`). **Before ending a session that changed the repo, run `/handoff`.**

## The loop
1. Every task is small: **one R-id, a named acceptance test, and `arch: none` or `arch: <what changes>`** stated up front.
2. Write the failing test first, then implement.
3. `/ship` to review, then **stop. Connor or Michael commits.** Never run `git commit`, and never use `--no-verify` or `ALLOW_GATE_CHANGE`.
4. Gate files (`[gate]` in `scripts/triggers.toml`) are off-limits. If the gate looks wrong, say what should change and why; don't weaken it.

## Superpowers precedence (these rules override its skills)
- `test-driven-development`, `verification-before-completion`, `systematic-debugging`: use as-is. The project's `scripts/check` defines green.
- Use `brainstorming` → `writing-plans` → `executing-plans` only for work bigger than one `/ship` task. Every plan task cites an R-id, names its acceptance test and declares `arch:`. A task from an approved plan counts as approved; don't re-brainstorm it.
- `executing-plans` overrides:
  - Execute **inline, on `main`, with no worktree.** Connor and Michael consent to main here.
  - **End each task with `/ship` and stop for Connor's or Michael's commit** instead of committing and continuing.
  - Skip its final whole-branch review and `finishing-a-development-branch`, because `/ship` plus the phase-end Codex review replace them.
  - Its `.superpowers/` ledger is fine.
- Don't use `subagent-driven-development`, `dispatching-parallel-agents` or `using-git-worktrees`. If asked about a worktree, the answer is no.
- `requesting-code-review` is replaced by `/ship`.

## Codex (read-only critic)
- Run `/codex:adversarial-review` only when `/ship` says `[privacy]` or `[mastery_math]` paths changed, or at the end of a phase.
- Never run `/codex:rescue` on boundary or math code, and never apply Codex's rewrites.
- Every Codex finding either becomes a failing test and then a fix, or is dismissed in one line. Log each review in `.claude/codex-log.md`.

## Design skills (dormant until `web/` exists)
- `frontend-design` governs all kid-facing UI.
- `design-taste-frontend` is only for the parent-facing landing page. On kid UI, the dials are about VARIANCE 3, MOTION 2, DENSITY 3.
- When the two disagree: frontend-design wins on kid UI, taste-skill on the landing page. Neither picks the frontend stack.

## Gotchas
- pyBKT 1.4.3 needs `numpy<2`, `pandas<3`, `scikit-learn<1.8`. It runs as pure Python, and its multiprocessing needs an `if __name__ == "__main__":` guard.
- Scratch files go in the session scratchpad, never the repo root.
