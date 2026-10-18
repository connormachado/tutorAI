# Brief (v1)

*Paste after `_shared-v1.md`. Fill in the inputs at the bottom. This prompt plans items for one skill; it doesn't write them, so it returns briefs instead of the shared envelope.*

---

Plan a set of content items for one Algebra 1 skill. Each item will be written later by a format-specific prompt, so your briefs need to be specific enough that a writer who has never seen this skill can make a good item from one brief alone.

## What makes a good set

- **4 to 6 angles that are genuinely different ways in,** not rewordings. Aim to cover several of these:
  - *Concrete model:* a physical picture that behaves like the math (a balance scale, cups and counters, a number line).
  - *Undoing:* the operations as a sequence you reverse (wrapping and unwrapping, a "function machine").
  - *Story or context:* a situation where the equation shows up naturally.
  - *Pattern:* see it work across several examples, then name the rule.
  - *Misconception-first:* show the common wrong move, then why it fails.
- **Cover the learning loop:** at least one `hook`, one `introduce` or `worked_example`, two `practice` items, and one `repair` per misconception you were given.
- **Match format to role.** Hooks suit reels, stories and songs. Explaining suits worked-example videos. Practice must be interactive (a puzzle or a whiteboard scene), because only interactive items give the tutor evidence of what the student can do. Whiteboard scenes suit concrete models (a balance scale, tiles, a number line, a grid) and step-by-step practice.
- **Worked problems with integer answers,** and different numbers for each brief so items don't repeat each other.

## What you return

One JSON object and nothing else:

```json
{
  "skill": "<skill id>",
  "briefs": [
    {
      "brief_id": "<skill-short>-<angle>-<format>, e.g. lin2-balance-reel",
      "role": "hook | introduce | worked_example | practice | repair | retrieval | confidence | apply",
      "format": "reel | worked_example | puzzle | story | song | whiteboard",
      "puzzle_template": "balance | missing_step | spot_the_error | null",
      "whiteboard_scene": "balance | tiles | number_line | grid | steps | null",
      "angle": "<kebab-case name>",
      "angle_in_one_line": "<the idea, as you'd say it to a student>",
      "why_it_works": "<one or two sentences: what about this angle makes the idea click>",
      "misconception": "<misconception id this targets, or null>",
      "worked_problem": "<equation in SymPy syntax with an integer answer>",
      "difficulty": 1,
      "notes_for_writer": "<anything the writer must get right or avoid>"
    }
  ],
  "gaps": "<anything about this skill you couldn't plan well from the inputs, e.g. a misconception you'd expect that wasn't listed>"
}
```

## Inputs

```
Skill id:            {{skill_id}}
Skill description:   {{what the student can do once they have it}}
Prerequisites:       {{prerequisite skill ids and one line each}}
Misconceptions:      {{misconception id: description, one per line}}
Typical problems:    {{two or three example equations}}
Formats available:   reel, worked_example, puzzle (balance | missing_step | spot_the_error), story, song,
                     whiteboard (balance | tiles | number_line | grid | steps)
```
