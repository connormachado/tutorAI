# The Content Library: Design

*DRAFT proposal from Michael's side (content and learning experience), 2026-10-18. Nothing here is approved until Connor or Michael approves it. It proposes new R-ids (§10) A-8 was amended on 2026-10-18 so the whiteboard is in V1 (§4.1). It does not edit `REQUIREMENTS.md`, `PRIVACY.md` or `DECISIONS.md`.*

*Revised later on 2026-10-18 to fit the binding "Demo contract" Connor added to `CLAUDE.md` on main, together with his skill-map models (`src/platy/skills/`) and `platy.mathcheck`. §2.1 summarises what changed. Updated again the same day after Michael chose the React app in `web/` as the demo frontend: content players live there.*

## 1. Why this exists

The primer is the recommendation engine; the library is the catalog. TikTok's algorithm is only as good as the videos it can choose from, and the same is true here. The primer can diagnose a cracked floor precisely (R-01), know the student loves soccer (R-14) and know the last explanation didn't land (R-05). But if the only thing it can do next is send another paragraph of chat, that precision is wasted.

So Platy's bet is **a deep primer working together with a broad, varied content library**: videos, reels, puzzles, games, songs, stories, voice, a shared whiteboard, interactive graphs, long projects and, later, collaborative work. The alternative is the Khan Academy / classroom shape, a fixed lesson sequence everyone walks through. Many teams will build a primer (it was on YC's Fall 2026 Requests for Startups); far fewer will build the library that makes one worth having. That is the differentiation.

This doc defines what a content item is, how each one is described so the primer can choose it, how V1's Algebra 1 content gets made (including AI-generated media), and the small first slice to build.

## 2. Where this fits in today's specs

The existing specs are primer-first. Content touches them in these places:

| Spec | What it says today | What this doc does with it |
|---|---|---|
| R-05 Change the angle | Try a different explanation when one doesn't land | The library is where the "different angle" comes from. A new angle means a different item, ideally a different format. |
| R-07 Interest hooks | Reframe through the personality file's interests | Items carry interest tags from a fixed vocabulary; template skins and interest variants are made per tag, ahead of time, and the tutor adds the personal touch in its own words (§7). |
| R-04 / R-12 Retrieval, scheduling | The scheduler picks what to recall | The scheduler picks the skill; the library supplies a retrieval-role item for it. |
| R-21 De-escalation ladder | Rung 2 switches to a confidence-building topic | Rung 2 asks for an `easy_win` item: low difficulty, game or puzzle format, on a mastered skill. |
| R-01 Diagnose first | On main, diagnosis uses the skill map's three probes per node | Diagnosis stays with the probes. Interactive items add evidence after diagnosis; they don't replace it, and they never reuse a probe's equation (§5). |
| R-29 (pending) | Sympy decides correctness, never a model | Every item's math, and every check on what a student does, goes through `platy.mathcheck` (§8 step 3, §6.4). |
| R-30 (pending) Metacognition | A confidence check and a reflection | Interactive items carry a reflection prompt, and policy runs the confidence check before an item's checks (§6.1). |
| REQUIREMENTS "Not V1" | "The RAG ground-truth content layer. The vision doc sequences it after the core loop is validated, so it needs its own R-id when that happens." | This doc is that layer, broadened from text explanations to all formats, and proposes building part of it earlier. Whether any of it goes in the demo is a decision for Connor and Michael (§2.1, §11). |
| Vision §2 "Ground-truth content" | Core math must be anchored to something verified, not improvised | Every item's math is machine-checked before it ships. The tutor talks *about* a verified item instead of inventing math. |
| A-8 Whiteboard (locked) | In V1 (amended 2026-10-18; was V1.5) | This doc proposes a small V1 whiteboard (§4.1). |
| P-1 Child content | "Anything the child or the tutor said or showed" is never persisted | Library items are made ahead of time and contain no student data, so storing them is fine. Anything generated *for one student during a session* is child content and is never stored or cached (§7). |
| P-2 / P-11 Egress | Only `platy.gateway` reaches third parties; nothing new phones home | No third-party players or embeds (YouTube, Spotify, game SDKs, analytics in game engines). Media is served by Platy itself. Authoring tools are a separate case (§8). |
| P-8 Distilled state | Only skill ids, outcome codes, counts, timestamps | Content engagement is item ids and outcome codes (§6.4). In the demo nothing persists at all ("No DB", memory only); P-8 storage applies once there is a store. |
| P-14 (pending) | Only pinned, ZDR-verified models and features | Whiteboard "check my work" (vision) and voice (R-19) each need a pinned, ZDR-verified model role before they're built (§4.1). |
| R-27 Devices | School Chromebook at 1366×768, and phones | Every item declares size and layout needs; video ships at a Chromebook-friendly bitrate with captions. |

One correction to the framing in the kickoff conversation: the primer should **not** model "learning styles" (the visual/auditory/kinesthetic kind). Matching instruction to a self-declared style has been tested repeatedly and doesn't improve learning (Pashler et al., 2008, *Learning Styles: Concepts and Evidence*). What does work, and what the primer can measure, is **which formats actually lead this student to a correct next attempt and keep them going**. So the primer tracks observed format affinity (§6.3), not a declared style. Variety itself still matters: several representations of one idea (a graph, an equation, a story) is good learning science, and that's what the library supplies.

### 2.1 The demo contract on main

Connor's "Demo contract" in `CLAUDE.md` is binding for all work. It sets: one unit (solving linear equations), one path, 14–18 skill nodes; a closed stack (`anthropic`, `pydantic`, `sympy`, `fastapi`, `pyBKT`; no DB; any new dependency needs approval); policy deciding every turn, with `policy/checks.py` gating every tutor move; sympy as the only judge of correctness; child state in memory only; and fixed child-facing text living only in `src/platy/prompts/*.md`, so the pedagogy eval gate covers it.

**The frontend is the React app in `web/`** (A-11, 2026-10-18). As first written, the contract made the demo Streamlit only; A-11 replaces Streamlit with `web/` and a FastAPI server in front of Connor's Python primer. So in this doc:

- **Content players live in `web/`.** Each format gets a player component there, built and tested against PR #1's mock server first. The Python side chooses, checks and grades; the browser only shows items and reports what the student did (§6.4, §6.5).
- **Everything else in the contract still holds:** items are chosen by policy and gated by `checks.py`, every check is graded by `platy.mathcheck` on the server, child state lives in memory only (server memory and React state, never browser storage), and nothing is persisted in the demo.
- **Still open:** whether any content goes in the demo itself, or the library waits until the core loop is validated, as `REQUIREMENTS.md` sequences it (§11). The "Demo" column in §4 says which formats would fit if it does.

## 3. The core model: skill × angle × format

A **content item** is one way to learn or practise one skill. It is defined by three things:

- **Skill**: which node(s) of the skill map (R-10) it teaches, by node id. Ids follow `SkillNode`'s pattern (lowercase snake_case, e.g. `two_step_equations`). The ids in this doc are placeholders until Connor's linear-equations map lands.
- **Angle**: the idea it uses to get there, e.g. "a balance scale: whatever you do to one side you do to the other" vs. "undo operations in reverse order, like unwrapping a present". Angles are what R-05 rotates through.
- **Format**: how it's delivered: reel, worked-example video, puzzle, song, and so on.

An angle can be rendered in several formats (the balance-scale angle works as a video, a puzzle and a story), and a format can carry several angles. The primer chooses the skill and the role. Item selection then picks the best angle and format for this student right now. Selection is a pure function that policy calls (§6.1).

Items play one of a small set of **roles** in the learning loop:

| Role | Purpose | Typical formats |
|---|---|---|
| `hook` | Why should I care? Opens a new skill | Reel, story, song |
| `introduce` | First explanation of the idea | Worked-example video, interactive graph, chat |
| `worked_example` | One problem solved step by step | Worked-example video, step-through |
| `practice` | Student does it; produces mastery evidence | Puzzle, game, practice set, chat problem |
| `repair` | Targets one named misconception | Short clip, puzzle built around the mistake |
| `retrieval` | Recall something learned earlier (R-04) | Quick puzzle, flash round, song callback |
| `easy_win` | Easy success after struggle (R-21 rung 2) | Game, puzzle on a mastered skill |
| `apply` | Use it in something bigger | Long project, story-driven challenge |

(`easy_win` was called `confidence` in the first draft; it was renamed so it doesn't collide with R-30's confidence check.)

**Evidence matters.** Only interactive items (`practice`, `retrieval`, `easy_win`, most `repair` and `apply`) produce observations for BKT (R-11). Watching a video produces no mastery evidence; it produces an engagement event (§6.4). Each interactive item declares exactly which skill each of its checks observes. A check is decided by sympy through `platy.mathcheck`, or by exact UI state such as which step was tapped, and never by a model or by the browser's say-so.

## 4. Formats

Status: **V1** = in the first V1 build; **V1.x** = soon after, no spec conflict; **V2+** = needs accounts, social safety or child-content generation, so later. "Demo" says whether the format could be in the demo, if content goes in it (§11): it has to be V1, inside the demo unit, and buildable without an unapproved spec.

| Format | What it is | Good for | Evidence | How it's made | Status | Demo |
|---|---|---|---|---|---|---|
| Chat / Socratic dialogue | The primer itself talking through a problem | introduce, practice, repair | Yes | The tutor, anchored to an item's tutor notes | V1 (exists) | Yes |
| Voice | The same dialogue spoken (R-19) | Same as chat | Yes | Speech-to-text; needs a pinned, ZDR-verified speech path (P-14) and, if not Anthropic, a new gateway host (P-4) | V1 (R-19) | Not yet |
| Worked-example clip | 45–120 s video solving one problem step by step | worked_example, repair | No | Programmatic animation + TTS (§8) | **V1** | Yes |
| Worked-example step-through | A solved problem shown a step at a time, then faded: the student writes more of the steps as mastery grows | worked_example, practice | Yes (a "why" choice, then each step they write) | A template in the UI + a problem generator | **V1** (built in `web/`, against the mock) | Yes |
| Reel | Vertical, under 45 s, one hook or one misconception | hook, repair | No | An animated template in `web/`, filled per student (§7.2) | **V1** | Yes |
| Puzzle | Short interactive problem with a twist (balance scale, missing-step, spot-the-error) | practice, repair, retrieval | Yes | Puzzle templates in the UI + a problem generator | **V1** | Yes |
| Short story | 150–400 words, a narrative that sets up a problem the student solves | hook, apply | Yes (the closing problem) | Claude-written, human-edited, math-checked | **V1** | Yes |
| Song / jingle | 30–60 s mnemonic for a rule or procedure | hook, retrieval | No | Lyrics written and checked, then AI music generation (§8) | **V1** (one or two) | Yes |
| Whiteboard | Shared canvas where tutor and student both work (§4.1) | introduce, practice, repair | Yes, structured actions only | Scenes authored with `whiteboard-v1`; the board is a UI component | **V1** (A-8) | Once R-47 is approved |
| Interactive graph | Drag a slider, watch a line or parabola move | introduce, practice | Yes, if it asks a question | A coordinate-grid whiteboard scene, built in-house (no Desmos embed, P-11) | V1, when content reaches graphing | No (outside the demo unit) |
| Mini-game | A few minutes of play where moves are skill checks | practice, easy_win, retrieval | Yes | Small game templates, parameterised by problem generators | V1.x | No |
| Explainer video | 3–6 min deeper explanation of one concept | introduce | No | Same pipeline as clips, longer script | V1.x | No (V1.x) |
| Long project | Multi-session task (design a budget, plan a trip, model a sports stat) | apply | Yes, at checkpoints | Hand-designed briefs with checkpoint problems | V1.x | No (one path) |
| Student-made music | Student generates a song about a concept | apply, motivation | No | Live AI generation through the gateway; output is child content, never stored | V2+ | No |
| Collaborative project | Work with friends on a shared project | apply | Yes | Needs friend accounts, moderation, teen messaging safety | V2+ | No |

A format is added by writing a **player** (a component in `web/`) and a **template** (how items of that format are authored). Adding a format never touches the primer's decision logic, because policy only sees descriptors (§5).

### 4.1 The whiteboard in V1

**The whiteboard is in V1** (A-8, amended 2026-10-18; `REQUIREMENTS.md` no longer lists it under "Not V1"). The board itself is a component in `web/`, like the other players.

V1's whiteboard is deliberately small: a canvas beside the chat with three layers.

1. **A scene** sets up the board: a balance scale, algebra tiles, a number line, a coordinate grid, write-in step boxes, or a blank page. A scene is a library item with format `whiteboard`. It is authored, math-checked and stored like any other item.
2. **Student tools that snap:** place a point, draw a line through two points, drag a block or tile, mark a spot on a number line, write in a box. There's also freehand ink for scratch work. Snapping matters because drawing freehand with a Chromebook trackpad is hard.
3. **Tutor marks from a fixed command set:** highlight, circle, arrow, show the next step, move an object. Each one refers to an object in the scene. The tutor doesn't generate free-form drawings, for the same reason video uses Manim: what's drawn has to be exactly right. Marks are tutor moves, so they pass `policy/checks.py` like any other move. For example, `show_step` on the step that contains the answer is an answer reveal, which needs policy to allow one (R-02).

**Evidence.** How the whiteboard feeds BKT is an Open item in `DECISIONS.md`. The proposal for V1 is that only structured actions count, each as a check with an exact rule in the scene. Examples: the point snaps to (0, 3); the line passes through both given points; a block was taken off both pans. Coordinate checks compare snapped values exactly; algebraic checks (a step box) go through `platy.mathcheck`. Freehand ink is never graded automatically.

**"Check my work."** When the student asks for a check, the steps are:
1. The ink or handwriting goes to a vision model through the gateway, like a photo (R-20). That needs a pinned, ZDR-verified vision role (P-14).
2. The vision model only transcribes. Before anything else, its output gets the same **safety-first step** as any child message: a disclosure stops tutoring with the fixed safety text, and nothing falls through to the tutor.
3. Correctness of the transcribed lines is then decided by `platy.mathcheck`, never by the model. The "line that went wrong" is the first line whose solution set isn't the answer's, and the tutor only points at it.
4. Child-written math needs normalising before mathcheck sees it (`2x` → `2*x`, `X` → `x`, `−` → `-`). Main has no normaliser yet (§11).

In V1, a vision-read check isn't counted as mastery evidence.

**Privacy.** Whatever the student draws or writes is child content, like a photo (P-1, R-20). It lives in memory only: React state in the browser (never browser storage, cookies or the console, as `web/` already does for chat) and session memory on the server. It is never stored, cached or logged, and it leaves the app only when the student asks for a check, and then only through the gateway. A hard reset (A-4) clears the board, and a safety stop closes it. Scenes are library content, and tutor marks and check results are structured codes.

**It also helps with math input,** which is a known gap. Write-in boxes accept handwriting, read by the vision model on request, alongside typed math.

**Not in V1:** real-time boards shared between students (that's collaborative work, V2+), saving boards, free-form AI-drawn diagrams, and uploading images to the board.

## 5. The item descriptor

Every item is one JSON file, validated by a pydantic model in the same style as `SkillMap` (`extra="forbid"`, frozen, `schema_version`). The primer reads only this descriptor, never the media. Example:

```json
{
  "schema_version": 1,
  "id": "lin2-balance-reel-soccer",
  "version": 3,
  "status": "live",
  "format": "reel",
  "role": "hook",
  "skills": { "primary": "two_step_equations", "touches": ["one_step_equations"] },
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
    "script_text": "media/lin2-balance-reel-soccer.txt"
  },
  "tutor_notes": {
    "key_idea": "Do the same operation to both sides to keep the equation balanced.",
    "worked_problem": "3x + 5 = 20",
    "follow_up_prompt": "Ask what was taken off both sides first, and why.",
    "reflection_prompt": "Ask what they'd check first next time they see a plus-something on one side."
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

- **`skills`** use skill-map node ids (R-10). The validator loads the `SkillMap` and fails an item whose `primary` isn't a node, or whose `touches` (and every evidence check's skill) isn't the primary node or in its `prerequisite_chain`. The library can't drift from the map (A-6).
- **`evidence`** lists each check an interactive item makes and the skill it observes: `[{ "check": "step_1", "skill": "one_step_equations" }]`. Empty for passive items.
- **`misconceptions`** use ids from a per-skill misconception list (snake_case, e.g. `undo_with_same_op`). `repair` items must name at least one. `SkillNode` has no field for these yet, and its `extra="forbid"` means one has to be added to Connor's model, or the list has to live in a sibling file keyed by node id (§11).
- **No probe reuse.** An item may not use any skill-map probe's equation, because showing it would hand the student that probe's answer and spoil diagnosis (R-01). The validator checks this.
- **`interest_tags`** come from a fixed vocabulary (about 30 tags: `soccer`, `basketball`, `gaming`, `music-hiphop`, `cooking`, `fashion`, ...). The personality file's free-text interests are mapped to tags once, at onboarding, by a model role whose tool schema has the tags as a static enum. The library never sees free text about a student, which keeps selection on the safe side of P-1 and P-6.
- **`sensitive_tags`** mark what an item touches from a short fixed list (`food`, `body`, `money`, `family`, `loss`, `conflict`), so selection can skip it for a student whose personality file lists that topic as one to avoid (R-14).
- **`tutor_notes`** are what the tutor model reads when it shows the item, so it can talk about it, follow up and stay anchored to the item's verified math. This is the "RAG ground-truth layer" from the vision doc. They vary by turn, so under the prompt-caching rule (pending R-28) they go in a later, uncached system block, never in `system[0]` or a tool definition. `worked_problem` is display notation only; the checkable form is in the item's math block (§8).
- **`media.script_text`** is the narration or on-screen text, kept for captions and accessibility. It's authored content, not a session transcript.
- **`provenance`** is required. `math_check` must be `passed` and `reviewed_by` set before `status` can be `live`.
- **Template items** (puzzles, whiteboard scenes, short reels) also carry `generator` rules, the `slots` they expose and a `skins` map of slot defaults keyed by interest tag, so the numbers, the skin and the student's own picks are filled in at runtime (§7.2, §7.3). The example above is a reel rendered to video, the route for a reel that needs effects a template can't do.
- There is **no per-student data** in a descriptor.

## 6. How the primer and the library work together

### 6.1 Who decides what

On main, policy (pure) decides each turn's allowed and required actions, and every tutor move passes `policy/checks.py`. Content slots into that, rather than sitting beside it:

```
policy (Connor)                               content module (Michael)
──────────────                                ────────────────────────
BKT + scheduler + ladder decide:              select_item(skill, role, constraints,
  skill, role, allowed actions     ──►          library) -> item id or None
                                   ◄──          (pure; reads packaged library data)
allowed actions may include
  show_item(item_id)
tutor returns TutorMove(show_item, item_id, message)
checks.py: answer leak (mathcheck), reveal allowed?, length cap, required action
UI renders the item; check results come back as codes
```

- **Selection is a pure function** in a small `content` module, called by policy and read from packaged data. It's not a separate service.
- **Showing an item is a tutor move,** so the usual checks apply. A worked example of the exact problem the student is on is an answer reveal, and policy has to allow a reveal first (R-02).
- **Items can be offered on any turn policy allows,** including mid-problem for R-05's "change the angle". Hard resets (A-4) are a separate thing and still happen only at natural breakpoints.
- **R-30:** before an interactive item's checks are graded, policy runs the confidence check. Afterwards, the item's `reflection_prompt` gives the tutor a reflection to ask.
- **Puzzles don't give feedback on their own.** The player sends what the student did and stops. The server grades it, matches the misconception, and sends the result back as a code. Policy then decides what's next: ask the student to explain their step first (R-03), and give no hint before a first try or while that explanation is still owed (R-02). Misses on a puzzle count toward the de-escalation ladder like misses on a problem (R-21). Authored hints and feedback are material the tutor draws on, which policy allows by id, not text the player shows by itself.

The call:

```
select_item(skill_id, role, constraints, library) -> item_id | None
constraints: device ("chromebook" | "phone"), audio_ok, max_duration_s,
             exclude_angles (R-05: angles already tried this session),
             exclude_items (seen this session), interest_tags, sensitive_tags,
             format_affinity (this session's counts, §6.3)
```

### 6.2 Selection rules

1. **Filter**: `status = live`, matching skill and role, fits the device and audio constraints, no `sensitive_tags` overlap, not already seen this session, angle not in `exclude_angles`.
2. **Rank** by a simple weighted score: interest-tag match, format affinity (§6.3), item quality (§6.4, once it exists), and novelty. Formats not seen this session score higher, which gives R-05 a different format, not just different words.
3. **Deterministic in the demo.** Ties break by item id, so the same inputs always give the same pick, and the function is testable like the rest of policy. Exploration (sometimes picking a less-tried format on purpose, so affinity doesn't lock in early) comes later, with a seeded random number generator so it stays reproducible.
4. **Fallback**: if nothing passes the filter, return none and the tutor teaches in chat, as today. The library makes the primer better but is never required for a session to work.

### 6.3 Format affinity

Per student, per format: counts of `shown`, `completed`, `skipped`, and `next_attempt_correct` (whether the next evidence on that skill was correct). In the demo these live in the server's session memory and vanish with the session, like all child state. Once there is a store, they're counts and codes, so they'd be distilled state under P-8, encrypted with the profile under P-7. Affinity replaces "learning style" with something measured.

### 6.4 Content events and checks

Players emit structured events only: `content_started`, `content_completed`, `content_skipped` (with position), and `check_result`.

- **`check_result`** carries the check id, the outcome code, `hints_used` and a response-time bucket, so it can feed R-11's `multigs` classes.
- **The outcome is computed on the server,** never asserted by the browser. Algebraic checks call `platy.mathcheck` on the student's (normalised) input. UI-state checks (which step was tapped, where a point snapped) compare exact values. The browser sends what the student did; the server grades it, and the result comes back as a code.
- **No free-text answers are recorded.** A typed answer goes through the same whitelist-then-mathcheck path as any child input.

Later, item quality is the aggregate across students: completion rate, skip point, and how often the next attempt is correct. Aggregates have no student ids and need a store, so they're post-demo.

### 6.5 Protocol additions for `web/`

**Puzzles (built, against the mock).** These are in `web/src/protocol.ts`, with the puzzle shapes in `web/src/content/types.ts`:

```ts
// ServerEvent
| { type: "puzzle"; puzzle: Puzzle }  // item, instance, resolved skin, and the template's own fields
| { type: "puzzle_result"; instance_id: string; check: CheckId; outcome: "correct" | "incorrect" | "unreadable" }
| { type: "puzzle_done"; instance_id: string }
// ClientEvent (the server grades; the client never sends "correct")
| { type: "puzzle_move"; instance_id: string; move: PuzzleMove }  // a tapped line, a typed line, or a scale move
| { type: "puzzle_hint"; instance_id: string }
| { type: "puzzle_next"; instance_id: string }  // finished, ready to move on
| { type: "slot_pick"; colors: PaletteId }  // R-38, from a fixed palette
```

The worked example (`worked_example`) uses the same events. Its steps arrive in order, each with the move that made it; a step the student has to write arrives as `null`, so the browser never has it. The server sets how many steps to leave from the student's mastery (fully shown, then the last step left, then both, which is backward fading). When every step is shown it adds a "why this step?" question with three choices (`why`, graded by the tapped position). Otherwise the student writes the missing steps (`first_step`, then `final_answer`).

A second `puzzle` event with the same `instance_id` only changes the skin, so the student keeps their progress. The browser draws a balance-scale move only after the server's `puzzle_result` accepts it. `child_message` carries no problem or puzzle id, so the server reads it against whatever is current when it's handled. The browser therefore holds the chat while a move waits for its verdict and from `puzzle_next` (or a solved problem) until the next `problem` or `puzzle` arrives, and the server must always answer `puzzle_next` with `puzzle_done`. Adding the on-screen id to `child_message` would let the server drop a stale message instead; that's a contract question for the backend. Hints used and response times for R-11 stay on the server, which already sees every move and hint request.

**Other formats (proposed, not built).** Videos, songs, stories and the whiteboard would add:

```ts
// ServerEvent
| { type: "content"; item_id: string; format: string; role: string }
// ClientEvent (the server grades; the client never sends "correct")
| { type: "content_event"; item_id: string;
    event: "started" | "completed" | "skipped" | "attempt";
    position_s?: number; check?: string; input?: string; hints_used?: number }

// Whiteboard (§4.1)
// ServerEvent: the tutor opens a scene, marks it, or clears it
| { type: "board_scene"; item_id: string }
| { type: "board_mark"; kind: "highlight" | "circle" | "arrow" | "show_step" | "move"; target: string; to?: string }
| { type: "board_clear" }
// ClientEvent: ink is sent only when the student taps "check my work", and never stored
| { type: "board_check_request"; item_id: string; image_png_base64: string }
```

## 7. Personalization: tailored to each student, without per-student media

The goal is that every student's experience feels made for them: their interests, their pace, the formats that work for them. The economical way to get there is to **personalize by choosing and assembling, not by generating new media for each student.** Media is the expensive part, so it's made once and reused. What changes per student is which pieces are picked, the numbers and "skin" inside templates, and the tutor's words around them.

This is also where the evidence points. In Walkington's study of 145 high-school algebra students in Carnegie Learning's Cognitive Tutor, word problems rewritten around each student's interests (same math) led to better and faster learning, especially for low-achieving students (58% vs 25% success at writing expressions in the personalized unit), and the gain held in a later unit after the personalization was removed. What changed was the context, not the math or the media. (One study, one tutoring system; reported by [EdSurge](https://edsurge.com/news/2013-11-08-can-interest-based-personalization-deliver-better-learning-outcomes), 2013.)

### 7.1 Five layers, cheapest first

| Layer | What's tailored | How | Extra cost per student | Stored? |
|---|---|---|---|---|
| **1. Selection** (the primer) | Skill, timing, pace, difficulty, role, angle, format | BKT, the scheduler and policy choose; `select_item` ranks by interest tags and format affinity (§6) | None | Only counts and codes (§6.3) |
| **2. Live templates** | The numbers, difficulty and skin (setting, names, art) | Puzzles, whiteboard scenes and short reels are components in `web/` filled at runtime. A generator picks numbers for the student's level, `platy.mathcheck` verifies them on the server, and the skin for the student's top interest tag is swapped in | None | No, rebuilt each time |
| **3. Pre-made variants** | Interest context in media that has to be recorded or rendered ahead (narrated videos, songs, stories) | One variant per interest tag, not per student, and only where context matters most (hooks, stories, `apply` items) | None; a fixed cost per tag | Yes, it's library content |
| **4. The tutor's words** | Personal details ("like your team's league table") | The tutor introduces each item and follows up using the profile. It's chat, within R-06 and the policy checks | A turn the session already pays for | Never (P-1) |
| **5. Per-student media** | A song or video made for one student | Live generation through the gateway | High, plus a wait | Never, so never reused |

Layer 5 stays V2+. It's the expensive layer, it can't be math-checked or reviewed before the student sees it, and because it's child content (P-1) it can't be kept, so it's paid for again every time.

**Pace is the primer's job, not the media's.** A slower student isn't shown a slower video. They get more practice instances, more worked examples and repair items, and smaller steps between checks. A faster student skips easy wins and reaches `apply` items sooner. Templates make this cheap because they produce a problem at any difficulty on demand, and every player lets students pause and replay.

### 7.2 Short reels become templates

The first draft rendered every reel to video with Manim. Instead, short reels (and the step-by-step parts of worked examples) can be animated components in `web/`, driven by the item JSON and drawn with KaTeX. Then the numbers, names and skin change per student at no cost, and the on-screen math is still exact because it's generated by rules and checked by mathcheck before it's shown. Reels already work with the sound off, so they need no per-student voice. Manim stays for longer narrated videos.

An existing library such as Remotion (React-based, with an in-browser player) could do the animation. Its license was free for companies of up to 3 people at last check ([license](https://v3.remotion.dev/docs/license)), so check the current terms before adding it. Plain React animation, with no new dependency, also works.

### 7.3 Slots: small tweaks on a shared core

Michael's framing (2026-10-18): one large, standard library, where each item can be tweaked slightly for each student. Two students who both like football play the same game, but each sees it in their own team's colors. That makes the template layer finer-grained:

- **Every template exposes named slots:** `colors` (a pair from Platy's palette), `team_name`, `player_names`, `emblem` (from Platy's own art set) and a few setting words. The core animation, the interaction and the math never read a slot, so filling slots can't break an item or need its math re-checked.
- **An interest skin fills the slots with defaults** (the football skin: a made-up team, a field, positions). **The student's own picks override them:** colors from a fixed palette and names from authored lists, chosen during onboarding. They're structured choices rather than free text, so they fit the profile's distilled state (P-8) and the library still never sees free text about a student.
- **No real logos, team names or player names in content.** They're licensed trademarks and publicity rights. Colors are generally fine, so a Buccaneers fan gets a made-up team in red and pewter. The tutor can still mention a student's real team in chat (layer 4), because that's conversation, not branded content. To confirm with a lawyer before real users.
- **What can take slots:** anything drawn live in `web/` (puzzles, games, whiteboard scenes, template reels, the text of stories). Recorded media (narrated videos, songs) varies only per interest tag, because changing a word means re-recording it.
- **Slot text is fixed child-facing text,** so the lists of names and setting words are authored, reviewed and covered by the pedagogy eval like any other item text.

### 7.4 What it costs

- **AI generation is cheap per variant.** ElevenLabs voice is about $0.10 per 1,000 characters (roughly 4 cents for a 30-second narration), and Eleven Music about $0.30 per minute ([pricing summary](https://developer.puter.com/tutorials/elevenlabs-api-pricing/), 2026). Confirm on the plan we buy.
- **Human review is the real cost,** so variants are made only where they pay off: the top 5 to 8 interest tags, for hooks and stories. A student whose interests are in the long tail gets the neutral version plus layer 4.
- **Measure before scaling.** Whether a variant beats the neutral version is measured with the same events as format affinity (§6.4). Tags that don't improve completion or next-attempt accuracy stop getting variants.

Rough numbers for the demo unit, inferred rather than measured: about 16 skills × 6 base items is roughly 100 base items at under an hour of review each, and about 30 hook and story items × 6 tags is roughly 180 variants at a few minutes each. That's on the order of 110 hours of review and, at most, low hundreds of dollars of AI generation for the whole unit. None of it grows with the number of students.

## 8. How V1 Algebra 1 content gets made

Content is made at **author time**, offline, by Michael and tools. No student data is ever in a generation prompt. The proposed layout separates authoring from what the app reads:

- **`content/prompts/`** holds the authoring prompts. They are never loaded at runtime, and they aren't runtime prompts.
- **`src/platy/content/items/`** holds published item JSON as packaged data, read with `importlib.resources` the same way as the skill graph. Because item text is fixed child-facing text, this path would be added to the `[pedagogy]` trigger so the pedagogy eval covers it, as `CLAUDE.md` requires for `src/platy/prompts/`. `scripts/triggers.toml` is a gate file, so Connor or Michael makes that change.
- **Media files** (video, audio, images) are served by the app itself from a folder next to it, not embedded from a third party.
- **`tools/content/`** holds authoring scripts (rendering, voiceover, music, any automated prompt runs). It would be its own uv project with its own lockfile, never part of the deployed app:
  - Manim's recent releases need NumPy 2, which can't share a lockfile with pyBKT's `numpy<2` pin.
  - The runtime stack is closed.
  - Its SDKs (`elevenlabs` and so on) are on the runtime's forbidden-egress list.
  - It may not import `platy` (an import-linter contract of its own), so it can't touch session, store or gateway code.
  - A-2 requires egress to be enforced structurally, so the decision that author-time tooling sits outside A-2's scope needs to be written down by Connor or Michael (§11).

Pipeline for one item:

1. **Brief.** From the skill map: the node's id, name, description, prerequisites (and `prerequisite_chain`), its probes (to avoid), and its misconception list. One brief per (skill, role, angle).
2. **Script.** Claude drafts the script, story, lyrics, puzzle spec or whiteboard scene from the brief, using the prompts in [`content/prompts/`](../content/prompts/README.md) (versioned, cited in `provenance.script_prompt`). There is one prompt per format, plus a brief prompt that plans 4–6 angles per skill, an interest-variant prompt and a critic prompt that reviews each draft in a fresh conversation. Grounded in open sources where useful (OpenStax and Illustrative Mathematics are CC BY). If prompt runs are automated later, they use strict tool output from a pydantic model, like runtime calls, rather than parsing JSON out of text.
3. **Math check (automatic, required).** Every prompt returns the item's math as a structured block (the contract is in `content/prompts/_shared-v1.md`). It's checked with **`platy.mathcheck`**, the one module allowed to import sympy, so no second checker gets built:
   - each line's solution set must be exactly {answer} (`solution_set_is`);
   - for spot-the-error items, lines before the intentional error must pass and lines from it on must not;
   - expression problems use `expressions_equal`.

   The math syntax matches mathcheck's whitelist: digits, single lowercase letters, `+ - * / ( ) .`, spaces and one `=`. There's no `**`. A failed check blocks the item. This applies Connor's pending R-29 to library content, and it answers "how do you know it teaches correctly".
4. **Media.**
   - *Video:* programmatic animation (Manim or a similar library) rendered from the checked script, with TTS voiceover and generated captions. This is chosen over AI video-generation models because those regularly garble written math, and on-screen math has to be exactly right. AI image generation is fine for backgrounds and characters in interest variants and template skins. Short reels are templates instead (§7.2). Manim also needs system LaTeX, Cairo/Pango and ffmpeg on the authoring machine.
   - *Songs:* lyrics written and math-checked in step 3, then an AI music service sets them to music. Check each service's commercial-use terms before relying on it.
   - *Proposed services (2026-10-18), author time only.* No student data ever reaches them. Live speech-to-text (R-19) is a separate path that goes through the gateway.
     - **Voice: ElevenLabs.** It plugs into Manim through the `manim-voiceover` plugin and has a free tier for prototyping. Alternatives are Azure or OpenAI TTS, which the same plugin also supports, or Kokoro (Apache 2.0, self-hostable) if we later want no vendor at all.
     - **Music: ElevenLabs' Eleven Music.** ElevenLabs says it was trained on licensed catalogues (Merlin, Kobalt), and it blocks prompts that name real artists. The alternative is Suno's v6 models, licensed after its Warner settlement and launched in September 2026; free users can't download songs. Confirm commercial-use terms on the plan we buy.
   - *Puzzles and games:* not generated media. A template in the UI plus a problem generator that produces valid problems for a skill and difficulty, each checked with `platy.mathcheck`.
   - *Stories:* text from step 2, with an optional generated illustration.
5. **Human review.** Michael reviews each base item. For pedagogy, a second reviewer with tutoring experience (Michael's mom, the vision doc's built-in advisor) spot-checks a sample. Interest variants get a lighter pass.
6. **Publish.** The descriptor goes to `src/platy/content/items/` and the media to the media folder. The validator (descriptor model, skills against the `SkillMap`, no probe reuse, `math_check` passed, media within budget) runs in `scripts/check`, since there's no separate CI. It copies the pattern of `validate_skill_map.py`.

Rough throughput target, inferred rather than measured: once the templates exist, a base item should take under an hour of human time and a variant a few minutes. The first slice will tell us the real number.

## 9. The first slice

**Scope: three skills inside the demo unit (solving linear equations).** The R-10 demo note sets 14–18 nodes with one top-level node; the slice targets three of them. They are nodes in Connor's skill map (`src/platy/skills/data/skill_map.json`): `one_step_equations`, `two_step_equations` and `multi_step_equations` (expand brackets or combine like terms, then solve).

**Items (about 27):**

| Format | Items | Notes |
|---|---|---|
| Worked-example clip | 3 (one per skill) | Proves the Manim + TTS pipeline |
| Reel | 2 templates × 3 skins | Balance-scale hook; the "subtract or divide first?" misconception. Proves the template approach (§7.2) |
| Puzzle | 3 templates × generated problems | Balance-scale, missing-step, spot-the-error; all produce evidence |
| Short story | 2 base × 3 variants = 6 | Closing problem is a real two-step equation |
| Song | 1 | "Undo it in reverse" mnemonic; proves the music path and its licensing |
| Whiteboard scene | 2 | Balance scale (drag blocks off both pans; each move is a check) and step boxes (write each line; mathcheck finds the first wrong line and the tutor points at it) |
| Tutor notes | on every item | So chat can anchor to each item |

Interest tags for the slice: `soccer`, `gaming`, `music`.

**Build order:**

1. **Decisions first** (Connor and Michael): is content in the demo or after it, and where items live (§11). The frontend is settled: `web/`.
2. **Descriptor model and validator,** in the gate, against the `SkillMap` (Michael).
3. **The content math check** using `platy.mathcheck` (Michael), plus a child-input normaliser if Connor wants one shared (§11).
4. **Author the items above** with the prompts.
5. **Players in `web/`** for video and reels, audio, story text and the three puzzle templates, against the mock server first; then the whiteboard.
6. **`select_item` and the `show_item` action** inside policy and `checks.py` (Connor), with session-only format affinity.
7. **Real students, only once main's preconditions hold:** the pedagogy eval (R-08) passing, including content; the R-22 safety evals; the canary test; ZDR-verified pinned models (P-14); and the age gate (R-36). Until then, items can be shown to a few teens in person, with nothing collected.

**What we learn:** which formats students finish, which ones precede a correct next attempt, what one item really costs to make, and whether interest variants move engagement enough to justify making them at scale.

## 10. Proposed R-ids (for Connor or Michael to approve)

The age gate (PR #1) is R-36. This doc's R-ids were renumbered at merge to R-37, R-38 and R-43 to R-47. R-28 to R-30 and P-14 are Connor's pending specs (usage log and prompt caching, sympy decides correctness, metacognition), and PR #1's age gate holds P-15, so any new P-id from this doc would start at P-16.

- **R-37 Content library.** Items with validated descriptors (§5), stored as packaged data and keyed to skill-map node ids; a descriptor naming a missing node, or reusing a probe's equation, fails validation.
- **R-43 Content math checks.** R-29 applied to the library: no item goes live unless its math block passes `platy.mathcheck` and a human reviewed it, and every interactive check is decided by mathcheck or exact UI state.
- **R-44 Content selection.** A pure `select_item` that policy calls; showing an item is a tutor move that passes `checks.py` (including reveal rules, R-02). With no match, the tutor falls back to chat. R-05 retries prefer a different angle and format.
- **R-38 Interest variants, skins and slots.** Template skins and pre-made variants per interest tag from a fixed vocabulary, made per tag and never per student, plus per-student slot choices (colors, names) from fixed lists (§7.3); no real logos, team or player names; the library never sees free-text profile data.
- **R-45 Content events and format affinity.** Structured engagement events and per-format counts; session-only in the demo, distilled state (P-8) once there's a store.
- **R-46 Self-hosted media.** All content media and players are served by Platy itself; no third-party embeds or SDKs at runtime. *(Could instead be P-16 in `PRIVACY.md`, since it is really P-11 applied to content.)*
- **R-47 Whiteboard.** A canvas with library scenes, snapping student tools, freehand scratch ink and a fixed set of tutor marks that pass policy checks (§4.1). Only structured actions count as evidence. "Check my work" goes through the gateway with a pinned ZDR vision role, safety first, with correctness decided by mathcheck. Student ink is child content and is never stored. *In V1 per A-8 (amended 2026-10-18).*

## 11. Open questions

**For Connor** (either cofounder can approve the answers)
1. **Whiteboard.** Do you accept structured checks only as V1's answer to the Open "whiteboard-to-BKT" item? Is the whiteboard part of the demo or after it?
2. **Content in the demo?** `REQUIREMENTS.md` sequences the content layer after the core loop is validated. Does any content go in the demo (stories, video, puzzles in `web/`), or does it all wait?
3. **Where items live.** Is `src/platy/content/items/` as packaged data, added to the `[pedagogy]` trigger, the right home? Does the R-06 length cap apply to fixed item text like a 300-word story?
4. **Misconceptions.** Add a `misconceptions` field to `SkillNode`, or keep a sibling file keyed by node id?
5. **Selection in policy.** OK for `select_item` to be a pure function policy calls, with `show_item` as a `TutorMove` action that `checks.py` gates?
6. **Authoring tools.** OK for `tools/content/` to be a separate uv project (Manim, voiceover, music SDKs) that can't import `platy`? If so, A-2 needs a line saying author-time tooling with no child data is outside its scope.
7. **Child math input.** mathcheck refuses `2x`, `X` and `−`. Should there be one shared normaliser before mathcheck, for typed answers, handwriting and item checks alike?
8. **Vision and voice.** Pinned, ZDR-verified roles for whiteboard "check my work" (vision) and voice (R-19), and any new gateway host they need (P-4).
9. **R-37, R-38 and R-43 to R-47:** accept, merge or cut.
