# Platy co-founder setup (Michael) — 10 minutes, one time

## What you get automatically (via git — nothing to do)

- **Project skills and reviewers**: `/ship` and `/handoff` live in `.claude/skills`, the reviewer agents in `.claude/agents`. Both travel with the repo.
- **Gates & Claude Code hooks** (`scripts/check`, `scripts/triggers.toml`, `.claude/settings.json`, `.claude/hooks/`): enforced on your machine automatically. You can't break the rules by misconfiguring anything — the rules live in the repo, not in your settings.

## What to install on your machine

1. **uv** (the Python toolchain; `scripts/check` won't run without it). Install it (`brew install uv`, or `curl -LsSf https://astral.sh/uv/install.sh | sh`), then from the repo root run `uv sync` before your first `scripts/check`.
2. **The git pre-commit hook** (git doesn't clone `.git/hooks/`, so this is the one gate you install yourself). From the repo root:

   ```sh
   printf '#!/usr/bin/env bash\nexec "$(git rev-parse --show-toplevel)/scripts/pre-commit" "$@"\n' > .git/hooks/pre-commit
   chmod +x .git/hooks/pre-commit
   ```

3. Open Claude Code and run `/plugin`.
4. Install these three plugins (the repo's CLAUDE.md depends on them):
   - **superpowers** — the workflow skills (test-driven development, plan execution)
   - **frontend-design** — reserved for the child-facing UI
   - **codex** — the adversarial privacy reviewer
5. Verify: start a session in the repo and confirm the skills show up (e.g. test-driven-development). Re-run `/plugin` if anything's missing.

## Ground rules

- **The human commits, never the agent.** Run `/ship`, review the diff, then commit yourself.
- **Read CLAUDE.md before building.** Every task cites one R-id plus its acceptance test.
- **Front-end only (`web/`)** unless you and Connor explicitly agree otherwise.
- **Gate files are Connor-or-you approved only** (the `ALLOW_GATE_CHANGE=1` flag). The full list is `[gate]` in `scripts/triggers.toml` — e.g. `scripts/check`, `scripts/triggers.toml`, `scripts/diagram`, `.importlinter`, `.claude/settings.json`, `DECISIONS.md`. The hook blocks agent edits — that's intentional.

## Monday screenshare (10 min, before/after the 2–5pm meeting)

Screenshare while you install uv, run `uv sync`, install the pre-commit hook and run the `/plugin` installs, then run `scripts/check` once together so you've seen it green.
