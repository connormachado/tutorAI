# Whiteboard scene (v1)

*Paste after `_shared-v1.md`. Fill in the brief at the bottom. A scene sets up the shared whiteboard (design doc §4.1): what's on the board, which tools the student gets, what counts as correct, and the marks the tutor can make. The board itself is a component in `web/`; you write the scene it loads.*

---

Write a whiteboard scene for one problem. The student works on the board, and the tutor guides them by pointing at things on it.

## Scene types

- **`balance`:** a two-pan scale with x-blocks and unit blocks. The student drags blocks off or splits pans into groups. Good for linear equations.
- **`tiles`:** algebra tiles (x-tiles, unit tiles, negative tiles) on an equation mat. Good for distribution and combining like terms.
- **`number_line`:** a number line with a range and tick spacing. The student marks points or jumps. Good for one-step equations, inequalities and negatives.
- **`grid`:** a coordinate grid with axis ranges. The student places points, draws lines through two points, or drags a line. Good for slope and graphing.
- **`steps`:** a column of write-in boxes, one per line of a solution. The student writes each line. Good for practising the full procedure.

## Rules

- **Every object gets a stable `id`** (`left-pan`, `block-3`, `point-A`, `box-2`), because tutor marks and checks refer to objects by id.
- **Checks use exact rules on objects,** never "looks right". Examples: `point-A at (0, 3)`; `line passes through (0, 3) and (2, 7)`; `left-pan and right-pan each lost 5 unit blocks`; `box-1 is equivalent to 3*x = 15`. For a `steps` box, the rule is an equation the student's line must be equivalent to, so SymPy can grade it.
- **Freehand ink is never a check.** It's scratch space. If the scene invites the student to "show your thinking" in ink, that's for the tutor to look at when asked, not for grading.
- **Tutor marks come from a fixed set:** `highlight`, `circle`, `arrow` (from one object to another), `show_step` (reveal a prepared step), `move` (animate an object to a position). Write them as a short `tutor_script` the tutor can play when the student is stuck, in the order it would use them, from least to most help. The last mark still doesn't show the answer.
- **Snapping, big targets.** Students may be on a Chromebook trackpad or a phone, so tools snap to grid points, ticks or slots, and nothing needs precise freehand drawing.
- **Fits a 1366×768 screen** next to the chat, and a phone held upright. Keep it to about a dozen objects.

## `body`

```json
{
  "scene": "balance | tiles | number_line | grid | steps",
  "instructions": "<one line the student sees>",
  "setup": {
    "objects": [
      { "id": "<id>", "kind": "<pan | block | tile | point | line | box | label | ...>", "props": { } }
    ],
    "ranges": { "<e.g. x>": [-10, 10], "<e.g. y>": [-10, 10] }
  },
  "student_tools": ["drag", "split", "place_point", "draw_line", "mark", "write", "ink"],
  "checks": [
    { "check": "<id>", "skill": "<skill id>", "correct_when": "<exact rule on object ids>" }
  ],
  "tutor_script": [
    { "mark": "highlight | circle | arrow | show_step | move", "target": "<object id>", "to": "<object id or position, for arrow/move>", "say": "<one short line the tutor can say with it>" }
  ],
  "hints": ["<level 1>", "<level 2>", "<level 3>"]
}
```

`descriptor.duration_s` is a typical time to finish the scene. The `math` block holds the scene's problem and the steps a student would take on the board.

## Brief

```
{{paste one brief from brief-v1's output}}
```
