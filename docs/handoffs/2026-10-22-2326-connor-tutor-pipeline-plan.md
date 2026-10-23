# Tutor-pipeline foundation on main; prereqs branch started with the approved spec (R-22, R-28, R-29, P-14, R-41)

- **Who:** connor   **Area:** docs + backend
- **Branch / PR:**
  - main: `cf54f19` (Task 0), `0049400` (Task 1), `aca5bc0` (Task 2)
  - `claude/prereqs-config-gateway-eval`, off `aca5bc0`: D0, the commit with this update. Not merged.
- **R-ids:** R-02, R-22, R-28, R-29, R-30, R-41, P-14   **gate:** green (`scripts/check`, 342 passed)

## What changed
- **On main (the Step 3 foundation):**
  - **Spec:** R-30 metacognition and Stay on math added. CLAUDE.md now says `TutorTurn` (message, action, active_node_id, active_problem_id, rationale), no longer `TutorMove`.
  - **`mathcheck.states_answer(text, answer, problem)`:** the deterministic R-02 leak detector. Its reveal-phrase test is `tests/test_mathcheck.py::test_reveal_phrase_is_a_leak_even_when_the_problem_holds_the_answer`, and two tests run over all 48 shipped probes.
  - **`platy.session`:**
    - `TutorTurn`: shaped ids; message and rationale stay out of repr and errors; no prose in the tool schema.
    - A pure `SessionState`: per-problem attempts counted by the session, turn cap 40.
- **On the branch (D0, docs only):**
  - R-28, R-29 and P-14 are approved word for word: `REQUIREMENTS.md` (R-28, R-29) and `PRIVACY.md` (P-14).
  - The R-22 demo note is recorded from the approved Step 4 plan's Task 4.0 (D10, with D3 and D5 filled in), along with its CLAUDE.md "Every turn" safety bullet.
  - Stay on math is **R-41** now. It was R-39, but Michael's branch approved R-39 and R-40 first.
  - The canary test lands "with the first session entry point (the turn loop)", in both PRIVACY.md and CLAUDE.md.
  - CLAUDE.md's pending-spec line records the approvals.

## Decisions and why (Connor, 2026-10-22)
- **Leak check is context-aware.** The problem's own numbers may be restated or referred to. A reveal phrase is always a leak, and so is repeating an answer only the tutor has written (one the student already wrote is fine).
- **Correctness:** the model's `student_last_answer_correct` is dropped. Correctness is R-29's: sympy decides.
- **Rule ids are T1–T9,** each citing its R-id: T2 → R-02, T8 → R-41, T9 → R-30.
- **Prereqs plan:** D0 docs, T1 config (P-14), T2 usage log (R-28), T3 gateway, T4 eval runner, T5 bootstrap.
- **Bootstrap:** the first eval case (`answer_request`, R-02) lands in **one commit** with Step 3 Tasks 3, 4a and 5. The fail-closed gate allows no other order.
- **Safety in the bootstrap loop:** `screen` is a required argument. An eval-only pass-through lives in evaluation code only, never in `session/`. R-22 lands before any server.
- **Gateway:**
  - `base_url` and `api_key` are explicit. **`trust_env` stays at its default.**
  - It refuses to start if `ANTHROPIC_LOG` is set.
  - `StructuredCaller` lives in `gateway/types.py`.
- **Roles:** `tutor` at medium effort with 8,000 `max_tokens`; `simulated_student` at low with 2,000. Other roles arrive with their tasks.
- **Cache rates** are fetched from the pricing page during T1 and recorded in the config verification block, never taken from memory.

## Contract changes
- `TutorMove` → `TutorTurn` in CLAUDE.md. Nothing changes for `web/`.

## Open questions for Michael
- **R-ids:** keep your R-39 and R-40. Main's Stay on math is R-41. When your branch merges, the `REQUIREMENTS.md` R-36 parenthetical will conflict: take main's version and drop its "on his branch until it merges" clause.
- R-43–R-47 from the 0420 note are still open.
- **For Connor:**
  1. Apply the prepared `[privacy]` patch (adds `src/platy/evaluation*` and `src/platy/student_state*`) with `ALLOW_GATE_CHANGE=1`.
  2. Run the `[privacy]` Codex review of Task 2 and log it.
  3. Step 4's hook rule says "no always-clear placeholder screen in `src/`", and the eval-only pass-through will live in `src/platy/evaluation/`. Confirm that decision 4 supersedes the rule there.
  4. The S1–S4 safety texts live only in the local Step 4 plan file. They land in `prompts/safety_escalation.md` at Task 4.2.

## Next steps
1. **T1 config (P-14):** `config.toml` keys, `config.py` and `tests/test_model_pins.py`. Fetch the pricing page for the cache rates.
2. **T2 usage log (R-28), T3 gateway, T4 eval runner, then T5 bootstrap.** Each is one `/ship` on the branch.

## Gotchas
- The canary conditions hold until T5:
  - Nothing in `session/` takes a student message string, calls the gateway, logs or writes.
  - The fake gateway must plant canaries in `TutorTurn.message` and `rationale` too.
- Pre-commit refuses every commit while untracked `src/` files exist. Keep pedagogy files for the T5 bundle until its eval passes.
- A history with no thinking blocks is the documented accepted path. T3 confirms plain-text assistant turns with an `llm` test.
