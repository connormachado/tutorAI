# Whiteboard scene (v1)

*Paste after `_shared-v1.md`. Fill in the brief at the bottom. A scene sets up the shared whiteboard (design doc §4.1): what's on the board, which tools the student gets, what counts as correct, and the marks the tutor can make. The board itself is built once as a component in the React app (`web/`); you write the scene it loads.*

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
- **Checks use exact rules on objects,** never "looks right". Each check has a `kind`, like puzzle checks:
  - `ui_state` for positions and moves, compared exactly after snapping: `point-A at (0, 3)`; `line passes through (0, 3) and (2, 7)`; `left-pan and right-pan each lost 5 unit blocks`.
  - `solution_set` for a `steps` box: the student's line must have exactly one solution, `expected`, written in the checker's syntax (`5`). That's how "box-1 is a correct step" gets graded by the math checker rather than by a model.
  - `equivalent_to` for a box that holds an expression rather than an equation.
- **Freehand ink is never a check.** It's scratch space. If the scene invites the student to "show your thinking" in ink, that's for the tutor to look at when asked, not for grading.
- **Tutor marks come from a fixed set:** `highlight`, `circle`, `arrow` (from one object to another), `show_step` (reveal a prepared step), `move` (animate an object to a position). Write them as a short `tutor_script`, in the order the tutor would use them, from least to most help. The tutor plays a mark only when its rules allow that much help, so start each `say` line with a question where you can ("What's on both pans right now?"), and never `show_step` a step that contains the answer. The last mark still doesn't show the answer.
- **When a `steps` line is wrong,** the app finds the first box whose line doesn't have the right solution, and the tutor `circle`s it. Don't write a mark that says what the right line is; write one that asks the student to look again at that line.
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
    { "check": "<id>", "skill": "<skill node id>", "kind": "ui_state | solution_set | equivalent_to", "target": "<object id>", "expected": "<exact rule on object ids, or checker syntax>" }
  ],
  "tutor_script": [
    { "mark": "highlight | circle | arrow | show_step | move", "target": "<object id>", "to": "<object id or position, for arrow/move>", "say": "<one short line the tutor can say with it>" }
  ],
  "hints": ["<level 1>", "<level 2>", "<level 3>"]
}
```

Hints follow the puzzle rules: three levels, none gives the answer, and the tutor decides when one is allowed.

`descriptor.duration_s` is a typical time to finish the scene. The `math` block holds the scene's problem and the steps a student would take on the board.

## Brief

```
{{paste one brief from brief-v1's output}}
```
