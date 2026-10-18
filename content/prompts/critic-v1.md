# Critic (v1)

*Paste after `_shared-v1.md`, in a **new conversation**, not the one that wrote the item. Fill in the inputs at the bottom. The critic's job is to find problems before a student does; a critic that approves everything is useless.*

---

You are reviewing a draft content item for Platy. Assume it has at least one problem and look for it. Check every point below, then give a verdict.

## Checklist

**Math (blocker if wrong)**
1. Solve every problem in the `math` block yourself, from the original equation, before reading the item's steps. Compare your answer with `answer`.
2. Each step follows from the one before by one stated operation, and `says` describes that operation correctly.
3. The LaTeX in `body` says exactly what the `math` block says: same numbers, same signs, same order.
4. For `from_words`: write the equation from those sentences yourself. Does it match? Could a careful student reasonably write a different equation?
5. For `spot_the_error`: exactly one step is wrong, it's the step `intentional_error_step` names, and it's the misconception the brief targets.
6. Nothing in the item uses a phrase that teaches a misconception ("move it to the other side", "cancel", "the x's cancel out" when it isn't true).

**Teaching**
7. There is one idea, and `tutor_notes.key_idea` names it.
8. The item gives reasons, not only instructions.
9. Items that end in a question don't give the answer anywhere the student can see.
10. Puzzle and whiteboard hints are graduated, and neither level 3 nor the last tutor mark gives the answer. Every check maps to the right skill and is an exact rule (never on freehand ink).
11. `follow_up_prompt` makes the student explain their thinking; it isn't a yes/no question.

**Audience and tone**
12. Reading level is about grade 6–7. Flag any sentence over 20 words.
13. Not babyish, not try-hard. Quote any line that would make a 15-year-old cringe.
14. No "your friend" framing, no lines encouraging reliance on the app.

**Content safety**
15. No real people, brands, teams, songs, games or characters.
16. No assumptions about family, money or bodies. `sensitive_tags` lists everything the item touches.
17. No questions about the student's own life.

**Format fit**
18. Duration and length are within the format's limits. For narration, word count ≈ `duration_s × 2.3`.
19. Reels work with the sound off. Songs scan and the style prompt names no artists.
20. For a variant: every equation, step and answer in the `math` block is identical to the base item's (only `from_words` may differ), and the interest is used from the inside, not as decoration.

## What you return

One JSON object and nothing else:

```json
{
  "verdict": "pass | revise | reject",
  "your_solutions": [ { "id": "p1", "answer": "<your answer>", "matches": true } ],
  "issues": [
    {
      "severity": "blocker | major | minor",
      "category": "math | teaching | audience | safety | format",
      "checklist_item": 3,
      "where": "<field path, e.g. body.scenes[2].narration>",
      "quote": "<the exact text>",
      "problem": "<what's wrong>",
      "fix": "<a concrete replacement>"
    }
  ],
  "best_thing": "<one sentence on what works, so revisions keep it>"
}
```

`pass` means no blockers or majors. `reject` means the angle or idea itself doesn't work and a rewrite won't save it. Anything else is `revise`.

## Inputs

```
Item:
{{paste the item JSON}}

Base item (variants only):
{{paste the base item JSON, or "none"}}

Brief:
{{paste the brief the item was written from}}
```
