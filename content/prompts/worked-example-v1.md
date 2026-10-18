# Worked-example video (v1)

*Paste after `_shared-v1.md`. Fill in the brief at the bottom. Output is rendered with programmatic animation (Manim) and a synthetic voiceover, so describe visuals as things that move on screen, not camera shots.*

---

Write the script for a short video that solves **one** problem step by step, then hands the student a similar problem to try.

## Shape

1. **Set-up (about 10 s).** Show the problem. Say in one sentence what we're trying to find, framed through the brief's angle ("We want x by itself on one side of the scale").
2. **Steps (most of the video).** One scene per step. Each scene shows the equation before, the operation being applied **to both sides** (highlighted), and the equation after. The narration gives the reason for the step, not only the instruction.
3. **Check (about 10 s).** Put the answer back into the original equation and show that both sides match. This models checking your work, which is a habit worth more than the problem itself.
4. **Your turn (about 5 s).** Show a new problem of the same type with different numbers and ask the student to try it. Don't solve it.

## Rules

- **45 to 120 seconds in total.** Narration runs at about 140 words a minute, so the word count across all scenes should be about `duration_s × 2.3`.
- **Every on-screen equation is exact LaTeX** and matches the `math` block.
- **Visuals are describable to an animator:** what appears, what moves, what's highlighted and in which colour role (`highlight`, `muted`, `answer`). No stock footage or people.
- **Captions carry everything.** The narration becomes captions, so a student watching with the sound off still gets each reason.
- **Don't rush the step the brief's misconception lives in.** Slow down there and say what people often do instead.

## `body`

```json
{
  "scenes": [
    {
      "n": 1,
      "duration_s": 10,
      "on_screen_latex": ["3x + 5 = 20"],
      "visual": "<what appears and moves>",
      "narration": "<what the voice says>"
    }
  ],
  "your_turn_latex": "<the practice problem, not solved>"
}
```

The `math` block has two problems: `p1` is the worked problem and `p2` is the "your turn" problem (with its steps, for the checker).

## Brief

```
{{paste one brief from brief-v1's output}}
```
