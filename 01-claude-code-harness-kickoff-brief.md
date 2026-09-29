# Harness Kickoff Brief — The Primer

*Hand this to Claude Code as the first task on this project. Task: research and PROPOSE, do not build yet.*

---

## 1. Product context (read first)

Full vision: `the-primer-initial-vision.md` (project file). Read it in full before proposing anything.

**Locked architectural decisions — do not re-litigate these:**
- **Hybrid privacy model ("Option B"):** cloud handles reasoning/compute; sensitive per-kid PII (personality file, mastery scores) stored in a separate store behind an allowlist gateway. Raw conversation transcripts are never persisted — only distilled state (skill confidence, personality file, short session summaries), encrypted at rest.
- **Mastery model:** Bayesian Knowledge Tracing (BKT) via `pyBKT`, using contextual extensions (Baker, Corbett & Aleven, 2008) that let hint usage, response time, and self-explanation modulate guess/slip. Cold-start parameter estimation is an **open research item** (see item below) — do not assume it's solved.
- **Skill map:** machine-queryable graph (JSON or graph DB), Common Core algebra as the starting skeleton. Human-readable view is *generated from* the graph, never maintained separately.
- **Emotional detection via voice tone:** explicitly out of scope. Use behavioral proxies instead (explicit self-report, silence, wrong attempts, response latency).
- **V1 scope:** algebra only, chat-based (text/voice + photo input for handwritten work), no whiteboard (that's V1.5 — see separate doc).
- **Context management:** hard resets of the live conversation at natural breakpoints only (end of a problem, topic switch) — never mid-exchange — reloaded from the persistent skill map and personality file. Never mid-turn.

## 2. The meta-task

Before writing a single line of product code, research and propose a multi-agent development harness for this repo. Specifically:

1. Research current best practices (as of now) for:
   - Claude Code **hooks** (automated post-edit checks: lint, type-check, test-run, gated completion)
   - **Sub-agent** design patterns — narrow-scoped agents with specific jobs vs. one general-purpose agent
   - **Multi-agent verification** patterns (e.g., a "senior dev" agent, a dedicated security/privacy-boundary reviewer, a "do we actually need this code" reviewer)
   - **Cross-model verification** — using OpenAI Codex as an independent reviewer of Claude's output (and vice versa) to catch correlated blind spots
2. Propose a concrete harness: roster of sub-agents (with each one's specific job and why it's separate from the others), hook configuration, and where/how Codex plugs in as a second opinion.
3. **Do not implement anything yet.** Present the proposal for approval first.

## 3. Constraints on the harness itself

- **Bias toward deletion and simplicity is a stated value, not a suggestion.** This is a pre-MVP project. Every proposed agent or hook should justify itself against actual risk, not hypothetical scale.
- **No speculative infrastructure.** Don't propose configurability, extensibility, or abstraction for problems that don't exist yet (e.g., multi-subject support before algebra works).
- **Include a "do we need this" reviewer role explicitly** — an agent whose only job is challenging whether a piece of code should exist at all, checking that it traces back to a named product requirement.
- **Small, independently verifiable tasks only.** The harness should make trust mechanical (broken code can't pass the gate), not dependent on the founder re-reading every diff.
- **State your assumptions and open questions back to the founder before proposing the final structure**, especially anywhere the brief above is ambiguous.

## 4. Open research items to flag, not solve, in your proposal

- BKT cold-start: parameter estimation traditionally wants hundreds–thousands of students per skill; the plan is to start from published estimates on standard Common Core skills (e.g., ASSISTments-style datasets) rather than fitting from scratch, refining with real data over time. This is not yet finalized — flag it as a dependency for the mastery-model implementation, don't block the harness proposal on it.
