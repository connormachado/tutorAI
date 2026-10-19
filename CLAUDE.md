# The Primer

Adaptive, privacy-first algebra tutor. V1 is for students 13 and up, with no parent onboarding or account features (A-9 note); the safety parent notice stays. Parents come in V2/V3 (`REQUIREMENTS.md` § Audience). Python 3.12 + uv. Source of truth: `REQUIREMENTS.md` (R-ids), `PRIVACY.md` (P-ids), `DECISIONS.md` (A-ids, Connor's and Michael's; never edit). Harness design: `02-harness-proposal.md`.

IMPORTANT: never persist raw conversation. Child messages, model replies, transcripts, audio and photos never reach a DB, file, temp file, cache or log (P-1, P-10). Only `platy.gateway` talks to third-party networks (P-2).

## Commands
- `scripts/check`: the gate (ruff, pyright strict, pytest `-m "not llm"`, import-linter). It must be green before a turn ends; the Stop hook enforces it.
- `uv run pytest -q path::test`: one test. `uv add <pkg>` / `uv add --dev <pkg>`: dependencies (never pip).
- `scripts/diagram`: regenerate `diagrams/AS-BUILT.md` (pre-commit does this; never hand-edit it).
- `npm --prefix web run dev`: the demo UI (`web/`, on the mock tutor until the server exists). `npm --prefix web run check`: its typecheck and tests (not part of `scripts/check`). The FastAPI server's command lands with it.
- `scripts/eval`: the pedagogy eval (once built). It's live, costs money, and runs only via `/ship` and pre-commit when `[pedagogy]` changes.

## Handoffs
Connor (backend) and Michael (frontend, `web/`) work in parallel. **Before starting, read the newest notes in `docs/handoffs/`** (`ls docs/handoffs/ | sort | tail -3`). **Before ending a session that changed the repo, run `/handoff`.**

## The loop
1. Every task is small: **one R-id, a named acceptance test, and `arch: none` or `arch: <what changes>`** stated up front.
2. Write the failing test first, then implement.
3. `/ship` to review, then **stop.** You may commit non-gate changes yourself first. Changes to gate files (`[gate]` in `scripts/triggers.toml`) are committed only by Connor or Michael, with `ALLOW_GATE_CHANGE=1`; never set it yourself, and never use `--no-verify`. You commit implementations of Connor's or Michael's decisions; you never invent new rules on your own initiative. Encoding a call they made (such as a Phase 1 decision) is fine; freelancing a rule is not.
4. Gate files (`[gate]` in `scripts/triggers.toml`) are off-limits. If the gate looks wrong, say what should change and why; don't weaken it.

## Demo contract (Platy demo; binding for all work)
Scope: one unit ("solving linear equations"), one path, 14–18 skill nodes. Diagnose the missing prerequisite 1–2 levels down before teaching (R-01), ask for self-explanation (R-03), teach metacognition with a confidence check and a reflection (R-30), and never hand over answers (R-02).

Pending spec: R-28 (usage log and prompt caching), R-29 (sympy decides correctness), R-30 (metacognition), P-14 (only pinned, ZDR-verified models and features, caching included) and the R-22 (988 + parent notice) demo note are drafts until Connor or Michael approves them (build step 1). No code that depends on them lands before that.

**Stack (closed list, A-11).** Runtime: `anthropic`, `pydantic` v2, `sympy`, `fastapi` (the demo server, HTTP + WebSocket), `pyBKT` (A-5). Dev: what pyproject already has. Everything else is stdlib (`tomllib`, `json`, `string.Template`, `unittest.mock`). The demo UI is the React + Vite app in `web/`, its npm dependencies pinned in `web/package.json` and `web/package-lock.json`. No DB, no auth, no web framework beyond FastAPI, no async outside the server's request and WebSocket handlers. Any new dependency needs Connor's or Michael's OK.

**Boundaries**
- `src/platy/gateway/llm.py` is the single client wrapper and the only importer of `anthropic` (A-2; import-linter enforces it). It is the gateway now, not a placeholder: one allowlisted host, fail-closed (P-3), no server-side `fallbacks`, no fallback model. Provider specifics stay behind it.
- Pure functions with no I/O: `skills`, `mathcheck`, `mastery`, `policy`, prompt rendering, cost estimates. I/O lives only in `config`, `gateway`, `fsio`, `session`, `server` and `evaluation`. Reading packaged data via `importlib.resources` (skill graph, BKT params, prompts, demo profile) is allowed anywhere; writes, network and env reads are not.
- Prompt text and fixed child-facing text live only in `src/platy/prompts/*.md` (`[pedagogy]`, so the eval gate runs). Never inline them in Python.
- Config: `src/platy/config.toml` + `config.py` (both `[privacy]`). The only env var is `ANTHROPIC_API_KEY`: read once, held as `SecretStr`, passed explicitly to the client, and never in a file, log or repr. Model ids can't be overridden from env.
- The FastAPI server (`[privacy]`) runs with `debug=False`, sends no telemetry, and answers errors with codes only, never exception text or payloads (P-10, P-11), asserted by a fast test when it lands. `web/` (`[privacy]`) never holds `ANTHROPIC_API_KEY` or any other secret (Vite ships every `VITE_` variable to the browser), and `web/src/privacy.test.ts` keeps it off browser storage, the console, analytics and remote assets (P-1, P-10, P-11).
- `pyBKT` and `sympy` are each imported in exactly one module (`mastery/bkt.py`, `mathcheck.py`), behind typed functions. Pyright suppressions name the rule.

**LLM calls**
- Roles: `tutor`, `updater`, `safety_classifier` and `judge` return structured output; `simulated_student` returns text. Each sets `model`, `max_tokens` and `effort`. There's no `temperature`, because current models reject non-default values.
- Model ids are pinned by `tests/test_model_pins.py`. Changing one needs a ZDR check by Connor or Michael plus privacy review. Never use a retention-excluded model.
- Structured output: one tool per call with `strict: true`, its schema generated from the pydantic model (`extra="forbid"`), and `tool_choice` auto plus an instruction to call it. Validate the input with that model. A missing or invalid call is an error. Never parse JSON out of text.
- Prompt caching (ZDR-eligible, per Connor 2026-10-17): `system` is sent as blocks, and the static role-prompt block carries `cache_control: {"type": "ephemeral"}` (5-minute TTL; it caches the tool definition plus that block). That is the only `cache_control` in any request: never on `messages`, tool results or later system blocks, and no `ttl` override. Tool definitions are static, built once per role from the pydantic model, with no per-turn enums or descriptions (`probe_id` is checked by `policy/checks.py`, not the schema). Anything that varies by child, session or turn (profile, turn plan, probe candidates) goes in a later system block with no marker, so the cached prefix stays byte-stable and holds nothing per-child. Prefixes under 512 tokens (Sonnet/Haiku 5.5) silently don't cache. Tests: a fast unit test builds requests for two seeded fake children with canaries in their messages and profiles, and asserts exactly one marker, on `system[0]`, with `tools` + `system[0]` byte-identical and canary-free. An `llm` test asserts that a repeated call shows `cache_read_input_tokens > 0`.
- Retries: only the SDK's built-in retry, set explicitly to `max_retries=3` (it retries 408, 409, 429, 5xx, timeouts and connection errors), with the request timeout from config. After that, or on a `refusal` or `max_tokens` stop, raise a content-free `GatewayError`, and the session shows an error state.
- Write one JSONL usage line per call: role, model, latency, tokens (input, output, cache write, cache read), cost estimate (cache writes and reads priced at their own rates), outcome, request id. Never content.
- Error text carries codes, never payloads: use `errors(include_input=False)` and `raise … from None`. Never set `ANTHROPIC_LOG`.

**Every turn**
- Safety runs first on every child message. A disclosure gets the fixed text from `prompts/safety_escalation.md` (self-harm includes 988), sends exactly one codes-only `ParentNotice` (held in memory and shown on the demo panel; A-9 note), and stops tutoring. A safety stop is not an A-4 reset. If the safety call itself errors, the session fails closed and never falls through to the tutor.
- Policy (pure) decides each turn's allowed and required actions and its probe candidates. The tutor returns a `TutorMove` (action, probe_id, message). Every move passes `policy/checks.py` before the child sees it: answer leak (via `mathcheck`, unless policy allows a reveal), length cap (R-06), a real probe id from policy's candidates (R-01), and the allowed or required action (R-02, R-30). On a violation, regenerate once with the violation codes. If it fails again, show the fixed recovery line from `prompts/`.

**Child content and files**
- Child state lives in memory only: the server's per-session state and React state in `web/`, never browser storage. The live conversation is cleared at problem boundaries and rebuilt from the skill map and profile (A-4). No cache (`functools.cache`, `lru_cache`, HTTP caching) on anything holding child content.
- Transcripts: only simulated-student eval runs write `var/transcripts/`. They're synthetic (simulated student, seeded fake profile, P-13) and are the one exception to the IMPORTANT rule above; a real child's session never reaches them. Session and server code never write files, and the canary test enforces it.
- All file writes go through `platy.fsio`: a temp file in the same dir, fsync, then `os.replace`. The single exception is the usage JSONL: one `O_APPEND` line, then fsync. Every persisted JSON has `schema_version`. Runtime output goes in `var/` (gitignored).
- Correctness is decided by sympy, never by a model. Child input is whitelisted before sympy sees it, because `sympify` calls `eval`.

**Tests**: every module gets unit tests, with LLM calls faked. Live tests use `@pytest.mark.llm` (the registered marker the gate excludes; never `live`) and are skipped unless `PLATY_RUN_LLM=1`. The canary test lands with the first session code. Done means `scripts/check` is green, and pyright strict is the type gate.

**Scope**: no features, UI polish or abstractions nobody asked for. List them at the end of your reply instead.

## Superpowers precedence (these rules override its skills)
- `test-driven-development`, `verification-before-completion`, `systematic-debugging`: use as-is. The project's `scripts/check` defines green.
- Use `brainstorming` → `writing-plans` → `executing-plans` only for work bigger than one `/ship` task. Every plan task cites an R-id, names its acceptance test and declares `arch:`. A task from an approved plan counts as approved; don't re-brainstorm it.
- `executing-plans` overrides:
  - Execute **inline, on `main`, with no worktree.** Connor and Michael consent to main here.
  - **End each task with `/ship` and stop** instead of continuing to the next task. You may commit the task's non-gate changes first (The loop, step 3).
  - Skip its final whole-branch review and `finishing-a-development-branch`, because `/ship` plus the phase-end Codex review replace them.
  - Its `.superpowers/` ledger is fine.
- Don't use `subagent-driven-development`, `dispatching-parallel-agents` or `using-git-worktrees`. If asked about a worktree, the answer is no.
- `requesting-code-review` is replaced by `/ship`.

## Codex (read-only critic)
- Run `/codex:adversarial-review` only when `/ship` says `[privacy]` or `[mastery_math]` paths changed, or at the end of a phase.
- Never run `/codex:rescue` on boundary or math code, and never apply Codex's rewrites.
- Every Codex finding either becomes a failing test and then a fix, or is dismissed in one line. Log each review in `.claude/codex-log.md`.

## Design skills (dormant until `web/` exists)
- `frontend-design` governs all child-facing UI.
- `design-taste-frontend` is only for the marketing landing page. On child UI, the dials are about VARIANCE 3, MOTION 2, DENSITY 3.
- When the two disagree: frontend-design wins on child UI, taste-skill on the landing page. Neither picks the frontend stack.

## Gotchas
- pyBKT 1.4.3 needs `numpy<2`, `pandas<3`, `scikit-learn<1.8`. It runs as pure Python, and its multiprocessing needs an `if __name__ == "__main__":` guard.
- Scratch files go in the session scratchpad, never the repo root.
- Opus 5.5 and Sonnet 5.5 return 400 on a forced `tool_choice` and on non-default `temperature`. Opus 5.5 always thinks, so `max_tokens` caps thinking plus the reply. It's a runaway ceiling, not the R-06 brevity control (that's the prompt plus the eval).
- Nothing under `src/platy/prompts/`, `src/platy/policy/` or `evals/pedagogy/` can be committed until `scripts/eval` + ≥1 case exist and pass, because the gate fails closed.
