# The Content Library: Design

*DRAFT proposal from Michael's side (content and learning experience), 2026-10-18. Nothing here is approved until Connor agrees. It proposes new R-ids (§10) and asks Connor to change one locked decision, A-8, so the whiteboard can be in V1 (§4.1); it does not edit `REQUIREMENTS.md`, `PRIVACY.md` or `DECISIONS.md`.*

## 1. Why this exists

The primer is the recommendation engine; the library is the catalog. TikTok's algorithm is only as good as the videos it can choose from, and the same is true here: the primer can diagnose a cracked floor precisely (R-01), know the student loves soccer (R-14) and know the last explanation didn't land (R-05), but if the only thing it can do next is send another paragraph of chat, that precision is wasted.

So Platy's bet is **a deep primer working together with a broad, varied content library**: videos, reels, puzzles, games, songs, stories, voice, a shared whiteboard, interactive graphs, long projects and, later, collaborative work. The alternative is the Khan Academy / classroom shape, a fixed lesson sequence everyone walks through. Many teams will build a primer (it was on YC's Fall 2026 Requests for Startups); far fewer will build the library that makes one worth having. That is the differentiation.

This doc defines what a content item is, how each one is described so the primer can choose it, how V1's Algebra 1 content gets made (including AI-generated media), and the small first slice to build.

## 2. Where this fits in today's specs

The existing specs are primer-first. Content touches them in these places:

| Spec | What it says today | What this doc does with it |
|---|---|---|
| R-05 Change the angle | Try a different explanation when one doesn't land | The library is where the "different angle" comes from. A new angle means a different item, ideally a different format. |
| R-07 Interest hooks | Reframe through the personality file's interests | Items carry interest tags from a fixed vocabulary; interest variants of an item are made ahead of time (§7). |
| R-04 / R-12 Retrieval, scheduling | The scheduler picks what to recall | The scheduler picks the skill; the library supplies a retrieval-role item for it. |
| R-21 De-escalation ladder | Rung 2 switches to a confidence-building topic | Rung 2 asks the library for a low-difficulty, game- or puzzle-format item on a mastered skill. |
| REQUIREMENTS "Not V1" | "The RAG ground-truth content layer ... needs its own R-id" | This doc is that layer, broadened from text explanations to all formats. It proposes R-29 to R-35 (§10). |
| Vision §2 "Ground-truth content" | Core math must be anchored to something verified, not improvised | Every item's math is machine-checked before it ships (§8, step 3). The tutor talks *about* a verified item instead of inventing math. |
| A-8 Whiteboard (locked) | Deferred to V1.5 | **Michael wants it in V1** (2026-10-18). This doc proposes a small V1 whiteboard (§4.1); Connor has to amend A-8 before it's built. |
| P-1 Kid content | "Anything the kid or the tutor said or showed" is never persisted | Library items are made ahead of time and contain no student data, so storing them is fine. Anything generated *for one student during a session* is kid content and is never stored or cached (§7). |
| P-2 / P-11 Egress | Only `primer.gateway` reaches third parties; nothing new phones home | No third-party players or embeds (YouTube, Spotify, game SDKs, analytics in game engines). Media is self-hosted on Connor's servers (A-1). |
| P-8 Distilled state | Only skill ids, outcome codes, counts, timestamps | Content engagement is stored as item ids and outcome codes (§6.4). That fits P-8 with no change. |
| R-27 Devices | School Chromebook at 1366×768, and phones | Every item declares size and layout needs; video ships at a Chromebook-friendly bitrate with captions. |

One correction to the framing in the kickoff conversation: the primer should **not** model "learning styles" (the visual/auditory/kinesthetic kind). Matching instruction to a self-declared style has been tested repeatedly and doesn't improve learning (Pashler et al., 2008, *Learning Styles: Concepts and Evidence*). What does work, and what the primer can measure, is **which formats actually lead this student to a correct next attempt and keep them going**. So the profile stores observed format affinity (§6.3), not a declared style. Variety itself still matters: several representations of one idea (a graph, an equation, a story) is good learning science, and that's what the library supplies.

## 3. The core model: skill × angle × format

A **content item** is one way to learn or practise one skill. It is defined by three things:

- **Skill**: which node(s) of the skill graph (R-10) it teaches, e.g. `alg1.linear.two_step`.
- **Angle**: the idea it uses to get there, e.g. "a balance scale: whatever you do to one side you do to the other" vs. "undo operations in reverse order, like unwrapping a present". Angles are what R-05 rotates through.
- **Format**: how it's delivered: reel, worked-example video, puzzle, song, and so on.

An angle can be rendered in several formats (the balance-scale angle works as a video, a puzzle and a story), and a format can carry several angles. The primer's job is to choose skill and role; the library's job is to choose the best angle and format for this student right now.

Items play one of a small set of **roles** in the learning loop:

| Role | Purpose | Typical formats |
|---|---|---|
| `hook` | Why should I care? Opens a new skill | Reel, story, song |
| `introduce` | First explanation of the idea | Worked-example video, interactive graph, chat |
| `worked_example` | One problem solved step by step | Worked-example video, step-through |
| `practice` | Student does it; produces mastery evidence | Puzzle, game, practice set, chat problem |
| `repair` | Targets one named misconception | Short clip, puzzle built around the mistake |
| `retrieval` | Recall something learned earlier (R-04) | Quick puzzle, flash round, song callback |
| `confidence` | Easy win after struggle (R-21 rung 2) | Game, puzzle on a mastered skill |
| `apply` | Use it in something bigger | Long project, story-driven challenge |

**Evidence matters.** Only interactive items (`practice`, `retrieval`, `confidence`, most `repair` and `apply`) produce observations for BKT (R-11). Watching a video produces no mastery evidence; it produces an engagement event (§6.4). Each interactive item declares exactly which skill each of its checks observes, so a game move counts as evidence the same way a typed answer does.

## 4. Formats

Status: **V1** = in the first build; **V1.x** = soon after, no spec conflict; **V2+** = needs accounts, social safety or kid-content generation, so later.

| Format | What it is | Good for | Evidence | How it's made | Status |
|---|---|---|---|---|---|
| Chat / Socratic dialogue | The primer itself talking through a problem | introduce, practice, repair | Yes | The tutor, anchored to an item's tutor notes | V1 (exists) |
| Voice | The same dialogue spoken (R-19) | Same as chat | Yes | Speech-to-text through the gateway | V1 (R-19) |
| Worked-example clip | 45–120 s video solving one problem step by step | worked_example, repair | No | Programmatic animation + TTS (§8) | **V1** |
| Reel | Vertical, under 45 s, one hook or one misconception | hook, repair | No | Same pipeline, vertical template | **V1** |
| Puzzle | Short interactive problem with a twist (balance scale, missing-step, spot-the-error) | practice, repair, retrieval | Yes | Puzzle templates in `web/` + problem generator | **V1** |
| Short story | 150–400 words, a narrative that sets up a problem the student solves | hook, apply | Yes (the closing problem) | Claude-written, human-edited, math-checked | **V1** |
| Song / jingle | 30–60 s mnemonic for a rule or procedure | hook, retrieval | No | Lyrics written and checked, then AI music generation (§8) | **V1** (one or two) |
| Interactive graph | Drag a slider, watch a line or parabola move | introduce, practice | Yes, if it asks a question | A coordinate-grid whiteboard scene, built in-house (no Desmos embed, P-11) | V1, when content reaches graphing |
| Mini-game | A few minutes of play where moves are skill checks | practice, confidence, retrieval | Yes | Small game templates in `web/`, parameterised by problem generators | V1.x |
| Explainer video | 3–6 min deeper explanation of one concept | introduce | No | Same pipeline as clips, longer script | V1.x |
| Long project | Multi-session task (design a budget, plan a trip, model a sports stat) | apply | Yes, at checkpoints | Hand-designed briefs with checkpoint problems | V1.x |
| Whiteboard | Shared canvas where tutor and student both work (§4.1) | introduce, practice, repair | Yes, structured actions only | Scenes authored with `whiteboard-v1`; the board itself is built in `web/` | **V1** (once A-8 is amended) |
| Student-made music | Student generates a song about a concept | apply, motivation | No | Live AI generation through the gateway; output is kid content, never stored | V2+ |
| Collaborative project | Work with friends on a shared project | apply | Yes | Needs friend accounts, moderation, teen messaging safety | V2+ |

Formats are added by writing a **player** (a React component in `web/`) and a **template** (how items of that format are authored). Adding a format never touches primer logic, because the primer only sees descriptors (§5).

### 4.1 The whiteboard in V1

**Michael's call (2026-10-18): the whiteboard is in V1.** A-8 is Connor's locked decision deferring it to V1.5, and `REQUIREMENTS.md` lists it under "Not V1". So this section is a proposal until Connor amends A-8. Until then `architect-reviewer` will flag whiteboard code as drift, so building it waits for that amendment; designing and authoring scenes doesn't.

V1's whiteboard is deliberately small: a canvas beside the chat with three layers.

1. **A scene** sets up the board: a balance scale, algebra tiles, a number line, a coordinate grid, write-in step boxes, or a blank page. A scene is a library item with format `whiteboard`. It is authored, math-checked and stored like any other item.
2. **Student tools that snap:** place a point, draw a line through two points, drag a block or tile, mark a spot on a number line, write in a box. There's also freehand ink for scratch work. Snapping matters because drawing freehand with a Chromebook trackpad is hard.
3. **Tutor marks from a fixed command set:** highlight, circle, arrow, show the next step, move an object. Each one refers to an object in the scene. The tutor doesn't generate free-form drawings, for the same reason video uses Manim: what's drawn has to be exactly right.

**Evidence.** How the whiteboard feeds BKT is an Open item in `DECISIONS.md`. The proposal for V1 is that only structured actions count, each as a check with an exact rule in the scene. Examples: the point snaps to (0, 3); the line passes through both given points; a block was taken off both pans. Freehand ink is never graded automatically. When the student taps "check my work", the ink goes to the vision model through the gateway, like a photo (R-20), so the tutor can respond. In V1 that response isn't counted as mastery evidence.

**Privacy.** Whatever the student draws or writes is kid content, like a photo (P-1, R-20). It lives in browser memory for the session only. It is never stored, cached or logged, and it leaves the browser only when the student asks for a check, and then only through the gateway. A hard reset (A-4) clears the board. Scenes are library content, and tutor marks and check results are structured events (P-8), so storing those is fine.

**It also helps with math input,** which is a known gap. Write-in boxes accept handwriting, read by the vision model on request, alongside typed math.

**Not in V1:** real-time boards shared between students (that's collaborative work, V2+), saving boards, free-form AI-drawn diagrams, and uploading images to the board.

## 5. The item descriptor

Every item is one JSON file in the library. The primer and the selector read only this descriptor, never the media. Example:

```json
{
  "id": "lin2-balance-reel-soccer",
  "version": 3,
  "status": "live",
  "format": "reel",
  "role": "hook",
  "skills": { "primary": "alg1.linear.two_step", "touches": ["alg1.linear.one_step"] },
  "angle": "balance-scale",
  "misconceptions": [],
  "difficulty": 2,
  "duration_s": 38,
  "interaction": "passive",
  "evidence": [],
  "interest_tags": ["soccer"],
  "sensitive_tags": [],
  "base_item": "lin2-balance-reel",
  "reading_level": 6,
  "media": {
    "src": "media/lin2-balance-reel-soccer.mp4",
    "bytes": 3400000,
    "orientation": "vertical",
    "needs_audio": false,
    "captions": "media/lin2-balance-reel-soccer.vtt",
    "transcript": "media/lin2-balance-reel-soccer.txt"
  },
  "tutor_notes": {
    "key_idea": "Do the same operation to both sides to keep the equation balanced.",
    "worked_problem": "3x + 5 = 20",
    "follow_up_prompt": "Ask what was taken off both sides first, and why."
  },
  "provenance": {
    "made_by": "ai-assisted",
    "script_prompt": "content/prompts/reel-v1",
    "media_tool": "manim+tts",
    "math_check": "passed",
    "reviewed_by": "michael",
    "reviewed_at": "2026-10-20",
    "sources": ["OpenStax Elementary Algebra 2e §2.2 (CC BY 4.0)"]
  },
  "license": "platy-original"
}
```

Field notes:

- **`skills`** use skill-graph ids (R-10). A descriptor naming a skill that isn't in the graph fails validation, so the library can't drift from the graph (in the spirit of A-6).
- **`evidence`** lists each check an interactive item makes and the skill it observes: `[{ "check": "step-1", "skill": "alg1.linear.one_step" }]`. Empty for passive items.
- **`misconceptions`** use ids from a per-skill misconception list that lives next to the skill graph (e.g. `lin2.subtract-before-divide-confusion`). `repair` items must name at least one.
- **`interest_tags`** come from a fixed vocabulary (about 30 tags: `soccer`, `basketball`, `gaming`, `music-hiphop`, `cooking`, `fashion`, ...). The personality file's free-text interests are mapped to tags once, at onboarding. The library never sees free text about a student, which keeps the selector on the safe side of P-1 and P-6.
- **`sensitive_tags`** mark what an item touches from a short fixed list (`food`, `body`, `money`, `family`, `loss`, `conflict`), so the selector can skip it for a student whose personality file lists that topic as one to avoid (R-14).
- **`tutor_notes`** are what the tutor model reads when it shows the item, so it can talk about it, follow up and stay anchored to the item's verified math. This is the "RAG ground-truth layer" from the vision doc.
- **`provenance`** is required. `math_check` must be `passed` and `reviewed_by` set before `status` can be `live`.
- There is **no per-student data** in a descriptor. Aggregate quality stats (§6.4) live in a separate table keyed by item id.

## 6. How the primer and the library work together

### 6.1 Who decides what

```
primer (Connor)                         library (Michael)
───────────────                         ─────────────────
BKT + scheduler + ladder decide:        selector decides:
  which skill, which role,       ──►      which item: angle, format,
  and any constraints                     interest variant
                                 ◄──    returns item id + tutor_notes
tutor shows it, talks about it
records outcome  ───────────────────►   aggregate stats per item
```

The request is a small, structured call made only at natural breakpoints (A-4):

```
select(skill_id, role, constraints) -> item_id
constraints: device ("chromebook" | "phone"), audio_ok, max_duration_s,
             exclude_angles (R-05: angles already tried this session),
             exclude_items (seen recently), interest_tags, sensitive_tags
```

### 6.2 Selection (V1: rules, not ML)

1. **Filter**: `status = live`, matching skill and role, fits the device and audio constraints, no `sensitive_tags` overlap, not seen recently, angle not in `exclude_angles`.
2. **Rank** by a simple weighted score: interest-tag match, the student's format affinity (§6.3), item quality (§6.4), and novelty (formats not seen this session score higher, which gives R-05 a different format, not just different words).
3. **Explore**: about 1 pick in 5 is the best item in a format the student hasn't tried much, so affinity doesn't lock in early. (This is an epsilon-greedy bandit; a smarter policy can replace it once there's real data.)
4. **Fallback**: if nothing passes the filter, return none and the tutor teaches in chat, as today. The library makes the primer better but is never required for a session to work.

### 6.3 Format affinity (in the profile)

Per student, per format: counts of `shown`, `completed`, `skipped`, and `next_attempt_correct` (whether the next evidence on that skill was correct). This is counts and codes, so it is distilled state under P-8 and encrypted with the profile under P-7. It replaces "learning style" with something measured.

### 6.4 Content events

Players emit structured events only: `content_started`, `content_completed`, `content_skipped` (with position), and `check_result` (check id, correct or not) for interactive items. No free-text answers are recorded in these events; a typed answer goes through the same path as `answer` today. Item quality is the aggregate across all students: completion rate, skip point, and how often the next attempt is correct. Aggregates have no student ids.

### 6.5 Proposed protocol addition

For `web/src/protocol.ts` (draft PR #1), to agree with Connor:

```ts
// ServerEvent
| { type: "content"; item_id: string; format: string; role: string }
// ClientEvent
| { type: "content_event"; item_id: string;
    event: "started" | "completed" | "skipped" | "check_result";
    position_s?: number; check?: string; correct?: boolean }

// Whiteboard (§4.1)
// ServerEvent: the tutor opens a scene, marks it, or clears it
| { type: "board_scene"; item_id: string }
| { type: "board_mark"; kind: "highlight" | "circle" | "arrow" | "show_step" | "move"; target: string; to?: string }
| { type: "board_clear" }
// ClientEvent: structured checks reuse content_event (event: "check_result");
// ink is sent only when the student taps "check my work", and never stored
| { type: "board_check_request"; item_id: string; image_png_base64: string }
```

The browser fetches the descriptor and media by `item_id` from Platy's own server.

## 7. Personalization tiers

| Tier | Example | Stored? | V1? |
|---|---|---|---|
| **Static** | The balance-scale reel | Yes, it's library content | Yes |
| **Interest variant** | The same reel, re-skinned for soccer, gaming, music | Yes: made ahead of time per tag, not per student, so it isn't kid content | Yes, 3 tags in the first slice |
| **Live-generated** | A story written in-session using details the student just mentioned | **Never** (P-1). Generated through the gateway, shown once, discarded | Text only, via the tutor (it already does this) |

Interest variants are the main lever: one base item with verified math, and N re-skins that change the story, visuals and names but not the numbers or the steps. Because the math lives in the base item, a variant needs only a light review.

Live-generated media (songs, video) per student is deliberately V2+: it's expensive, slow, can't be math-checked before the student sees it, and every output would be kid content that can't be kept.

## 8. How V1 Algebra 1 content gets made

Content is made at **author time**, offline, by Michael and tools. No student data is ever in a generation prompt, so authoring tools are outside the kid-data boundary. They should live outside `src/primer/` (proposed: `content/` for items and `tools/content/` for scripts) so the A-2 egress contract on `src/primer` stays simple. *Connor to confirm the layout.*

Pipeline for one item:

1. **Brief.** Generated from the skill graph: skill, prerequisite skills, misconception list, role, target format. One brief per (skill, role, angle).
2. **Script.** Claude drafts the script, story, lyrics or puzzle spec from the brief, using the prompts in [`content/prompts/`](../content/prompts/README.md) (versioned, cited in `provenance.script_prompt`). There is one prompt per format, plus a brief prompt that plans 4–6 angles per skill, an interest-variant prompt and a critic prompt that reviews each draft in a fresh conversation. Grounded in open sources where useful (OpenStax and Illustrative Mathematics are CC BY).
3. **Math check (automatic, required).** Every prompt returns the item's math as a structured block (the contract is in `content/prompts/_shared-v1.md`), which is checked with SymPy: each step is equivalent to the last, and the stated answer satisfies the original equation. A failed check blocks the item. This is the answer to "how do you know it teaches correctly".
4. **Media.**
   - *Video and reels:* programmatic animation (Manim or a similar library) rendered from the checked script, with TTS voiceover and generated captions. This is chosen over AI video-generation models because those regularly garble written math, and on-screen math has to be exactly right. AI image generation is fine for backgrounds and characters in interest variants.
   - *Songs:* lyrics written and math-checked in step 3, then an AI music service sets them to music. Check each service's commercial-use terms before relying on it.
   - *Puzzles and games:* not generated media. A template in `web/` plus a problem generator that produces valid, checked problems for a skill and difficulty.
   - *Stories:* text from step 2, with an optional generated illustration.
5. **Human review.** Michael reviews each base item. For pedagogy, a second reviewer with tutoring experience (Michael's mom, the vision doc's built-in advisor) spot-checks a sample. Interest variants get a lighter pass.
6. **Publish.** The descriptor and transcript are committed to `content/`; media goes to object storage on Platy's servers (A-1). A validation script (descriptor schema, skill ids exist, math_check passed, media size within budget) runs in CI.

Rough throughput target, inferred rather than measured: once the templates exist, a base item should take under an hour of human time and a variant a few minutes. The first slice will tell us the real number.

## 9. The first slice

**Scope: linear equations, three skills.** These are already the demo's problems (`web/src/mock/script.ts` in PR #1):
`alg1.linear.one_step`, `alg1.linear.two_step`, `alg1.linear.distributive`.

**Items (about 27):**

| Format | Items | Notes |
|---|---|---|
| Worked-example clip | 3 (one per skill) | Proves the Manim + TTS pipeline |
| Reel | 2 base × 3 interest variants = 6 | Balance-scale hook; the "subtract or divide first?" misconception |
| Puzzle | 3 templates × generated problems | Balance-scale, missing-step, spot-the-error; all produce evidence |
| Short story | 2 base × 3 variants = 6 | Closing problem is a real two-step equation |
| Song | 1 | "Undo it in reverse" mnemonic; proves the music path and its licensing |
| Whiteboard scene | 2 | Balance scale (drag blocks off both pans; each move is a check) and step boxes (write each line; the tutor marks the line that went wrong) |
| Tutor notes | on every item | So chat can anchor to each item |

Interest tags for the slice: `soccer`, `gaming`, `music`.

**Build order:**

1. Descriptor schema, validator and the `content/` layout (Michael).
2. The math checker (step 3), because nothing ships without it.
3. Players in `web/`: video/reel player, puzzle player, story reader, then the whiteboard (once A-8 is amended). The mock server serves items so this works before the backend exists.
4. Author the items above.
5. The `select()` call and content events in the primer (Connor), with rule-based selection (§6.2).
6. Try it on a few real students 13+ (the vision doc's test group) and compare completion and next-attempt-correct by format.

**What we learn:** which formats students finish, which ones precede a correct next attempt, what one item really costs to make, and whether interest variants move engagement enough to justify making them at scale.

## 10. Proposed R-ids (for Connor)

Numbering continues after R-28 (the age gate, in PR #1).

- **R-29 Content library.** Items with validated descriptors (§5), keyed to skill-graph ids; a descriptor naming a missing skill fails validation.
- **R-30 Math verification.** No item goes live unless its math check passed and a human reviewed it.
- **R-31 Content selection.** At natural breakpoints the primer requests (skill, role, constraints) and gets an item or none; with none, the tutor falls back to chat. R-05 retries prefer a different angle and format.
- **R-32 Interest variants.** Pre-made per interest tag from a fixed vocabulary; the library never sees free-text profile data.
- **R-33 Content events and format affinity.** Structured engagement events and per-format counts, stored as distilled state (P-8).
- **R-34 Self-hosted media.** All content media and players are served from Platy's own servers; no third-party embeds or SDKs. *(Could instead be a P-id in `PRIVACY.md`, since it is really P-11 applied to content.)*
- **R-35 Whiteboard.** A canvas with library scenes, snapping student tools, freehand scratch ink and a fixed set of tutor marks (§4.1). Only structured actions count as evidence. Student ink is kid content: never stored, and sent only through the gateway when the student asks for a check. *Needs A-8 amended first.*

## 11. Open questions

**For Connor**
1. Michael wants the whiteboard in V1. Will you amend A-8 (and drop it from "Not V1" in `REQUIREMENTS.md`), and accept structured checks only as the V1 answer to the Open "whiteboard-to-BKT" item (§4.1)?
2. Does `select()` belong inside the primer (a `src/primer/content/` module) or as a separate service the primer calls?
3. Is the `content/` + `tools/content/` layout outside `src/primer` OK with the egress contract and the gate?
4. The protocol addition in §6.5.
5. R-29 to R-35: accept, merge or cut.
