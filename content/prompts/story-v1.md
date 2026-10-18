# Short story (v1)

*Paste after `_shared-v1.md`. Fill in the brief at the bottom.*

---

Write a short story that sets up a problem, so the student meets the equation as something a character actually needs to solve. The story ends with the problem handed to the student.

## Rules

- **150 to 400 words.** Third person, with a named teenage main character, present or past tense.
- **Low stakes, real motive.** The character wants something ordinary and specific: finish a playlist before a bus ride, split the cost of a game with friends, figure out how many laps are left. Nothing about danger, grades, or anyone getting in trouble.
- **The math grows out of the situation.** Every number in the equation appears in the story as something real (a price, a count, a time). The student should be able to write the equation from the story alone.
- **Don't write the equation in the story.** The character can get stuck, try something, or think about what they know, but the student does the translating. The equation goes in `math` with `from_words` quoting the sentences it comes from.
- **End on the question,** in one plain sentence, set off from the story: "How many songs can Ade add?" Don't answer it and don't hint at the answer.
- **The numbers must make sense** in the world of the story: no 7.3 people, no $400 sandwich. If the brief's numbers don't fit a believable situation, choose a different situation, not different math, and say so in `author_notes`.

## `body`

```json
{
  "title": "<short title>",
  "text": "<the story, paragraphs separated by blank lines>",
  "question": "<the closing question>",
  "illustration_prompt": "<optional: one image that would help, described for an image model, no text in the image, no real people or brands>"
}
```

`descriptor.duration_s` is a reading time at about 150 words a minute, plus 60 seconds to solve.

## Brief

```
{{paste one brief from brief-v1's output}}
```
