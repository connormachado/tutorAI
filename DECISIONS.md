# The Primer — Locked Architecture Decisions

*Canonical source for `architect-reviewer`. Each item below is LOCKED for V1 unless marked otherwise. If a diff contradicts one of these, that's a finding — flag it, don't silently accept or silently "fix" it. If a diff touches something in the "Open / not locked" section at the bottom, that's not a violation; those are still being decided.*

---

**A-1. Cloud orchestration.** The orchestrator runs on Connor's own encrypted cloud servers — not on-prem, not school-hosted. On-prem/school infrastructure was considered and rejected (procurement timelines, IT/Chromebook barriers, misaligned with the parent-channel distribution plan). A diff that adds school-hosted deployment assumptions contradicts this.

**A-2. Allowlist gateway.** A single gateway module is the only component with network access to third-party services (LLM provider, speech provider). This is enforced structurally (e.g. import-linter or equivalent network policy), never by convention or code review alone. Fail-closed. Verified by a canary test: a unique string planted in a fake session must never surface in any DB, log, or temp file. A diff that gives any other module direct outbound network access to a third party contradicts this.

**A-3. Data retention.** Live transcripts cross the gateway unscrubbed (declared, intentional exception) but are never persisted anywhere. Profile and mastery state are encrypted at rest. BKT parameter-fitting data leaves the system only via an opt-in, anonymized event-upload path. A diff that persists raw transcript content, or that uploads identifiable data for parameter fitting without the opt-in path, contradicts this.

**A-4. Context resets.** Hard resets of the live conversation happen only at natural breakpoints — end of a problem, or a topic switch — never mid-exchange. On reset, state is reloaded from the persistent skill map and personality file, not from a rolling conversation-summary. A diff that compacts/summarizes conversation history instead of hard-resetting, or that resets mid-problem, contradicts this.

**A-5. Mastery model.** Bayesian Knowledge Tracing via `pyBKT`, using contextual extensions (Baker, Corbett & Aleven, 2008) that modulate guess/slip parameters using hint usage, response time, and self-explanation quality. Contextual modulation is implemented via pyBKT's `multigs` mechanism: hint usage, response time, and self-explanation quality are bucketed into a small number of discrete classes, not modeled as continuous covariates. Skills are modeled independently per-skill for V1 — no full Dynamic Bayesian Network. Cross-skill sequencing (spaced repetition, "implicit review" — solving a downstream problem that requires a prerequisite counts as review of that prerequisite) is a separate scheduling layer on top, not part of the mastery model itself. A diff that models skills as fully independent with no scheduling layer, or that builds a full DBN into V1, contradicts this.

**A-6. Skill map.** A single machine-queryable graph (JSON or graph DB) is the source of truth. Any human-readable rendered view is generated from it — never hand-maintained as a separate artifact. Common Core algebra progressions are the starting skeleton. A diff that maintains a second, hand-edited list of skills alongside the graph contradicts this.

**A-7. Emotional/frustration detection.** Scoped out of V1 entirely. Only behavioral proxies — wrong attempts, response latency, explicit verbal self-report — drive de-escalation. No acoustic or tone-based emotion inference. A diff that adds voice-tone or acoustic-affect detection contradicts this.

**A-8. Whiteboard.** Deferred to V1.5. V1 is chat/voice only, algebra only, no shared visual canvas. A diff that adds a drawing/whiteboard surface contradicts this.

**A-9. Onboarding.** Two tracks: (1) kid-facing warm chat with embedded low-stakes diagnostic problems, generating real BKT signal — not self-report; (2) parent-facing questionnaire (interests, motivational hooks, sensitive topics — the personality file) plus an optional one-time grade/transcript share, used only as a rough bootstrap prior and then discarded. No school-record integration (parent-shared data about their own child is not FERPA-covered).

**A-10. Efficacy metric.** Learning-gain (pretest/posttest on related-but-not-identical material) is the external validity metric — not raw BKT prediction accuracy, which is an internal engineering diagnostic only.

---

## Open / not locked — do not flag as violations

- **BKT cold-start calibration method.** Currently: start from published parameter estimates (same skills as public datasets like ASSISTments), refine with real data over time. This is an active research area and Connor wants to review the source literature before it's fully locked. Diffs implementing *some* cold-start approach are fine; don't treat a specific method choice here as a fixed target.
- **Whiteboard-to-BKT-signal translation** (V1.5, not being built yet).
- **Exact diagnostic problem count/difficulty spread** for the first onboarding session.
- **Parent questionnaire exact wording/fields.**
- **Pretest/posttest item design, control basis, sample size.**
- **Implicit-review confidence/detection logic** — the rule exists (A-5), the detection threshold doesn't yet.
- **Safety escalation / mandatory-reporting disclosure detection** — flagged repeatedly as unresolved, needs a dedicated design pass. Not yet part of any locked architecture.
