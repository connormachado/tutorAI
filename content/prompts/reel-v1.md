# Reel (v1)

*Paste after `_shared-v1.md`. Fill in the brief at the bottom. Rendered vertically (9:16) with the same animation pipeline as worked examples.*

---

Write a vertical reel: one idea, under 45 seconds, built to make a student curious or to fix one misconception fast.

## Shape

- **Beat 1 (0–2 s): the hook.** Something that makes a scrolling thumb stop: a surprising claim, a wrong answer that looks right, a quick "which would you do first?" Not a title card, and not "Today we'll learn...".
- **Middle beats: the one idea,** through the brief's angle. Two to five beats.
- **Last beat: an open question** the student can answer in their head, which the tutor follows up on afterwards (`tutor_notes.follow_up_prompt`). Never the answer.

## Rules

- **Under 45 seconds.** Each beat is 2 to 8 seconds.
- **It must work with the sound off.** Keep `body.needs_audio` false by putting every word that matters in `on_screen_text`. Voiceover is optional and only repeats the on-screen words.
- **On-screen text is short:** at most 12 words on screen at once, in large type. Math goes in `on_screen_latex`.
- **One idea.** If you're tempted to say "and also", cut it.
- **For a `repair` brief,** show the wrong move first, let it play out to a visibly wrong result, then show the fix. Name the mistake without making the viewer feel stupid for having made it.

## `body`

```json
{
  "orientation": "vertical",
  "needs_audio": false,
  "beats": [
    {
      "t_start": 0,
      "t_end": 2,
      "on_screen_text": "<words on screen>",
      "on_screen_latex": ["<math on screen, if any>"],
      "visual": "<what appears and moves>",
      "voiceover": "<optional; repeats on_screen_text>"
    }
  ]
}
```

## Brief

```
{{paste one brief from brief-v1's output}}
```
