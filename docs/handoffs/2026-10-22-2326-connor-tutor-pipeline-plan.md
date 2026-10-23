# Planned the tutor turn pipeline (Step 3 spec), approved R-30 and R-39, and built the foundation (leak detector, TutorTurn, SessionState)

- **Who:** connor   **Area:** docs + backend
- **Branch / PR:** main / `cf54f19` (Task 0), `0049400` (Task 1) and the commit with this update (Task 2)
- **R-ids:** R-30, R-39, R-02   **gate:** green (`scripts/check`, 342 passed; AS-BUILT gains `session`)

## What changed
- `REQUIREMENTS.md` gains two requirements:
  - **R-30 Metacognition:** one `check_confidence` beat per session, checked at `close_session`; if it's missing, one final beat runs, turn cap permitting.
  - **R-39 Stay on math:** off-topic for at most one turn, then a warm redirect.
- Both join R-08's list of rules the eval checks.
- The R-36 note now reads "R-28, R-29 and P-14 reserved; R-31–R-35 and R-40–R-42 unused".
- `CLAUDE.md`:
  - R-30 is off the pending-spec line.
  - The demo-contract scope line matches the new R-30.
  - The tutor's structured output is now **`TutorTurn`** (message, action, active_node_id, active_problem_id, rationale), no longer `TutorMove`.
  - The caching note names `active_problem_id`.
- The plan for the whole pipeline was approved this session: Tasks 0–2 now, and Tasks 3–6 once the gateway and the eval exist. Tasks 0–2, the whole foundation, are done.
- **Task 1: `platy.mathcheck.states_answer(text, answer, problem)`.** It's pure and deterministic, and `policy/checks.py` will call it.
  - It reads numbers as digits, decimals (".5" too), fractions, mixed numbers and number words.
  - Signs: "subtract 9" states -9.
  - Reveal phrases count, and so do restatements of the problem's own numbers.
  - Expression answers count only in final form.
  - Tests: `tests/test_mathcheck.py::test_states_answer`, `::test_reveal_phrase_is_a_leak_even_when_the_problem_holds_the_answer`, and two tests over all 48 shipped probes.

- **Task 2: the `platy.session` package.**
  - `tutor.py`: `TutorAction` (the spec's 10 actions) and `TutorTurn`. Ids have fixed shapes, `message` and `rationale` stay out of repr and errors, and no docstring reaches the tool schema.
  - `state.py`: a pure, frozen `SessionState` and its transitions, `start_session`, `record_student_message`, `record_tutor_turn` and `record_fallback`.
  - Attempts are counted per presented problem by the session, never taken from the model. The turn cap is 40.
  - A message after the session ends changes nothing and never raises; recording a tutor turn then raises `SessionOver`.
  - Acceptance test: `tests/test_session_state.py::test_attempts_count_student_messages_on_active_problem`.

## Decisions and why
- **Approving R-30 doesn't approve R-28, R-29, P-14 or the R-22 note** (Connor). They're still pending.
- **The model's `student_last_answer_correct` is dropped** from `TutorTurn`. Correctness is sympy's call (R-29, pending), never the model's.
- **Rule ids in the coming `prompts/rules.md` are T1–T9**, each citing its R-id (T2 → R-02, T9 → R-30 …), so "R1" isn't read as R-01.
- **The leak check is context-aware** (Task 1, `mathcheck.states_answer`):
  - An answer number that appears in the problem is exempt when the tutor restates or refers to it ("x - 4", "subtracting 4").
  - An explicit reveal phrase is always a leak, with a test on `inverse_operations.1`.
  - Repeating an answer the student already wrote isn't a leak.
- **The foundation is Tasks 0–2 only:** spec edits, leak detection, then `TutorTurn` + `SessionState`.
  - The demo profile is Step 2's (now on main).
  - `policy/checks.py`, `prompts/` and the turn loop wait for the gateway plus a passing eval case. They're `[pedagogy]`, and while untracked in `src/` they'd block every commit.
- **`build_system_prompt` will return two blocks** (static rules + skill map; per-child profile + session state), per the CLAUDE.md caching rule. The fallback line goes in `prompts/recovery.md`, not config.
- **Review fixes kept in Task 1:**
  - A fraction not in lowest terms (24/4) still exposes 24 and 4.
  - "5 - 2" counts as referring to the coefficients in 5x - 2x.
  - A span copied from the problem is never a leak, even for a one-term answer.
  - Child text and canonical answers share one guarded sympy parse (`_parse(as_written=True)`).
- **Known gaps (fail-safe false positives or rare misses):**
  - "What's 5 - 2?" on `variables_both_sides.1` is flagged, because 5x - 2x isn't written in that problem.
  - "2n + 6" for "twice the sum of n and 3" isn't flagged.
  - "one" and "a quarter" read as 1 and 1/4.
  - There are no numbers of 100 or more.

- **Canary test deferred to `session/turn.py`.** The privacy reviewer accepted this with conditions:
  - Until it lands, nothing in `session/` or the server takes a student message string, calls the gateway, logs or writes.
  - The fake gateway must also plant canaries in `TutorTurn.message` and `rationale`.
- **Notes for the gateway task, from the privacy review:**
  - Map `TutorTurn` validation errors to codes, as `_codes` in `student_state.py` does. `hide_input_in_errors` doesn't cover `err.errors()` or an `extra_forbidden` loc.
  - Raise `GatewayError` outside the `except` block, so no ValidationError stays on `__context__`.
  - Strip `minLength`, `maxLength` and, if strict mode rejects it, `pattern` from the tool schema.

## Contract changes
- `TutorMove` → `TutorTurn` in CLAUDE.md. No code exists yet, and nothing changes for `web/`.

## Open questions for Michael
- None new. R-43–R-47 from the 0420 note are still open.
- **For Connor:** PRIVACY.md (draft) says the canary test arrives "with the first session code". Reword it to "with the first session entry point (the turn loop)"? The privacy reviewer suggested this; it's your call.
- **For Connor:** the `[privacy]` Codex review of Task 2 still needs a run and a line in `.claude/codex-log.md`.

## Next steps
1. **Connor:** run the Codex `[privacy]` review of Task 2 and log it.
2. **Then the prerequisites:** approve R-28, R-29, P-14 and the R-22 note; build config, the gateway and the eval runner with a first case.
3. **Later:** config, gateway and eval runner, then Tasks 3–6 (prompt builder + rules, checks, the turn loop with the canary test, R-17 resets).
