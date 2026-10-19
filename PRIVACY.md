# The Primer: Privacy Invariants

*DRAFT, pending approval by Connor or Michael. Every P-id traces to `DECISIONS.md` A-2 or A-3, or to an approved Q-default (Q5); a P-id marked *pending* traces to an R-id until Connor or Michael records its A-id. `privacy-boundary-reviewer` cites a P-id for every finding. Where a check is mechanical, the reviewer doesn't re-check it; it looks for what tests can't see: new data flows, new sinks, and dependencies that phone home.*

**Child content** means anything the child or the tutor said or showed during a session: typed messages, model replies, transcribed speech, audio, and photos of work.

| P-id | Invariant | Traces to | Enforced by |
|---|---|---|---|
| **P-1** | Child content is **never persisted**: not to a DB, file, temp file, cache or queue. It lives in memory for the live session only. | A-3, Q5 | Canary test (§ below) + reviewer |
| **P-2** | **Only `platy.gateway` has third-party network access** (LLM, speech, vision, telemetry). | A-2 | `.importlinter` contract `a2-egress` (gate) |
| **P-3** | The gateway **fails closed.** On a provider error, timeout or malformed response the session gets an error state. There's no fallback provider, no retry through another module, and no degraded path that sends data elsewhere. | A-2 | Reviewer. *(Fault-injection tests are deferred: `deferred-credibility-checks.md`.)* |
| **P-4** | Gateway destinations are a **fixed allowlist in code.** Adding a host is a privacy-path change. | A-2 | `[privacy]` trigger → reviewer + Codex |
| **P-5** | **Declared exception:** child content crosses the gateway to the LLM/speech provider unscrubbed. This is intentional and is **not** a finding. | A-3 | — |
| **P-6** | The **PII store is reached only through `platy.store`,** with a fixed field allowlist and no free-form fields. | Q5 | `.importlinter` contract `pii-store` (gate) + reviewer |
| **P-7** | The **profile (personality file) and mastery state are encrypted at rest.** | A-3 | Reviewer |
| **P-8** | **Only distilled state is persisted:** skill mastery, the personality file, and structured session records (skill ids, outcome codes, counts, timestamps). These records **quote no child content.** | A-3 | Canary test + reviewer |
| **P-9** | **BKT-fitting data leaves only through the opt-in, anonymized upload path.** Events carry a random pseudonymous id, skill id, correctness and context buckets, with no names, text or profile fields. With no opt-in, nothing is sent. | A-3 | Reviewer + Codex |
| **P-10** | **No child content in logs, error trackers, analytics or exception messages.** Log events and exception text carry ids and codes, never message payloads. | A-3 | Canary test (captures log records) + reviewer |
| **P-11** | **No new outbound destination for child data.** A new dependency that phones home (telemetry, crash reporting, "anonymous usage stats") is a finding. | A-2 | `a2-egress` (the listed clients) + reviewer (unlisted ones) |
| **P-12** | A **parent-shared grade/transcript** is used once as a bootstrap prior and then discarded, never stored. *Dormant in V1: there's no parent upload until R-16 returns in V2/V3.* | A-3, A-9 | Reviewer |
| **P-13** | **Tooling never touches real child data.** `/demo-check`, evals and tests use seeded fake-child profiles only. | A-3 | Reviewer |
| **P-15** | The **age gate keeps only a yes/no "13 or older"**, never the age or birth date entered, and the entered value never reaches logs, analytics, error trackers or exception text. An under-13 attempt keeps nothing the user entered; the one exception is a device-local flag (no id, no age) that blocks an immediate retry with a different age, as FTC COPPA guidance recommends. A student found to be under 13 mid-session has their stored state deleted (R-36). | A-9 (note, 2026-10-18), R-36 | Reviewer |

## Canary test (A-2's own verification)

Arrives with the first session code (`tests/`, fast and deterministic, so it's part of `scripts/check`). It works like this:

1. Run a scripted session through the real session entry point, with the gateway replaced by an in-process fake.
2. Every child message contains a unique canary string.
3. Afterwards, search every DB file, log file, temp directory, and **every captured log record and exception** for the canary.
4. Any hit fails the test. That covers P-1, P-8 and P-10.

## Open (Connor or Michael to decide; not findings until decided)

- Encryption-at-rest mechanism and key custody for P-7 (e.g. SQLCipher vs. app-level field encryption).
- Whether parent summaries (R-24, V2/V3) may contain any free text written by the model (P-8 currently says structured only).
