# Platy web (kid tutor UI)

The browser side of Platy. Right now it runs a demo of the kid tutoring session against a
scripted mock tutor, so it needs no backend.

Stack: React 19 + Vite + TypeScript, KaTeX for math, Atkinson Hyperlegible (bundled, not
fetched from a font host). Plain CSS, no UI kit.

## Run it

You need Node 20 or newer.

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

The dashed **Demo** button (mock only) jumps to any screen on cue: skip a problem, the pause
screen, the safety-resources panel (R-22) and the dropped-connection screen (P-3).

Things to say in chat: "just tell me the answer" (Platy won't), "I'm stuck" (gets a hint).

## How it's put together

```
src/
  protocol.ts            the session event contract (proposal, see below)
  transport/
    mock.ts              in-browser stand-in for Platy's server, replays mock/script.ts
    websocket.ts         the real transport: POST /sessions, then a WebSocket
    index.ts             picks mock unless VITE_PLATY_SERVER_URL is set
  mock/                  scripted lesson + answer checking (goes away with the real backend)
  math/                  kid-math parser, LaTeX output, KaTeX rendering
  session/               reducer + hook holding all session state in memory
  components/            ProblemCard, MathInput, Chat, Overlays, Mascot
```

### Pointing it at a real server

```bash
VITE_PLATY_SERVER_URL=http://localhost:8000 npm run dev
```

Nothing else changes: the UI only sees `ServerEvent`s from `protocol.ts`.

## Session contract (proposal for Connor)

`POST /sessions {mode}` returns `{session_id}`, then a WebSocket at `/sessions/{id}/live`
carries JSON events.

Server to client: `tutor_message {message_id, delta, done}` (streamed), `problem {problem_id,
skill_id, prompt (LaTeX), instruction, position, total}`, `answer_result {problem_id, result}`,
`reset {reason}`, `pause_suggested`, `topic_switch {label}`, `safety_escalation {resources}`,
`error {code}`, `session_end {solved}`.

Client to server: `kid_message {text}`, `answer {problem_id, text}`, `hint_requested
{problem_id}`, `resume`, `end_session`.

`answer_result`, `instruction`/`position`/`total` on `problem`, and `resume` are additions to the
plan's first draft; they let the problem card give feedback and show progress. Answers are sent
as the kid typed them (`x^2 = 49`, `±7`); the server does the grading.

## Privacy rules this code follows

- Kid content lives in React state only and is gone on a reset, at session end or on refresh.
  No browser storage, cookies, URL params or console logging (P-1, P-10).
- No analytics, error tracking or remote fonts/scripts. The only network calls are to
  Platy's own server (P-2, P-11).
- Errors fail closed to a calm screen with a code, with no retry or fallback (P-3).

`src/privacy.test.ts` checks the mechanical parts of this on every `npm test`.

## Not done yet

Voice and photo input, kid onboarding mode, the parent side, and the landing page. Those
follow the build order in the frontend plan.
