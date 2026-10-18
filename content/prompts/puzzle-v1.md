# Puzzle (v1)

*Paste after `_shared-v1.md`. Fill in the brief at the bottom. A puzzle is a template built once as a component in the React app (`web/`); you write the spec that tells it which problems to make and what to grade. Puzzles are the items that give the tutor evidence, so the `checks` must be exact.*

---

Write a puzzle spec for one of three templates.

## Templates

- **`balance`:** the equation is drawn as a balance scale with blocks (x-blocks and unit blocks). The student picks an operation ("remove 5 from both sides", "split both sides into 3 groups") and the scale updates. Correct when x is alone and the scale is level. Good for `practice` and `introduce`.
- **`missing_step`:** a solution with one step blanked out. The student fills in the missing equation or the operation. Good for `practice` and `retrieval`.
- **`spot_the_error`:** a worked solution where one step is wrong. The student taps the wrong step, then says or writes what it should be. Good for `repair`. Use the brief's misconception as the error.

## What to write

1. **Generator rules** so the app can make fresh problems for this skill and difficulty: the equation's shape, number ranges, and constraints (integer answer, no zero coefficients, no answer equal to a number already in the equation, so a guess can't hit it by accident).
2. **Three example instances** from those rules, each in the `math` block. For `spot_the_error`, set `intentional_error_step`.
3. **Checks:** each thing the puzzle grades, which skill it is evidence for, and what counts as correct. A puzzle can check a prerequisite skill too (one from the brief's `touches`); that's how the tutor finds a cracked floor one level down. Every check is decided by a program, never by judgement, and has a `kind`:
   - `solution_set`: the student's line must have exactly one solution, `expected`. Write `expected` in the checker's syntax from the shared instructions (`5`, not `x = 5`).
   - `equivalent_to`: the student's expression must equal `expected` (also checker syntax). For an equation, it means that same line, with its sides swapped or its sums not yet worked out, and not another equation with the same solution: `16 = 2*x` and `2*x = 9 + 7` match `2*x = 16`, but `x = 8`, `2*x - 16 = 0` and the problem copied out don't. Use it when the student must write one particular step. For a final answer, use `equivalent_to` with `x = {answer}`, so a true line that isn't finished yet (`2*x = 16`) doesn't pass; a bare number counts as `x =` that number.
   - `ui_state`: an exact rule on what the student tapped or moved (`tapped step 1`, `removed 5 unit blocks from each pan`).

   Because problems are generated, `expected` can name a generator value in braces, like `{answer}` or `{c - b}`.
4. **Hints, graduated.** Three levels. Level 1 points at where to look. Level 2 names the kind of move. Level 3 names the move but still doesn't give the resulting equation or the answer. The puzzle never shows these by itself: the tutor decides when a hint is allowed (never before a first try) and uses yours as material.
5. **Ask-first prompts for likely wrong answers,** keyed by misconception. When a check fails, the puzzle reports the result and stops; the tutor asks the student to explain their step before saying anything about it. So for each misconception, write `looks_like` (the wrong answer or move, so the app can match it), an `ask` (one kind question that gets the student to explain what they did, without saying it's the misconception), and a `nudge` (one sentence the tutor can use after the student has explained, which points at the fix but doesn't give it).

## `body`

```json
{
  "template": "balance | missing_step | spot_the_error",
  "instructions": "<one line the student sees, e.g. Get x alone without tipping the scale>",
  "generator": {
    "shape": "<e.g. a*x + b = c>",
    "ranges": { "a": [2, 9], "b": [1, 20], "answer": [1, 12] },
    "constraints": ["<e.g. c = a*answer + b>", "<answer not equal to a or b>"]
  },
  "checks": [
    { "check": "<id>", "skill": "<skill node id>", "kind": "solution_set | equivalent_to | ui_state", "expected": "<checker syntax, or the exact UI rule>" }
  ],
  "hints": ["<level 1>", "<level 2>", "<level 3>"],
  "wrong_answer_prompts": [
    { "misconception": "<id>", "looks_like": "<the wrong answer or move>", "ask": "<one question that gets them to explain>", "nudge": "<one sentence for after they explain>" }
  ]
}
```

`descriptor.duration_s` is a typical time to finish one instance.

## Brief

```
{{paste one brief from brief-v1's output}}
```
