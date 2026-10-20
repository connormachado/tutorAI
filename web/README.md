# Platy web (child tutor UI)

The browser side of Platy. Right now it runs a demo of the child tutoring session against a
scripted mock tutor, so it needs no backend.

Stack: React 19 + Vite + TypeScript, KaTeX for math, Atkinson Hyperlegible (bundled, not
fetched from a font host). Plain CSS, no UI kit.

## Run it

You need Node 20 or newer to run the app, and Node 22.12 or newer for `npm test` (vitest 5).

```bash
cd web
npm install
npm run dev
```

Then open http://localhost:5173 and press **Start practice**.

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Unit tests (math parser, answer checking, mock tutor, session state, privacy guardrails) |
| `npm run typecheck` | TypeScript, strict |
| `npm run check` | Both of the above |
| `npm run build` | Production build into `web/dist/` |

## The demo path

1. **Problem 1, `3x + 5 = 20`.** Try `15` first: Platy names the slip ("$3x = 15$ is right, one
   more step"). Any other wrong answer gets "what did you do first?" instead of the answer
   (R-02, R-03). Type a reply in the chat and Platy nudges. `x = 5` solves it.
2. **The reset.** After a correct answer the chat clears with a "fresh page" moment (R-17).
3. **Problem 2, `2(x - 3) = 10`.** `6.5` shows the "the 2 multiplies the −3 too" catch. `8` solves it.
4. **Problem 3, `x² = 49`.** Use the **x²** key. `7` alone is "part of the way there"; `±7`,
   `7, -7` or `x = 7 or x = -7` solves it.
5. **Three misses on one problem** brings up the pause screen, then an easier warm-up, then
   back to the problem (R-21).
6. **The math keypad (R-18)** sits under every math box. On a phone (try it at 390×844 with touch)
   it docks at the bottom like a keyboard while the box has focus, and the phone's own keyboard
   stays down. **abc** brings that keyboard back for letters and words, and **↵** checks the
   answer. On a laptop the keypad stays under the box; its keys are out of the Tab order because
   a keyboard types everything directly.

7. **Puzzles (R-37).** On problem 1, answer `25/3` (adding the 5 instead of subtracting it).
   Platy sends you to a spot-the-error puzzle about the same slip, then back to problem 1.
   Tap the wrong line, rewrite it, then finish it; Platy asks before it corrects (R-03), gives
   no hint before a first try (R-02), and asks a reflection question at the end (R-30).

The dashed **Demo** button (mock only) jumps to any screen on cue: skip a problem, each of the
three puzzles (spot the error, missing step, balance scale), the pause screen, the
safety-resources panel (R-22) and the dropped-connection screen (P-3). **Switch interest**
re-skins the puzzle on screen (soccer, football, gaming, plain) without changing its numbers,
and **Colors** on a puzzle picks your own team colors (R-38).

Things to say in chat: "just tell me the answer" (Platy won't), "I'm stuck" (gets a hint).

## How it's put together

```
src/
  protocol.ts            the session event contract (proposal, see below)
  transport/
    mock.ts              in-browser stand-in for Platy's server, replays mock/script.ts
    websocket.ts         the real transport: POST /sessions, then a WebSocket
    index.ts             picks mock unless VITE_PLATY_SERVER_URL is set
  mock/                  scripted lesson, answer checking, and puzzle items, skins, problem
                         generators and grading (all go away with the real backend)
  content/               puzzle types, balance-scale moves, team-color palette
  math/                  child-math parser, LaTeX output, KaTeX rendering, keypad keys
  session/               reducer + hook holding all session state in memory
  components/            ProblemCard, PuzzlePlayer (+ puzzles/), MathInput, Chat, Overlays, Mascot
```

### Pointing it at a real server

```bash
VITE_PLATY_SERVER_URL=http://localhost:8000 npm run dev
```

Nothing else changes: the UI only sees `ServerEvent`s from `protocol.ts`.

## Session contract (proposal for the backend)

`POST /sessions {mode}` returns `{session_id}`, then a WebSocket at `/sessions/{id}/live`
carries JSON events.

Server to client: `tutor_message {message_id, delta, done}` (streamed), `problem {problem_id,
skill_id, prompt (LaTeX), instruction, position, total}`, `answer_result {problem_id, result}`,
`reset {reason}`, `pause_suggested`, `topic_switch {label}`, `safety_escalation {resources}`,
`error {code}`, `session_end {solved}`.

Client to server: `child_message {text}`, `answer {problem_id, text}`, `hint_requested
{problem_id}`, `resume`, `end_session`.

Puzzles (R-37, R-38) add `puzzle {puzzle}`, `puzzle_result {instance_id, check, outcome}` and
`puzzle_done {instance_id}` from the server, and `puzzle_move {instance_id, move}`,
`puzzle_hint {instance_id}`, `puzzle_next {instance_id}` and `slot_pick {colors}` from the
client. `docs/content-library.md` §6.5 explains them, including why the chat waits between one
problem or puzzle and the next.

`answer_result`, `instruction`/`position`/`total` on `problem`, and `resume` are additions to the
plan's first draft; they let the problem card give feedback and show progress. Answers are sent
as the child typed them (`x^2 = 49`, `±7`, and `×` and `÷` from the keypad); the server does the
grading.

## Privacy rules this code follows

- Child content lives in React state only and is gone on a reset, at session end or on refresh.
  No browser storage, cookies, URL params or console logging (P-1, P-10).
- No analytics, error tracking or remote fonts/scripts. The only network calls are to
  Platy's own server (P-2, P-11).
- Errors fail closed to a calm screen with a code, with no retry or fallback (P-3).

`src/privacy.test.ts` checks the mechanical parts of this on every `npm test`.

## Not done yet

Players for the other content formats (videos, songs, stories, the whiteboard), voice and
photo input, onboarding mode (which also fills the personality file in V1), the
13+ age gate (R-36) and a landing page. There's no parent side in V1 beyond the safety parent notice on the
demo panel (R-22): V1 is for students 13 and up, and parent features come in V2/V3 (`REQUIREMENTS.md` § Audience).
