# Session handoffs

One note per coding session or run, so Connor, Michael and their AI tools stay on the same page.

- **Read:** at the start of a session, read the newest two or three notes (`ls docs/handoffs/ | sort | tail -3`), especially the other cofounder's latest.
- **Write:** at the end of a session that changed the repo, run `/handoff` (`.claude/skills/handoff/SKILL.md`). `/ship` ends by calling it.
- **Names:** `YYYY-MM-DD-HHMM-<who>-<slug>.md` in UTC, so `sort` puts the newest last.
- **Never** put kid conversation, PII or secrets in a note (P-1, P-10).

Notes are a log, not a spec. When one records a lasting decision, it still belongs in `REQUIREMENTS.md`, `PRIVACY.md` or (Connor's or Michael's call) `DECISIONS.md`.
