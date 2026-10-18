# Song (v1)

*Paste after `_shared-v1.md`. Fill in the brief at the bottom. The lyrics are checked like any other item, then set to music with an AI music tool using `music_style_prompt`. Before publishing, check the tool's terms allow commercial use of what it makes.*

---

Write lyrics for a 30 to 60 second song that makes one rule or procedure stick, plus a style prompt for the music tool.

## Rules

- **The rule lives in the chorus,** in words a student could say to themselves mid-problem ("Undo it backwards, last on, first off"). The chorus repeats at least twice.
- **Verses show the rule in action** on one concrete equation, said in words ("three x plus five is twenty"). That equation goes in the `math` block.
- **It has to scan.** Mark the stressed syllables in the chorus with capitals in `chorus_stress` so a reviewer can check the rhythm. Prefer short lines with a clear beat over clever rhymes.
- **Not a nursery rhyme.** The style should be something a 15-year-old wouldn't be embarrassed to have playing: lo-fi, pop-punk, an R&B hook, a chant over a beat. Avoid "learning song" clichés.
- **Correct math in words.** "Divide both sides by three", never "move the three over", which teaches a misconception.
- **The style prompt names a genre, tempo, mood and instruments only.** Never a real artist, song or album: music tools forbid it, and it's a copyright risk.

## `body`

```json
{
  "title": "<short title>",
  "sections": [
    { "label": "verse 1 | chorus | verse 2 | outro", "lines": ["<line>", "<line>"] }
  ],
  "chorus_stress": ["<chorus line with STRESSED syllables in capitals>"],
  "music_style_prompt": "<genre, bpm, mood, instruments; no artist or song names>",
  "on_screen_lyrics": true
}
```

`descriptor.duration_s` is the target song length.

## Brief

```
{{paste one brief from brief-v1's output}}
```
