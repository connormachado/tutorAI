# Puzzle (v1)

*Paste after `_shared-v1.md`. Fill in the brief at the bottom. A puzzle is a template that already exists as a React component in `web/`; you write the spec that tells the component which problems to make and how to respond. Puzzles are the items that give the tutor evidence, so the `checks` must be exact.*

---

Write a puzzle spec for one of three templates.

## Templates

- **`balance`:** the equation is drawn as a balance scale with blocks (x-blocks and unit blocks). The student picks an operation ("remove 5 from both sides", "split both sides into 3 groups") and the scale updates. Correct when x is alone and the scale is level. Good for `practice` and `introduce`.
- **`missing_step`:** a solution with one step blanked out. The student fills in the missing equation or the operation. Good for `practice` and `retrieval`.
- **`spot_the_error`:** a worked solution where one step is wrong. The student taps the wrong step, then says or writes what it should be. Good for `repair`. Use the brief's misconception as the error.

## What to write

1. **Generator rules** so the component can make fresh problems for this skill and difficulty: the equation's shape, number ranges, and constraints (integer answer, no zero coefficients, no answer equal to a number already in the equation, so a guess can't hit it by accident).
2. **Three example instances** from those rules, each in the `math` block. For `spot_the_error`, set `intentional_error_step`.
3. **Checks:** each thing the puzzle grades, which skill it is evidence for, and what counts as correct. A puzzle can check a prerequisite skill too; that's how the tutor finds a cracked floor one level down.
4. **Hints, graduated.** Three levels. Level 1 points at where to look. Level 2 names the kind of move. Level 3 names the move but still doesn't give the resulting equation or the answer. The student sees level 1 only after a wrong attempt, never before a first try.
5. **Feedback for likely wrong answers,** keyed by misconception: what the student probably did, said kindly in one sentence, and a nudge (not the fix).

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
    { "check": "<id>", "skill": "<skill id>", "correct_when": "<exact rule>" }
  ],
  "hints": ["<level 1>", "<level 2>", "<level 3>"],
  "wrong_answer_feedback": [
    { "misconception": "<id>", "looks_like": "<the wrong answer or move>", "feedback": "<one kind sentence and a nudge>" }
  ]
}
```

`descriptor.duration_s` is a typical time to finish one instance.

## Brief

```
{{paste one brief from brief-v1's output}}
```
