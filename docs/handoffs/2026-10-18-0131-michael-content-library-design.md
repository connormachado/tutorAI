# Proposed the content library design and wrote its authoring prompts

- **Who:** michael   **Area:** docs
- **Branch / PR:** claude/content-library-design-txzs0z / draft PR (see branch)
- **R-ids:** proposes R-32 to R-38   **gate:** not run (docs and prompts only, no code)

## What changed
- New `docs/content-library.md`: Platy's content library design. Content items are skill × angle × format, each described by a JSON descriptor the primer can choose from.
- It lists the formats with V1 / V1.x / V1.5 / V2+ status, the descriptor schema, how the primer and library split selection, the authoring pipeline (Claude scripts, SymPy math check, Manim + TTS video, AI music, human review), and a first slice of about 25 items on three linear-equation skills.
- New `content/prompts/`: the Claude prompts for authoring (shared house style and JSON contract, brief, worked example, reel, puzzle, story, song, whiteboard scene, interest variant, critic). See `content/prompts/README.md`.
- `content/prompts/examples/`: a balance-scale reel, its soccer variant and a spot-the-error puzzle. Their math blocks were checked with a throwaway SymPy script (not committed), which also caught deliberately broken copies.

## Decisions and why
- Proposal: the primer picks skill and role; the library picks the item. Keeps formats pluggable without touching primer logic.
- Proposal: track observed format affinity instead of "learning styles", which the research doesn't support.
- Proposal: per-student generated media is V2+ because it would be kid content (P-1) and can't be math-checked first. Pre-made interest variants per tag are V1.
- **Michael and Connor agreed the whiteboard is in V1** (2026-10-18). Connor or Michael still has to update A-8 in DECISIONS.md and drop the whiteboard from "Not V1" in REQUIREMENTS.md. The doc's §4.1 keeps the V1 board small: library scenes, snapping tools, a fixed set of tutor marks, structured checks only as BKT evidence, and student ink treated like a photo (never stored). Proposed as R-38.
- The prompts take a skill node as input rather than keeping their own skill list, so the skill graph stays the only list (A-6).

- Proposed author-time services: ElevenLabs for voice (via `manim-voiceover`) and Eleven Music for songs, with Suno v6 as the music alternative (§8). No student data reaches them.

## Contract changes
- Proposed only: a `content` server event and `content_event` client event, plus `board_scene`, `board_mark`, `board_clear` and `board_check_request` for the whiteboard, for `web/src/protocol.ts` (§6.5). Not implemented.

## Open questions for Connor
- Please update A-8's text for the whiteboard-in-V1 decision you agreed to. Do you accept "structured checks only" as V1's answer to the Open whiteboard-to-BKT item? Whiteboard code will be flagged as drift until A-8 is updated.
- Does `select()` live in the primer or as a separate service?
- Is a `content/` + `tools/content/` layout outside `src/primer` fine with the egress contract and the gate?
- Accept, merge or cut proposed R-32 to R-38 (§10).

## Next steps
- Build the descriptor schema and validator, then the math checker (needs an R-id, tests and `sympy` as a dependency), then the players in `web/`.
- Run `brief-v1` on the three first-slice skills once the skill graph has them.
