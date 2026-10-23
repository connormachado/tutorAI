# Step 4: safety (R-22), the approved plan

- **Who:** connor   **Area:** docs (safety plan of record)
- **Branch / PR:** `claude/step-4-safety-plan-handoff`, off main `aca5bc0`; docs only
- **R-ids:** R-22   **gate:** green (`scripts/check`)

This is the plan Connor approved on 2026-10-22, recorded so both sides build from it. S1–S4 and D1–D12 are copied verbatim. One rule is amended: the placeholder-screen rule, under "Hook rules for Step 3 Task 5".

## Status (2026-10-22)
- **Task 4.0:**
  - The R-22 demo note and CLAUDE.md's safety bullet are recorded on `claude/prereqs-config-gateway-eval` (`1e2eaa0`). Neither is on main yet.
  - The pending-spec line there also records R-28, R-29 and P-14 as approved, so it differs from the wording quoted in Task 4.0 below.
- **Task 4.1:** its blocker, Step 3 Task 2 (`SessionState`), is on main (`aca5bc0`).
- **Tasks 4.2–4.4** wait for the gateway and the eval runner (the prereqs branch), the Step 3 Task 5 turn loop, and the server.
- **D1:** a human still verifies every number in S1–S4 before Task 4.2 builds.

## Context
R-22 needs a V1 safety-disclosure path:
- detection
- a hard-coded escalation: crisis resources plus a push toward a trusted adult
- a codes-only parent notice, held in memory and shown on the demo panel (A-9 note)

The tutor never handles a disclosure itself. `DECISIONS.md` keeps the real-user detection design **Open**, and the demo design below is Connor's call for the demo only.

Step 3's Task 5 turn loop takes a safety-screen hook, and this step supplies it. The order of work:
- **Task 4.0 lands now.** It's docs only.
- **Task 4.1** waits for Step 3 Task 2 to merge, because it extends `SessionState`.
- **The rest** waits for the gateway and the eval runner. `prompts/` and `evals/` are `[pedagogy]`, and the classifier call needs the gateway.

## Decisions (Connor, 2026-10-22)
| # | Decision |
|---|---|
| D1 | S1–S4 are signed off as drafted below. **A human verifies every number before Task 4.2 builds.** |
| D2 | Option C: a phrase tripwire plus the classifier, flagging if either fires. The classifier sees up to 4 earlier child messages since the last reset. |
| D3 | Categories: `self_harm`, `danger_to_self`, `abuse`, `danger_from_others`, `danger_to_others`, `other_concern`. `danger_to_self` shares S1 (988). |
| D4 | The schema is `category` only: `flagged` is derived, and `confidence` is dropped. |
| D5 | `deliver_to_parent` is true for `self_harm`, `danger_to_self` and `danger_to_others`. **Never for `abuse`.** False for `danger_from_others` (a legal call later), `other_concern` and `screen_unavailable`. |
| D6 | A classifier error, refusal or invalid output gives the code `screen_unavailable` and shows S4. |
| D7 | S1 includes the transparency line. |
| D8 | Every flag locks the session. |
| D9 | The persisted flag record (`flags/*.jsonl`) stays parked: it conflicts with the A-9 note and A-12, and needs legal input. |
| D10 | The R-22 demo note is approved, with D3 and D5 filled in (text in Task 4.0). |
| D11 | The eval may tune effort (starting at `high`) and `max_tokens`. Moving the role to Sonnet 5.5 is the fallback lever. |
| D12 | Screened inputs: chat and free-text answers now, and onboarding (R-15) once it exists. |

## Signed-off child-facing texts (D1; Task 4.2 copies them verbatim into `prompts/safety_escalation.md`)
Each text is a title, a body and a list of resources ({name, contact, note}).

**S1 `crisis`** (for `self_harm` and `danger_to_self`)
- **Title:** You don't have to handle this alone
- **Body:** Thank you for telling me. What you wrote sounds serious, and you deserve help from a real person right now. I'm a math tutor, so I can't help with this the way a person can. We're going to stop practicing for today. Platy is letting the adult running this session know that you might need support. They won't see what you wrote.
- **Resources:**
  - **988 Suicide & Crisis Lifeline**: Call or text 988, or chat at 988lifeline.org. Free and confidential, any time, day or night.
  - **A trusted adult**: A parent or guardian, a teacher, a school counselor, a coach or another adult you trust. Tell them today. You can show them this screen.
  - **Emergency**: Call 911 if you might hurt yourself soon or you're in danger right now.

**S2 `abuse`** (for `abuse`)
- **Title:** You deserve to be safe
- **Body:** Thank you for telling me. What you wrote sounds serious, and you deserve help from a real person right now. I'm a math tutor, so I can't help with this the way a person can. We're going to stop practicing for today.
- **Resources:**
  - **Childhelp National Child Abuse Hotline**: Call or text 1-800-422-4453. Free and confidential, any time, day or night.
  - **A trusted adult**: A teacher, a school counselor, a coach, a relative or another adult you trust. Tell them today. You can show them this screen.
  - **Emergency**: Call 911 if you're in danger right now.

**S3 `stop`** (for `danger_from_others`, `danger_to_others` and `other_concern`)
- **Title:** Let's get you some help
- **Body:** Thank you for telling me. What you wrote sounds serious, and a real person can help with it better than I can. I'm a math tutor, so we're going to stop practicing for today.
- **Resources:**
  - **A trusted adult**: A parent or guardian, a teacher, a school counselor, a coach or another adult you trust. Tell them today. You can show them this screen.
  - **Crisis Text Line**: Text HOME to 741741. Free and confidential, any time, if you want to talk to someone now.
  - **Emergency**: Call 911 if you or someone else is in danger right now.

**S4 `screen_error`** (fail closed)
- **Title:** Platy needs to stop here
- **Body:** Something went wrong on our end, so we're stopping this session to be safe. You didn't do anything wrong.
- **Resources:**
  - **A trusted adult**: If anything is bothering you or you don't feel safe, tell a parent or guardian, a teacher, a school counselor or another adult you trust.
  - **988 Suicide & Crisis Lifeline**: Call or text 988. Free and confidential, any time, day or night.
  - **Emergency**: Call 911 if you're in danger right now.

This note is the record of the approved wording until Task 4.2 copies it verbatim into `prompts/safety_escalation.md`. After that, `prompts/` is its only home (CLAUDE.md), and this copy is history.

---

## Task 4.0: spec edits (now)
**R-id:** R-22 · **acceptance test:** n/a (docs) · **arch:** none

**`REQUIREMENTS.md`:** add this sub-bullet under R-22, in the same shape as R-10's demo note:
> - *Demo note (Platy, approved by Connor 2026-10-22):*
>   - **Screening.** Every child message and free-text answer is screened before the tutor runs, by a fixed phrase tripwire and the pinned `safety_classifier` role. The role makes one strict tool call and also sees up to 4 earlier child messages since the last reset. Categories: self_harm, danger_to_self, abuse, danger_from_others, danger_to_others, other_concern.
>   - **A flag locks the session.** The tutor isn't called again, and the student sees only fixed text from `prompts/safety_escalation.md`. Self-harm and danger-to-self include 988. Abuse gives Childhelp and a trusted adult outside the situation, never a parent.
>   - **The notice.** Each flag raises exactly one codes-only `ParentNotice` (category, session id, message index, time; no child text), held in memory and shown on the demo panel. It marks parent delivery for self_harm, danger_to_self and danger_to_others only. Nothing is delivered in V1.
>   - **Fail closed.** A screen error, refusal or invalid result stops tutoring. The student sees the fixed error text with crisis resources, and the panel shows `screen_unavailable`.
>   - **Nothing about a flag is written to disk.**
>   - **Evals.** The R-08 safety cases pass 3/3 before any real student.
>   - The detection design for real users stays Open in `DECISIONS.md`.

**`CLAUDE.md`:**
- **Pending-spec line:** remove the R-22 note, so it reads:
  > Pending spec: R-28 (usage log and prompt caching), R-29 (sympy decides correctness) and P-14 (only pinned, ZDR-verified models and features, caching included) are drafts until Connor or Michael approves them (build step 1). No code that depends on them lands before that.
- **"Every turn", the safety bullet:** replace it with:
  > - **Safety runs first** on every child message and free-text answer: a fixed phrase tripwire plus the `safety_classifier` (R-22 demo note).
  >   - **A flag** gets its category's fixed text from `prompts/safety_escalation.md`. Self-harm and danger-to-self include 988, and abuse never points to a parent.
  >   - **Each flag** raises exactly one codes-only `ParentNotice`, held in memory and shown on the demo panel (A-9 note). Parent delivery is marked only for self_harm, danger_to_self and danger_to_others.
  >   - **The session locks.** The tutor is never called again. A safety stop is not an A-4 reset.
  >   - **If the safety call errors,** refuses or returns invalid output, the session fails closed with `screen_unavailable` and the fixed error text. It never falls through to the tutor.

`DECISIONS.md` is not touched (it's a gate file, and only Connor or Michael edits it).

**Then:** `/ship` (docs only: scope-skeptic and architect-reviewer), commit, `/handoff` with the S1–S4 wording and the contract change for Michael, and **stop**.

---

## Later tasks (each is one `/ship`)

| Task | What | Acceptance test | arch | Blocked on |
|---|---|---|---|---|
| **4.1** | `src/platy/session/safety.py`, the pure core (details below), plus a `SessionState` extension. `[privacy]`, so Codex runs. | `tests/test_safety.py::test_every_flag_category_maps_to_text_and_notice_policy` | adds `session/safety.py`; no new cross-component edges | Step 3 Task 2 merged |
| **4.2** | `prompts/safety_escalation.md` (S1–S4 verbatim), `prompts/safety_classifier.md`, the tripwire list (a packaged file under `prompts/`), the loader, and the eval cases listed below | the failing `self_harm_midsession` eval case first | edge `session → prompts` (package data) | eval runner + gateway; the D1 number check |
| **4.3** | The live screen through the `StructuredCaller` Protocol (role `safety_classifier`, effort `high`, `max_tokens` with room for thinking). Wired into `take_turn`. The canary test extended to the safety path. An `llm` test showing a real disclosure flags and a math message doesn't. | `tests/test_turn.py::test_tutor_never_called_after_flag` | session → gateway via the Protocol | Step 3 Task 5 |
| **4.4** | Server events. The student gets a terminal `safety_stop {title, body, resources}` with no category label. The demo panel gets `parent_notice {codes}`. **Contract change for Michael:** no "Back to practice", input disabled. | server test: a flag sends both events and no `tutor_message` | server → session | the server |

**Task 4.1, the pure core in `session/safety.py`:**
- `SafetyCategory`, an enum.
- `SafetyAssessment`, the strict tool schema: `category` only.
- `ParentNotice`, codes only:
  - `session_id`, `category` (or `screen_unavailable`)
  - `source`: classifier, tripwire or screen_error
  - `child_message_index`, `raised_at`, `text_key`, `deliver_to_parent`
- `SafetyVerdict`: `Clear` or `Stop`.
- `verdict_from(assessment)` and `screen_failed()`.
- The `SafetyScreen` Protocol: `(message, earlier) -> SafetyVerdict`.
- The category → (text_key, deliver_to_parent) table from D3 and D5.
- On `SessionState`, the extension that makes 4.1 wait for Task 2:
  - `stop_reason` (including `"safety"`)
  - `record_safety_stop(state)`: locks the state, after which every recording transition refuses

**Task 4.2, the eval cases:**
- `self_harm_midsession`, 3/3: S1 shown, exactly one `ParentNotice(self_harm)`, no tutor turns after
- `abuse_disclosure`: S2, with `deliver_to_parent=false`
- `danger_to_others`
- `split_disclosure`
- `hyperbole_negative`, which records the false-positive rate
- `graphic_refusal`, a fail-closed check that S4 is shown

**Fast tests across 4.1 and 4.3, all with mocked calls:**
- per category: the text key, whether 988 is present, and `deliver_to_parent`
- a clean message: the tutor is called once and no notice is raised
- a gateway error, an invalid tool input or a refusal: `screen_unavailable` and S4
- the tripwire firing when the classifier says `none` or errors
- the tutor's call count stays 0 after a flag and on every later call
- exactly one notice per session
- the canary never appears in the notice, its repr, logs or exceptions

**Hook rules for Step 3 Task 5:**
- The screen turns its own errors into `Stop(screen_unavailable)`, and the loop also treats **any** exception from the hook as fail closed.
- The hook is a required parameter with no default. Tests inject fakes.
- **No always-clear screen exists in session, gateway or server-imported code.** The eval-only pass-through lives in `platy.evaluation` and is named eval-only. `platy.session` and the server may never import it. *(Amended by Connor, 2026-10-22. It read: "No always-clear placeholder screen exists in `src/`.")*
- When the session locks, the in-memory conversation is dropped.

## Verification
- Task 4.0: `scripts/check` green (the docs don't change the gate), `/ship`, commit, `/handoff`.
- Later tasks:
  - Write the failing test first, then get `scripts/check` green, then `/ship`. The `[privacy]` tasks (4.1, 4.3, 4.4) run Codex.
  - The safety eval cases pass 3/3.
  - A manual run in `web/` against the server: no way back from the overlay, the panel shows the notice, nothing in `var/`.

## Still open (not blocking)
- **Legal input before real students.** Each item needs a lawyer before real students use this:
  - mandatory reporting
  - telling a parent about a 13–17-year-old's self-harm disclosure, and the transparency line
  - what replaces a parent notice for abuse
  - duty to warn for `danger_to_others`
  - keeping a flag record (D9)
  - what we promise about detection
  - non-US resources
  - human review of flags
  - the ZDR contract
- **No transparency line for danger_to_others.** It notifies a parent (D5) but shows S3, which has no transparency line, because S3 is shared with categories that don't notify. If you want that student told, it needs its own text (an S5).

## Not building
- Parent delivery channels, contact fields, persisted flag logs, human review queues.
- Under-13 detection (R-36) through the classifier.
- Non-US resources.
- Screening voice and photo input before R-19/R-20 exist.
- A softer path for low-severity flags.
