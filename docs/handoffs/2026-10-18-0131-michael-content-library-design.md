# Proposed the content library design (docs/content-library.md)

- **Who:** michael   **Area:** docs
- **Branch / PR:** claude/content-library-design-txzs0z / draft PR (see branch)
- **R-ids:** proposes R-29 to R-34   **gate:** not run (docs only, no code)

## What changed
- New `docs/content-library.md`: Platy's content library design. Content items are skill × angle × format, each described by a JSON descriptor the primer can choose from.
- It lists the formats with V1 / V1.x / V1.5 / V2+ status, the descriptor schema, how the primer and library split selection, the authoring pipeline (Claude scripts, SymPy math check, Manim + TTS video, AI music, human review), and a first slice of about 25 items on three linear-equation skills.

## Decisions and why
- Proposal: the primer picks skill and role; the library picks the item. Keeps formats pluggable without touching primer logic.
- Proposal: track observed format affinity instead of "learning styles", which the research doesn't support.
- Proposal: per-student generated media is V2+ because it would be kid content (P-1) and can't be math-checked first. Pre-made interest variants per tag are V1.
- Whiteboard stays V1.5 per A-8; no change assumed.

## Contract changes
- Proposed only: a `content` server event and `content_event` client event for `web/src/protocol.ts` (§6.5). Not implemented.

## Open questions for Connor
- Does `select()` live in the primer or as a separate service?
- Is a `content/` + `tools/content/` layout outside `src/primer` fine with the egress contract and the gate?
- Accept, merge or cut proposed R-29 to R-34 (§10).

## Next steps
- Michael shares his content prompts; fold them into §8 and `content/prompts/`.
- Build the descriptor schema and validator, then the math checker, then the players in `web/`.
