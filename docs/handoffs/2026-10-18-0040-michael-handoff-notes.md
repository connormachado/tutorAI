# Added session handoff notes (/handoff skill, CLAUDE.md pointer, /ship step)

- **Who:** michael   **Area:** harness
- **Branch / PR:** claude/session-handoff-docs-7h7z54 / draft PR (see branch)
- **R-ids:** n/a (harness tooling)   **gate:** green (`scripts/check`)

## What changed
- New `/handoff` skill: `.claude/skills/handoff/SKILL.md` writes one note per session in `docs/handoffs/`.
- `CLAUDE.md` now tells every session to read the newest notes first and run `/handoff` before ending.
- `/ship` gained step 5, which runs `/handoff` so the note lands in the same commit.
- `docs/handoffs/README.md` explains naming and the no-child-data rule.

## Decisions and why
- No subagent: it wouldn't see the session's conversation, which is where the "why" lives, and `02-harness-proposal.md` argues against extra agents.
- The Stop-hook backstop is proposed, not added, because `.claude/settings.json` and `.claude/hooks/*` are gate files. The script and settings diff are in the PR description.

## Contract changes
None.

## Open questions for Connor
- Do you want the Stop-hook nudge? If yes, Connor or Michael applies it from the PR description with `ALLOW_GATE_CHANGE=1`.

## Next steps
- Connor and Michael review this PR alongside PR #1 (demo frontend).
- Next frontend session writes its own handoff, including the proposed session protocol in `web/src/protocol.ts`.
