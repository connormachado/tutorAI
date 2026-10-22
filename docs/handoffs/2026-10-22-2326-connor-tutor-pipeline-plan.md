# Planned the tutor turn pipeline (Step 3 spec) and approved R-30 and R-39 in the docs

- **Who:** connor   **Area:** docs
- **Branch / PR:** main / the commit with this note
- **R-ids:** R-30, R-39   **gate:** green (`scripts/check`; diagram fresh, unchanged)

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
- The plan for the whole pipeline was approved this session: Tasks 0–2 now, and Tasks 3–6 once the gateway and the eval exist. This commit is Task 0.

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

## Contract changes
- `TutorMove` → `TutorTurn` in CLAUDE.md. No code exists yet, and nothing changes for `web/`.

## Open questions for Michael
- None new. R-43–R-47 from the 0420 note are still open.

## Next steps
1. **Task 1 (R-02):** `mathcheck.states_answer(text, answer, problem)`.
   - Acceptance test: `tests/test_mathcheck.py::test_states_answer`.
   - Also two tests over all 48 shipped probes: restating any probe isn't a leak, and stating its answer is.
2. **Task 2 (R-02):** `session/tutor.py` (`TutorAction`, `TutorTurn`) and `session/state.py` (`SessionState`, per-problem attempts counted by the session, turn cap 40).
   - Acceptance test: `tests/test_session_state.py::test_attempts_count_student_messages_on_active_problem`.
   - It's `[privacy]`, so Codex runs.
3. **Later:** config, gateway and eval runner, then Tasks 3–6 (prompt builder + rules, checks, the turn loop with the canary test, R-17 resets).
