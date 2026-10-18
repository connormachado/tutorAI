# Content prompts

The Claude prompts that author Platy's content library, step 2 of the pipeline in [`docs/content-library.md`](../../docs/content-library.md) §8. Each file is one prompt, versioned in its name (`reel-v1`). An item's descriptor cites the prompt that made it in `provenance.script_prompt`, so if a prompt changes, a new version is added rather than the old one edited.

**No student data ever goes into these prompts.** They run at author time, on skill descriptions and other items only. Personalization comes from interest tags (§7 of the design doc), never from a real student's profile.

## How they chain

```
skill node ──► brief-v1 ──► one brief per (skill, role, angle, format)
                              │
              ┌───────────────┼───────────────┬──────────────┬───────────┐
              ▼               ▼               ▼              ▼           ▼
   worked-example-v1      reel-v1        puzzle-v1       story-v1     song-v1   (+ whiteboard-v1)
              └───────────────┴───────┬───────┴──────────────┴───────────┘
                                      ▼
                              base item (JSON)
                                      │
                         ┌────────────┴─────────────┐
                         ▼                          ▼
              interest-variant-v1 (per tag)     critic-v1
                         │                          │
                         └──────────► critic-v1 ◄───┘
                                      │
                       SymPy math check (§8 step 3), then human review
```

| File | Input | Output |
|---|---|---|
| [`_shared-v1.md`](_shared-v1.md) | — | House style and the JSON envelope every format prompt returns. Included in every run. |
| [`brief-v1.md`](brief-v1.md) | One skill: id, description, prerequisites, known misconceptions | 4–6 briefs, each a distinct angle with a role, a format and a worked problem |
| [`worked-example-v1.md`](worked-example-v1.md) | A brief | A 45–120 s worked-example video script, scene by scene |
| [`reel-v1.md`](reel-v1.md) | A brief | A vertical reel under 45 s that works with the sound off |
| [`puzzle-v1.md`](puzzle-v1.md) | A brief and a puzzle template | A puzzle spec: generator rules, examples, checks, graduated hints |
| [`story-v1.md`](story-v1.md) | A brief | A 150–400 word story that sets up a problem the student solves |
| [`song-v1.md`](song-v1.md) | A brief | Lyrics for a 30–60 s mnemonic song and a style prompt for the music tool |
| [`whiteboard-v1.md`](whiteboard-v1.md) | A brief and a scene type | A whiteboard scene: board objects, student tools, exact checks and a tutor script of marks (design doc §4.1; needs A-8's text updated before the board is built) |
| [`interest-variant-v1.md`](interest-variant-v1.md) | A base item and one interest tag | The same item re-skinned for that interest, with identical math |
| [`critic-v1.md`](critic-v1.md) | One item (and its base item, for a variant) | A pass / revise / reject verdict with specific issues and fixes |

## Running them today

Until there's a script in `tools/content/`, run them by hand in Claude:

1. Start a new conversation. Paste `_shared-v1.md`, then the format prompt, then the filled-in inputs at the bottom of the format prompt.
2. Save the JSON it returns as a draft item.
3. In a **separate** conversation, run `critic-v1.md` on that JSON. A fresh conversation matters: a model reviewing its own work in the same conversation tends to approve it.
4. Fix what the critic flags (by hand, or by pasting the issues back into the first conversation), then run the SymPy check and review it yourself.

**Where the skill input comes from.** The skill graph (R-10) is the only list of skills (A-6), so these prompts take a skill node as input instead of keeping their own skill list. Until Connor's graph exists, type the skill's id, description, prerequisites and misconceptions into the brief prompt for that run and don't save them as a second list.

[`examples/`](examples/) holds sample outputs, so you can see what good output looks like. Their math has been checked with SymPy.
