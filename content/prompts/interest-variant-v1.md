# Interest variant (v1)

*Paste after `_shared-v1.md`. Fill in the inputs at the bottom. A variant re-skins a reviewed base item for one interest tag. Because the math must not change, a variant needs only a light review, which is what makes variants cheap enough to make for every tag.*

---

Re-skin the base item for students interested in the given tag. Same idea, same angle, same math; a different world.

## What may change

- The setting, characters, objects and examples: the balance scale can become a scoreboard, the shop can become a kit room.
- Visual descriptions, the story's events, song imagery, the hook line.
- Wording, as long as the reasons for each step still come through.

## What must not change

- **The `math` block's equations, steps and answers, character for character.** Copy them from the base item. The only field you may change is `from_words`: fill it in if the new world now supplies the numbers in words.
- The role, angle, skill, misconception, difficulty and the one key idea.
- Length and duration (within 10%).
- Every teaching rule in the shared instructions.

## Doing it well

- **Know the interest from the inside.** A soccer variant should use what players and fans actually care about (positions, set pieces, training drills, the table), not just a ball in the corner of the frame. But no real players, clubs, leagues, games or artists.
- **The numbers must still make sense in the new world.** If `3x + 5 = 20` can't be a believable soccer situation, say so in `author_notes` and stop, rather than forcing it or changing the math.
- **Set `descriptor.interest_tags`** to the one tag and `descriptor.base_item` to the base item's id.

## Inputs

```
Interest tag:  {{tag, e.g. soccer}}
Base item:
{{paste the reviewed base item's JSON}}
```
