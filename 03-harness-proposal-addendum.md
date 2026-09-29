# Harness Proposal Addendum — The Primer

*Response to `02-harness-proposal.md`. Status: four additions APPROVED after discussion. Fold these into the plan, show the updated diff, then proceed to build — this doesn't need a second full multi-day review cycle.*

---

## Context

The original proposal (`02-harness-proposal.md`) is approved as a baseline. It was deliberately minimal — deterministic gate, two reviewer agents (`scope-skeptic`, `privacy-boundary-reviewer`), Codex as a read-only critic on boundary/math diffs only. That minimalism was correct for what the kickoff brief asked for, but a follow-up discussion surfaced four real gaps, each tied to something the original brief didn't cover. All four are approved. Everything else in `02-harness-proposal.md` — the mechanical gate, the cut list in §4, the "Codex is read-only" rule — stands unchanged.

---

## Addition 1: `obra/superpowers` (agentic coding methodology)

**What it is:** An open-source, composable skills library for coding agents — TDD workflow, systematic debugging, root-cause tracing, brainstorm → write-plan → execute-plan slash commands, verification-before-completion, subagent-driven development, git worktree hygiene. Skills activate automatically when relevant rather than needing explicit invocation. Installable from **Claude Code's official Anthropic plugin marketplace** — no third-party trust leap:

```
/plugin install superpowers@claude-plugins-official
```

**Why it's in:** This directly answers "I don't want Claude Code to just be a senior dev I hired — I want it to have internalized a whole modern methodology." It's not a replacement for `/ship`; it's the discipline underneath it.

**Integration guidance:** Don't let this duplicate the existing gate. The `/ship` loop already requires a failing test before implementation — superpowers' TDD skill should reinforce that habit inside the main session, not add a second competing loop. Where it adds real value: `write-plan`/`execute-plan` for anything bigger than a single `/ship` task (e.g. the BKT cold-start integration, or the onboarding flow build), and `systematic-debugging` when something breaks in a way that isn't a simple gate failure. Verify there's no conflict between superpowers' own verification hooks and the project's `scripts/check` Stop hook before enabling both — if there's overlap, the project's mechanical gate wins (it's the one with a git pre-commit backstop).

---

## Addition 2: `ui-ux-tester` + `accessibility-tester` (demo readiness)

**What they are:** Subagents from the VoltAgent `awesome-claude-code-subagents` catalog (category 04, quality-security). `ui-ux-tester` walks the actual running app end-to-end and documents friction points — what breaks, what's confusing, what looks unfinished — rather than a pass/fail test report. `accessibility-tester` checks a11y compliance.

```
claude plugin marketplace add VoltAgent/awesome-claude-code-subagents
claude plugin install voltagent-qa-sec
```

**Why they're in:** This is the literal "what breaks, what works, what looks funky, what is hard to understand" pass for demo prep — the gap Connor and his co-founder using the product by hand doesn't fully cover, especially under time pressure close to the YC deadline. `accessibility-tester` is worth having from the start on a kid-facing product rather than retrofitted later.

**Integration guidance:** These are expensive and non-deterministic — do **not** gate every `/ship` on them. Add a separate command, e.g. `/demo-check`, that runs both agents against the running app ahead of any demo or investor-facing checkpoint. Keep them out of the per-commit path entirely.

---

## Addition 3: `frontend-design` + `Leonxlnx/taste-skill` (design)

**What they are:** Two design *skills* (passive guidance, not agents).
- `frontend-design` — Anthropic's own public skill (available via `npx skills add anthropics/skills --skill frontend-design`). Names the actual tells of AI-generated design (the warm-cream-and-terracotta look, the SaaS-card kit, tracked-out ALL-CAPS eyebrows, arrow-suffixed buttons) and enforces a plan → critique-against-brief → build sequence before writing any UI code.
- `Leonxlnx/taste-skill` (`npx skills add https://github.com/Leonxlnx/taste-skill`) — same anti-slop goal, tunable via three dials (VARIANCE / MOTION / DENSITY) calibrated per project rather than one fixed house style.

**Why they're in:** Connor flagged this as a real V1 need, not a nice-to-have — a kid- and parent-facing product's design credibility matters for both the demo and eventual paying parents, and generic-AI-looking UI undercuts that immediately.

**Integration guidance:** Same trigger condition as the frontend hooks already deferred in Q1/§4 of the original proposal — install both skills now, but they only actually get exercised once a `web/` (or equivalent frontend) directory exists. No gate, no hook: they inform how UI gets written, not whether a diff passes.

---

## Addition 4: `architect-reviewer` (architecture fidelity)

**What it is:** A third reviewer agent, alongside `scope-skeptic` and `privacy-boundary-reviewer`. Source it from the same VoltAgent catalog (category 04) or write a project-specific version if the catalog one doesn't fit cleanly.

**Why it's in:** `scope-skeptic` catches unnecessary additions ("do we need this"). `privacy-boundary-reviewer` catches privacy-invariant violations. Neither catches a diff that quietly drifts from a locked architecture decision — e.g. reintroducing on-prem/school-based assumptions, implementing BKT in a way that doesn't actually match "contextual extensions via pyBKT," or bypassing the hard-reset-only-at-breakpoints rule. This was a real gap, not a nice-to-have.

**Integration guidance:** Give it the same footing as the other two in `/ship`:
- **Job:** check the diff against `REQUIREMENTS.md` and the architecture decisions already locked in project memory (BKT/pyBKT approach, allowlist gateway, hard-reset context management, skill graph as machine-queryable JSON/graph-DB). Flag drift, don't re-litigate the decisions themselves.
- **Tools:** `Read, Grep, Glob, Bash` (read-only). **Model:** Sonnet is probably sufficient; escalate to Opus only if it's missing real drift in practice.
- **Runs:** on every `/ship`, same as `scope-skeptic` — it's cheap and catches a different failure mode.

---

## What to do with this

1. Fold all four additions into the existing plan — update the agent roster (§3.2), the `/ship` loop (§3.4), and the files-created list (§3.5) in `02-harness-proposal.md` accordingly.
2. Show the updated diff to the plan (not a full re-proposal — the baseline is already approved, this is additive).
3. Once that's confirmed, proceed to build per the original build order in §6, adjusted to include installing `superpowers`, the VoltAgent QA and architect-reviewer agents, and the two design skills alongside the original steps.

Nothing else from `02-harness-proposal.md` is being reopened — the cut list in §4 still stands (no security-auditor yet, no CI, no frontend hooks until `web/` exists, no agent-team/worktree parallelism).
