---
name: handoff
description: Write the session handoff note in docs/handoffs/ so the other cofounder and their AI tools can pick up where this session left off. Run at the end of any session or run that changed the repo, after /ship when there is one. Never commits.
---

# /handoff

Connor (backend, primer logic) and Michael (frontend, `web/`) work in parallel with their own Claude Code sessions. The handoff note is how each side's next session learns what the other just did. Write it in this session, from what you actually did and learned; git alone doesn't carry the why.

## 1. Gather (don't guess)
```bash
git status --short
git diff --stat HEAD
git log --oneline -10
ls docs/handoffs/ | sort | tail -3
```
Read the newest existing handoff so you don't repeat it, and so you can say which of its open items you closed.

## 2. Write one file
Path: `docs/handoffs/YYYY-MM-DD-HHMM-<who>-<slug>.md`, UTC time, `<who>` is `connor` or `michael` (whose session this is; ask if you can't tell), `<slug>` is 2 to 4 words. One file per session. If this session already wrote one, update it instead of adding another.

Use exactly these headings. Keep it under about 60 lines; link to files, PRs and R-ids instead of pasting code.

```markdown
# <one-line summary of the session>

- **Who:** connor | michael   **Area:** backend | frontend | harness | docs
- **Branch / PR:** <branch> / <PR link or "uncommitted">
- **R-ids:** <R-xx, … or n/a>   **gate:** green | red (<what>) | not run

## What changed
<3 to 8 bullets: behaviour a reader would notice, with `path` or `path::test` for each.>

## Decisions and why
<Choices made this session that the other side would otherwise re-litigate or contradict. Proposals for DECISIONS.md go here as proposals; never edit DECISIONS.md.>

## Contract changes
<Anything that changes what the other side depends on: the session protocol (`web/src/protocol.ts`), API shapes, env vars, commands, dependencies. "None" if none.>

## Open questions for <the other cofounder>
<Questions only they can answer. "None" if none.>

## Next steps
<What the next session should do first, in order.>

## Gotchas
<Anything that cost time and will cost it again: flaky tests, version pins, setup traps. Omit the heading if none.>
```

## 3. Rules
- **Privacy (P-1, P-10):** never paste kid messages, model replies, transcripts, audio, photos or any PII into a handoff, not even as an example. Describe behaviour instead ("the tutor now asks for a worked step before hinting").
- No secrets, tokens or local paths from your machine.
- State what was checked (a test name, `scripts/check` output) versus what is inferred.
- Don't hand-edit `diagrams/AS-BUILT.md` or gate files to "document" them; note the change here instead.
- Write the note, show its path, then stop. The handoff is committed with the session's other changes (Connor or Michael commits on `main`; branch work goes in its PR).
