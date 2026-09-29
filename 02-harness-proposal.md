# Harness Proposal — The Primer

*Response to `01-claude-code-harness-kickoff-brief.md`. **v2** folds in the four approved additions from `03-harness-proposal-addendum.md`. **v3** folds in the 2026-09-29 round: D1–D5 approved, Q10/Q11 answered, `DECISIONS.md` adopted, living diagram + import-graph check, pedagogy eval hard gate, and `deferred-credibility-checks.md` noted. **Final (2026-09-29): Q12 → grimp, §5.2 resolved (multigs).** Status: **APPROVED 2026-09-29, nothing built yet. Build from §6 in a fresh session.***

---

## 0. TL;DR

**Guiding rule:** deterministic checks decide pass or fail. LLM reviewers only advise. Every part of the harness has a condition for removing it. *(v3: two LLM steps now sit on the commit path, both at your explicit request. Each is bounded by a mechanical pass/fail; see §4.)*

| Layer | What | Count |
|---|---|---|
| Mechanical gate | One `scripts/check` script, enforced by a Claude Code **Stop hook** *and* a **git pre-commit hook** | 1 script, 3 Claude hooks, 1 git hook |
| Conditional gates *(v3)* | **Pedagogy eval:** if prompt/policy paths change, `scripts/eval` must pass or the commit is blocked. **Living diagram:** after the gate passes, `diagrams/AS-BUILT.md` is regenerated, its edges are checked against a **grimp** import graph (the same engine import-linter uses), and it's committed with the change. | inside the same pre-commit hook |
| Methodology *(v2)* | `superpowers` plugin: TDD, systematic debugging, brainstorm → plan → execute, verification before completion. It sits *underneath* `/ship` and never replaces the gate. | 1 plugin |
| Per-ship reviewers | `scope-skeptic` ("do we need this"), `architect-reviewer` *(v2, drift from locked decisions)*, `privacy-boundary-reviewer` | **3** |
| Demo-readiness *(v2)* | `ui-ux-tester` + `accessibility-tester`, run only by `/demo-check`, **never per commit** | 2 (dormant until a frontend exists) |
| Design guidance *(v2)* | `frontend-design` + `taste-skill` (`design-taste-frontend` only). Skills only, no gate. | 2 skills (dormant until a frontend exists) |
| Built-ins reused | `/code-review` (correctness), plan mode (planning), existing `change-summarizer` (commit messages) | 0 new |
| Cross-model | Codex via OpenAI's official `codex-plugin-cc`: **read-only `adversarial-review`, only on privacy-boundary and mastery-math diffs + phase milestones.** Not on every diff and no auto-gate. | 0 agents |
| Entry points | `/ship` (gate → reviewers for the touched paths → commit message) and `/demo-check` *(v2)* | 2 skills |

The brief suggested a custom "senior dev" agent. I'd drop it because the built-in `/code-review` already does that job and gets maintained for us. I'd also keep Codex off most diffs, because a July 2026 study found that letting Codex fix Claude-written code **made it worse** (details in §2).

---

## Build handoff (read this first in the fresh session)

- **Status:** the whole plan is approved (2026-09-29). **Build it; don't re-propose.** The order is in §6. Nothing has been built, `git init` hasn't happened, and nothing has been installed.
- **Inputs, all in the repo root:**
  - this file
  - `DECISIONS.md`: yours, the source of truth for architect-reviewer. Don't edit it.
  - `deferred-credibility-checks.md`: **don't build anything from it**
  - `01-…brief.md`, `03-…addendum.md`, `the-primer-initial-vision.md`: background
- **Settled choices (don't reopen):**
  - D1–D5; Q10 project scope; Q11 Playwright (headless, isolated, pinned); **Q12 grimp** (no pydeps); Q1–Q5, Q7 and Q9 on their bold defaults in §1.
  - §5.2 = `multigs` buckets.
  - Diagram LLM runs only when the grimp component graph or privacy paths change, so the file stays byte-identical otherwise.
  - A component-edge mismatch **blocks the commit after one automatic retry**.
  - Pedagogy gate **fails closed**: the first tutoring prompt needs an eval case.
- **Explicitly not in this round:**
  - `scripts/eval` / eval content (next phase; the gate is wired dormant)
  - `TARGET-ARCHITECTURE.md` comparison
  - everything in `deferred-credibility-checks.md`
  - CI
  - frontend hooks
- **Step 0 before step 1:** confirm `DECISIONS.md` A-5 contains the `multigs` line (§5.2). If it doesn't, ask the founder. Don't write it yourself.
- **Scratch files** go in the session scratchpad, never the repo root. (In the research session, a failed `cd` once dropped downloads into the repo.)

---

## 0.2 What changed in v3

| Change | Where |
|---|---|
| D1–D5 **approved**. Q10 = project scope. Q11 = **Playwright** (headless, isolated profile), not Claude in Chrome. | §0.1, §1, §3.2b |
| **`DECISIONS.md` (A-1…A-10 + "Open / not locked") is the source of truth** for architect-reviewer, replacing my draft A-1…A-7. The "Open" items are never findings. A-2 widens the gateway: it's now the *only* module with third-party network access, not just the PII-store door. That changes the import-linter contract. | §3.1, §3.2 |
| **Living diagram hook:** after `scripts/check` passes at commit time, regenerate `diagrams/AS-BUILT.md` (Mermaid component + data-flow) and commit it alongside the code. The same hook builds the real import graph (*final: **grimp**, per Q12*), and a script diffs real imports against the diagram's edges. An **undeclared architecture change** is a finding for architect-reviewer. `TARGET-ARCHITECTURE.md` comparison is designed for but **not built**. | §3.1b, §3.2, §3.4 |
| **Pedagogy eval is now a hard commit gate** when prompt/policy paths change. It's wired now, dormant until the content exists, and **fails closed**. | §3.1a |
| One trigger-path file, `scripts/triggers.toml`, is shared by /ship and pre-commit (privacy, mastery math, pedagogy). | §3.1 |
| `deferred-credibility-checks.md` is acknowledged. **None of its four items get built this round.** | §4 |
| Your message mentioned an earlier "/diagram-command spec." I never saw it, so nothing from it carries over. This version stands on its own. | — |

---

## 0.1 What changed in v2, and where I deviated from the addendum *(approved 2026-09-29)*

All four additions are in. I checked each source file before writing this, and in five places the addendum's literal install command or wording would work against the approved baseline. For each one, this is what I'd do instead:

| # | Addendum says | What the source actually contains | What I'd do instead |
|---|---|---|---|
| D1 | `claude plugin install voltagent-qa-sec` | That plugin installs **17 agents**, not 2. The extras include `security-auditor` (cut in §4), `code-reviewer` (duplicates `/code-review`), `debugger` (duplicates superpowers), and `penetration-tester`. All of them become things Claude can hand work to automatically. | **Copy only `ui-ux-tester.md` and `accessibility-tester.md` into `.claude/agents/`**, pinned, with an MIT attribution header. Don't install the plugin. |
| D2 | Use the catalog tester agents as-is | Both reference a "context manager" agent we don't have. `ui-ux-tester` has **Write and Edit** tools, and its browser tool names (`chrome-mcp`, `computer-use`) don't match Claude Code's. `accessibility-tester` is Haiku-only and reads code without looking at the running app. | Trim them: remove the dead steps and make them read-only (reports, not fixes). Map the browser tools to whatever you have (Q11). Pair a11y with a deterministic `axe-core` run and target WCAG 2.2 AA. |
| D3 | Get `architect-reviewer` from the catalog "or write a project-specific version if it doesn't fit cleanly" | The catalog version is a generic checklist: microservices, CQRS, service mesh, horizontal scaling, "evolution path." It also has Write and Edit. It would **push toward the speculative infrastructure the brief bans.** | **Write a project-specific version** (the addendum allows this). It checks against numbered locked decisions, not a scalability checklist. |
| D4 | Check against "decisions already locked in project memory" | There's no project memory yet, and memory isn't versioned or visible in diffs. | Put them in a checked-in **`DECISIONS.md`**. *(v3: done. You wrote it, with A-1…A-10.)* |
| D5 | `npx skills add https://github.com/Leonxlnx/taste-skill` | Without a flag that installs **~13 skills**. They include `gpt-taste` (Python-driven random layouts), `output-skill` (overrides truncation behavior) and several fixed house styles that contradict each other. The main skill also **scopes itself** to "landing pages, portfolios… not multi-step product UI," and it defaults to Next.js + Tailwind + heavy motion (VARIANCE 8 / MOTION 6). | Install **only `--skill design-taste-frontend`**. Use it for the **parent-facing landing page**. `frontend-design` governs the kid-facing app. If taste-skill is ever used on kid UI, the dials are low (≈3/2/3), and it doesn't get to choose the frontend stack (Q1 does). |

Also worth knowing:
- **Superpowers v6.4.2 has no slash commands.** brainstorm, write-plan and execute-plan are now skills, invoked as `/superpowers:brainstorming`, `/superpowers:writing-plans` and `/superpowers:executing-plans`.
- **Its only hook is `SessionStart`,** which injects about 3 KB of instructions. So there's **no conflict with the `scripts/check` Stop hook** (the addendum's precondition is met).
- The real conflicts are in its *skills*. I've resolved them with precedence rules in §3.2c.

---

## 1. Assumptions & open questions (answer these first)

These change what gets built. I'll use the **bold default** unless you say otherwise. *(Final: Q6, Q10, Q11 and Q12 are settled. Q1–Q5, Q7 and Q9 are **confirmed on their defaults**.)*

| # | Question | Why it matters | Default I'll assume |
|---|---|---|---|
| Q1 | **Stack.** Python backend (pyBKT forces Python for mastery at least)? What's the frontend? | Hooks run language-specific tools | **Python + `uv` + `ruff` + `pyright` + `pytest`. No frontend hooks until a frontend directory exists.** |
| Q2 | **Python version.** Your machine has 3.14. pyBKT 1.4.3 (Aug 2026) only declares support for 3.5–3.8 and ships an optional C++ extension. | Could break on install | **Pin 3.12 via `uv`, then check pyBKT imports and fits before anything depends on it.** |
| Q3 | **Git.** This folder isn't a git repo yet, and there's no `gh` CLI or remote. | Reviewers, Codex and the pre-commit gate all work on git diffs | **`git init` locally. Add CI later, and have it run the same `scripts/check`.** |
| Q4 | **Codex access.** The `codex` CLI isn't on your PATH (ChatGPT.app and `~/.codex` exist). Which ChatGPT plan are you on? | The plugin needs the CLI, and usage limits set how often we can call Codex | **Install the CLI + plugin. Budget roughly 1–3 Codex reviews per day.** |
| Q5 | **Privacy scope.** Are **photos of handwritten work** and **voice audio** "raw conversation"? *(v3: A-2/A-3 now settle the gateway: it's the only module with third-party network access, fail-closed, and transcripts cross it unscrubbed but are never persisted. Photos and audio are still unaddressed.)* | Sets exactly what the privacy reviewer and the tests enforce | **Photos and audio are handled like transcripts: they may cross the gateway and are never persisted. The PII store is also reachable only through a single module with a fixed field schema.** |
| Q6 | **Voice in V1.** ~~The vision doc wants voice for emotional signal, but the brief rules out tone detection.~~ | — | **Settled by A-7:** behavioral proxies only, no acoustic inference. Speech-to-text only; audio is discarded after transcription. |
| Q7 | **Safety disclosures** (abuse, self-harm). Is hard-coded escalation needed before your brother or your mom's clients use it? *(v3: `DECISIONS.md` lists this under "Open," so architect-reviewer won't flag it either way. It's still a real-kid safety question for `REQUIREMENTS.md`.)* | It's real kids, even in V1 | **Yes: a minimal hard-coded escalation path plus scripted eval cases before the first real kid. It becomes an R-id, not an A-id.** |
| Q8 | **Requirements list.** The "do we need this" reviewer needs named items to check against. *(v3: `DECISIONS.md` is done.)* | Without IDs, that reviewer is just asking for opinions | **I draft `REQUIREMENTS.md` (R-01…R-nn) and `PRIVACY.md` (P-ids, each tracing to A-2/A-3), and you approve both before any product code.** |
| Q9 | **Reviewer model cost.** | Opus is roughly 5× Sonnet per token | **Sonnet for scope-skeptic, architect-reviewer and the two testers. Opus for the privacy reviewer.** |
| Q10 *(v2)* | **Install scope.** | — | **Settled: project scope.** Plugins go in `.claude/settings.json` `enabledPlugins`, and agents and skills are checked in. |
| Q11 *(v2)* | **Browser tool for `/demo-check`.** | — | **Settled: Playwright MCP**, pinned version, headless, `--isolated` (in-memory profile, never your browser session). See §3.2b. |
| Q12 *(v3)* | **pydeps vs. grimp.** `import-linter` (already in the gate) is built on **grimp**, which computes the same import graph in-process with no extra dependency. pydeps adds a second tool doing the same job. | One dependency fewer, and the diagram check would use the same graph the A-2 contract uses | **Settled: grimp.** It reuses what import-linter already needs, so there's no pydeps dependency. |

---

## 2. Research findings that shaped the design

1. **Hooks are the enforcement layer, CLAUDE.md is only advice.** The official best-practices page says to use hooks "for actions that must happen every time with zero exceptions."
   - A **Stop hook** that exits 2 stops Claude from ending its turn and shows it the failure.
   - **Caveat:** Claude Code overrides a Stop hook after **8 consecutive blocks**, so on its own it isn't a hard gate. That's why the same check also runs as a **git pre-commit hook**.
   - A PostToolUse hook that exits 2 sends its stderr back to Claude right after an edit.
   - Hooks now support `if:` permission-rule filters, and a hook can be scoped to a single sub-agent.
2. **Sub-agents are useful for two things: keeping context clean and getting an independent eye.** They aren't useful for splitting up job titles. A sub-agent sees only its own prompt plus the diff, not the reasoning that produced the change, so it judges the result on its own terms. That's the entire case for reviewer agents.
   - The docs warn that a reviewer told to find gaps **will always find some**, and chasing every one of them "leads to over-engineering." So reviewers must only flag gaps that affect **correctness or a stated requirement**. That fits your bias toward deletion.
3. **Cross-model review is directional, not automatically good.** Source: arXiv 2607.21656 (Jul 2026), 116 LiveCodeBench tasks, Opus 4.7 vs GPT-5.5, static review:
   - **Codex reviewing Codex-written code** raised the pass rate from 71.6% to 89.7%.
   - **Codex reviewing Claude-written code** *lowered* it from 91.4% to 82.8%: 3 fixes against **13 regressions**. Codex tended to *throw out and rewrite* working code.
   - **Claude reviewing its own code** changed nothing on net (noise floor).
   - What I take from it: Codex should be a **read-only critic whose claims get tested**, never an editor. Aim it where independent training matters most, which is checking the code against *written invariants* (privacy rules, BKT math), not general bug hunting.
   - Caveat: the benchmark is competitive programming, not spec-conformance review. So Codex gets a kill criterion (§3.3).
4. **OpenAI ships an official Claude Code plugin** (`openai/codex-plugin-cc`):
   - Commands: `/codex:review`, `/codex:adversarial-review` (both **read-only**, and the adversarial one accepts focus text), `/codex:rescue` (hands a task to Codex).
   - It also offers an optional Stop-hook **review gate**. The README warns that it "can create a long-running Claude/Codex loop and may drain usage limits quickly." **I propose leaving it off.**
5. **pyBKT doesn't implement Baker/Corbett/Aleven 2008 contextual guess/slip.** It has `multigs`, which gives each value of a *categorical column* its own guess/slip, and it can **fix parameters without fitting**, which suits the published-estimates cold-start plan. I've flagged this in §5 and am not re-opening the locked decision.

---

## 3. Proposed harness

### 3.1 Mechanical gate (this is what makes trust mechanical)

**`scripts/check`** is the single source of truth. The Stop hook, git pre-commit and future CI all call it. It runs:

1. `ruff format --check` + `ruff check`. This includes `PGH003`/`PGH004`, so blanket `# type: ignore` or `# noqa` can't be used to silence the gate.
2. `pyright` on `src/` in strict mode.
3. `pytest -q -x -m "not llm"`: fast and deterministic, with no network and no model calls.
4. **Privacy contracts.** These are product tests, listed here because the gate depends on them:
   - **import-linter** *(v3: per A-2)*: only `primer.gateway` may import third-party network, LLM or speech clients (`anthropic`, `httpx`, `requests`, the speech SDK, `socket`/`urllib` wrappers) via a `forbidden` contract with external packages included. This is structural enforcement, "never by convention." A second contract says only one module may import the PII-store client (Q5).
   - **Canary test** *(A-2's own verification)*: run a scripted session whose kid messages contain a unique canary string. Afterwards, search every DB file, log, temp dir and captured log record. **The canary must not appear anywhere.** One cheap test covers "raw transcripts are never persisted" (A-3), including leaks through logs or exception traces.

*(v3)* **`scripts/triggers.toml`** is the one place trigger paths live. `/ship` and pre-commit both read it, and it's a protected gate file:

```toml
[privacy]       # → privacy-boundary-reviewer + Codex (/ship)
paths = ["src/primer/gateway/**", "src/primer/store/**", "src/primer/session/**", "src/primer/logging*", "src/primer/config*", "pyproject.toml"]
[mastery_math]  # → Codex (/ship)
paths = ["src/primer/mastery/**"]
[pedagogy]      # → scripts/eval HARD GATE (pre-commit)
paths = ["src/primer/prompts/**", "src/primer/policy/**", "evals/pedagogy/**"]
```

The exact paths get fixed when the package skeleton exists (build step 1). Globs that match nothing yet are fine; they switch on once matching files exist.

### 3.1a Pedagogy eval: hard commit gate *(v3)*

Same trigger pattern as the privacy reviewer and Codex, but **enforced in the git pre-commit hook, not printed as a reminder:**

- If any staged file matches `[pedagogy].paths`, run `scripts/eval`. **A non-zero exit blocks the commit.**
- **It fails closed while the eval doesn't exist yet.** If a pedagogy path is staged and `scripts/eval` is missing or has zero cases, the commit is blocked: *"tutoring prompt/policy changed but no pedagogy eval exists."* The consequence: **the first tutoring prompt can't be committed until at least one eval case exists.** That's test-first applied to prompts, and I think it's what you want. Say so if not.
- **Cached by content:** `/ship` runs the eval first so the reviewers see its result. The result is keyed on a hash of the trigger-matched files plus `evals/`. If pre-commit sees the same hash already passed, it doesn't pay for a second LLM run.
- **Not in the Stop hook.** Eval runs cost money, so they happen once per commit, not once per turn.
- **The harness only wires this. The eval suite defines "pass."** LLM output varies between runs, so the suite (next phase) has to set its own flakiness policy, e.g. each scripted student case run 3× and hard rules must pass 3/3. The gate trusts `scripts/eval`'s exit code and nothing else.

### 3.1b Living architecture diagram + import-graph cross-check *(v3; engine = grimp)*

**Where it runs:** in the **git pre-commit hook, right after `scripts/check` (and the eval, if triggered) pass**. Pre-commit is the only point that can put the file *into the same commit* as the code, since a post-commit hook would need a second commit or an amend. It runs on **every commit**, not just at phase milestones. It also runs in `/ship` before the reviewers, so they can see the diagram diff.

**Pre-commit runs against exactly what's being committed:** if `src/` or `tests/` have unstaged changes, the hook refuses with "stage or stash first." Otherwise both the gate and the diagram could describe code that isn't actually in the commit.

**`scripts/diagram`, step by step:**

1. **Real import graph, no LLM:**
   - `grimp.build_graph("primer")`, in-process, **the same graph import-linter's A-2 contract is checked against**, so the diagram and the network-egress rule can never disagree about what imports what. It covers every module, with no hop limit. *(Superseded: pydeps plus its `--max-bacon 0` workaround.)*
   - Collapse module → component (top-level subpackage, e.g. `primer.gateway`) and keep only cross-component edges, direction = *importer → imported*.
2. **Freshness check, no LLM:** `AS-BUILT.md` carries a header stamp holding a hash of that component graph and a hash of the staged files under `[privacy].paths`.
   - If both hashes match, the architecture didn't change, so **the file is left byte-identical.**
   - If either changed, go to step 3.
3. **LLM update:** run `claude -p` with Sonnet, read-only tools and no session persistence. Give it the *previous* `AS-BUILT.md`, the component graph and the staged diff.
   - Instruction: **edit minimally, keep existing node IDs (component names), don't restyle.**
   - It writes two Mermaid diagrams: **component** and **data flow** (kid input → session → gateway → LLM/speech provider; state → encrypted store; the opt-in anonymized upload path per A-3).
4. **Normalize, no LLM:** sort nodes and edges and canonicalize whitespace, so cosmetic reshuffling never shows up as a diff.
5. **Edge check, no LLM:** `scripts/edge_diff.py` parses the Mermaid and compares it with the grimp graph:
   - **Component diagram, exact both ways.** Any edge the diagram shows that isn't a real import, or any real cross-component import the diagram leaves out, is a **discrepancy.**
   - **Data-flow diagram, weaker but mechanical checks:**
     - every internal node must be a real component
     - every internal flow edge must have an import in *some* direction between the two components
     - any edge touching an external service (LLM provider, speech provider) must go through `gateway` (A-2)
   - **If there's a discrepancy:** feed the mismatch list back for **one** automatic LLM retry. If it still mismatches, **block the commit** and print the exact edges. A diagram that asserts a false edge never gets committed.
6. **Stage** `diagrams/AS-BUILT.md` into the commit. The file also contains the verified component edge list as plain text, so `git log -p diagrams/AS-BUILT.md` is an exact, commit-linked record of when imports between components changed.

**Why "every commit" costs nothing on most commits:** steps 1, 2, 4 and 5 are deterministic and take seconds, and they run every time. The LLM (step 3) runs only when the real import graph or the privacy-path files change. When the architecture didn't move, the file doesn't change, which is exactly what keeps its `git log` an honest timeline.

**Undeclared architecture changes:** every task declares **`arch: none`** or **`arch: <what changes>`**, in its `/ship` header or its superpowers plan entry (enforced by a CLAUDE.md rule).
- `/ship` runs `scripts/diagram` before the reviewers.
- If `AS-BUILT.md` changed while the task said `arch: none`, architect-reviewer reports an **"undeclared architecture change"** finding with the diagram diff, even if no A-id is broken.
- The `/ship` summary always shows `architecture changed: y/n, declared: y/n`.

**Protected:** `scripts/diagram`, `scripts/edge_diff.py`, `scripts/triggers.toml` and `diagrams/AS-BUILT.md` join the PreToolUse deny list. **Claude can't hand-edit the diagram;** only the hook writes it.

**Later extension, designed for but NOT built:** `edge_diff.py` is written around one function, `edges(mermaid_file) → set of (from, to)`. When you hand-write `diagrams/TARGET-ARCHITECTURE.md`, comparing it to AS-BUILT is one more call to that function plus one extra step in architect-reviewer's prompt. That step is conditional on the file existing, and **isn't written until the file exists.** Nothing waits on it.

### 3.1c Hooks and git pre-commit (enforce §3.1–3.1b)

**Claude Code hooks** (`.claude/settings.json`, project scope; your global `cc-status` hooks stay as they are):

| Hook | Matcher | Does | Why it earns its place |
|---|---|---|---|
| `PostToolUse` | `Edit\|Write` on `*.py` | `ruff format` + `ruff check --fix` on **that file only**. Leftover errors exit 2 so Claude sees them right away. | Runs in under a second. Catches errors at the edit, not 20 edits later. |
| `Stop` | — | Runs `scripts/check` **only if the tree differs from the last green run** (hash of the diff, cached in a gitignored file). A failure exits 2 with the last ~60 lines of output. No eval, no diagram: those happen at commit time. | Claude can't end a turn with the build red. Q&A-only turns cost nothing. |
| `PreToolUse` | `Edit\|Write` | Denies edits to gate files: `scripts/check`, `.claude/hooks/*`, `.claude/settings.json`, `.importlinter`, *(v3)* `scripts/triggers.toml`, `scripts/diagram`, `scripts/edge_diff.py`, `diagrams/AS-BUILT.md`, `DECISIONS.md` (yours; the reviewer's source of truth shouldn't be editable by the reviewed). | Without this, the cheapest way to "pass the gate" is to weaken the gate. |

**Git `pre-commit`** is the real backstop. It covers the 8-block Stop override, commits made by Codex, and your own commits. In order:
1. Refuse if `src/` or `tests/` have unstaged changes.
2. Refuse if the commit touches gate files, unless `ALLOW_GATE_CHANGE=1` is set.
3. `scripts/check`.
4. *(v3)* `scripts/eval`, if pedagogy paths are staged (§3.1a).
5. *(v3)* `scripts/diagram` → edge check → stage `AS-BUILT.md` (§3.1b).

If any step fails, the commit is blocked.

- **Honest limit:** Claude could still edit gate files through Bash, or set that env var. The protection is a *tripwire, not a wall*, and `/ship` prints "gate files changed: yes/no" on every run so a change is visible.
- *(v2)* **Sub-agent implementers never hit the Stop hook**, because sub-agents fire `SubagentStop`, not `Stop`. That's one reason §3.2c sets superpowers to *inline* execution. If sub-agents ever do implement, the pre-commit hook still catches their commits.

~~**Not in the gate:** the LLM-graded pedagogy eval suite… `/ship` reminds you.~~ *(v3: replaced by the hard gate in §3.1a.)*

### 3.2 Agent roster

The main session does the implementing. It isn't a custom agent. It gets small tasks, one requirement each, with the acceptance test named up front.

#### `scope-skeptic`: the "do we need this" reviewer (required by the brief)
- **Job:** go through every *added unit* in the diff: files, functions, classes, dependencies, config keys, abstractions. Give each one a verdict:
  - **KEEP (R-xx):** traces to a requirement in `REQUIREMENTS.md`.
  - **CUT:** no requirement, speculative, or "for later."
  - **SHRINK:** needed, but bigger than the requirement asks for.
- Also flags: new third-party dependencies, parameters or config with only one caller, interfaces with one implementation, diffs over ~400 lines ("split this").
- **Why separate:** a correctness reviewer's incentive is to *add* (edge cases, defensive code). This agent's only incentive is to *remove*. Put both in one reviewer and the additions win.
- **Tools:** `Read, Grep, Glob, Bash` (read-only git commands). **Model:** Sonnet. **Runs:** on every `/ship`. It's cheap and it's your stated value.
- **Kill criterion:** none. The brief requires it. Revisit if it hasn't produced a CUT in 20 ships.

#### `architect-reviewer` *(v2, Addition 4, written project-specific per D3)*
- **Source of truth** *(v3)*: **`DECISIONS.md` as you wrote it**, not my earlier draft list. The agent reads the file on every run, so a change to `DECISIONS.md` takes effect with nothing to redeploy. It flags **drift**, citing the A-id, and doesn't re-open decisions.
- **Scope:**
  - **It covers A-1 and A-4 through A-10.** Examples:
    - school-hosted deployment assumptions (A-1)
    - summarizing or compacting conversation instead of a hard reset, or a mid-problem reset (A-4)
    - a full DBN, or no scheduling layer at all (A-5)
    - a hand-kept skill list next to the graph (A-6)
    - acoustic-affect features (A-7)
    - a drawing surface (A-8)
    - school-record integration, or keeping a bootstrap transcript (A-9)
    - reporting BKT accuracy as the efficacy metric (A-10)
  - **A-2 and A-3 go to privacy-boundary-reviewer,** since `PRIVACY.md`'s P-ids trace to them. That keeps them from being reported twice.
  - **Anything in "Open / not locked" is never a finding.** That includes cold-start method, diagnostic count, questionnaire fields, pre/posttest design, implicit-review thresholds and safety escalation. The prompt says so explicitly, and every finding must cite an A-id that is locked.
- *(v3)* **Also reports:**
  - an **undeclared architecture change**: the `AS-BUILT.md` diagram moved while the task said `arch: none` (§3.1b)
  - declared changes whose diagram diff **doesn't match what was declared**
- **Why separate:** scope-skeptic asks "is this needed?" and the privacy reviewer asks "does kid data escape?" Neither catches a diff that is needed and private but **built against a locked decision**, or one that quietly reshapes the architecture.
- **Tools:** `Read, Grep, Glob, Bash` (read-only). **Model:** Sonnet. Escalate to Opus only if real drift slips past it.
- **Runs:** on every `/ship`, alongside scope-skeptic.
- **Later, not built:** if `diagrams/TARGET-ARCHITECTURE.md` exists, also diff it against AS-BUILT (§3.1b).
- **Kill criterion:** revisit if it hasn't produced a real drift finding in 20 ships, or fold it into scope-skeptic if their findings keep overlapping.

**Who owns what, so the three reviewers don't double-report:**

| Finding | Owner |
|---|---|
| Code with no requirement behind it / bigger than needed / premature abstraction | scope-skeptic |
| Needed code that contradicts a locked decision (A-1, A-4…A-10), or an undeclared/mismatched architecture change *(v3)* | architect-reviewer |
| Kid data, transcripts, audio, photos or PII escaping, or new sinks (P-ids → A-2, A-3) | privacy-boundary-reviewer |
| A real import the diagram leaves out, or a diagram edge with no real import behind it *(v3)* | **nobody. `edge_diff.py` blocks it mechanically** |
| Bugs | `/code-review` |

#### `privacy-boundary-reviewer`
- **Job:** check the diff against the numbered invariants in `PRIVACY.md` (P-1…P-n). *(v3: each invariant traces to A-2 or A-3.)*
  - no transcript, audio or photo persistence (A-3)
  - the gateway is the only third-party network egress, and it fails closed (A-2)
  - PII-store access only through its single module, with allowlisted fields only
  - profile and mastery state encrypted at rest (A-3)
  - BKT-fitting data leaves only through the **opt-in, anonymized** upload path (A-3)
  - no conversation content in logs, error trackers or analytics
  - no new outbound destinations for kid data
- **Unscrubbed transcripts crossing the gateway are a declared exception (A-3), not a finding.**
- It cites the invariant for every finding. It does **not** re-check what the canary test and import-linter already enforce. Its job is the things tests can't see: new data flows, new sinks, new dependencies that phone home. *(v3: the data-flow diagram diff from §3.1b is part of its input.)*
- **Why separate:** these are the highest-stakes mistakes, and they need a reviewer that holds nothing but the privacy spec. `/code-review` is looking for bugs, not data flows.
- **Tools:** `Read, Grep, Glob, Bash` (read-only). **Model:** Opus.
- **Runs:** only when the diff touches `[privacy].paths` in `scripts/triggers.toml`, or adds a dependency.
- **Kill criterion:** none before real kids use the product. It's paired with Codex for independence.

#### Reused built-ins (no custom agent)
- **`/code-review`** does the "senior dev" correctness review. It runs on every `/ship` except for docs or test-only diffs.
- **Plan mode** handles planning for a single task. Superpowers' `writing-plans` handles multi-task features (§3.2c). **`change-summarizer`** (your existing global agent) writes commit messages.

### 3.2b Demo-readiness agents *(v2, Addition 2)*: `/demo-check` only

`ui-ux-tester` and `accessibility-tester` get copied from the VoltAgent catalog into `.claude/agents/` and trimmed (D1, D2). **They never run in `/ship` and never gate a commit.** They sit dormant until a frontend exists.

| | `ui-ux-tester` | `accessibility-tester` |
|---|---|---|
| **Job** | Walk the running app as **a struggling 14-year-old** and then as **a parent**, through the flows in `REQUIREMENTS.md`. Report what breaks, confuses, looks unfinished or overwhelms (walls of text, too many concepts at once). Screenshots as evidence, and a severity for each item. | Run `axe-core` against each page first, which gives deterministic numbers. Then walk it by keyboard only and check focus, contrast, reduced motion, and whether the copy suits a kid's reading level. Target **WCAG 2.2 AA**. |
| **Tools** | Read, Grep, Glob, plus **Playwright MCP** (Q11). **No Write/Edit:** it reports and doesn't fix. | Read, Grep, Glob, Bash (for axe), plus **Playwright MCP**. No Write/Edit. |
| **Model** | Sonnet | Sonnet (the catalog uses Haiku; bumped because it has to drive a browser) |

*(v3)* **Playwright setup, aimed at the same result every run:**
- `@playwright/mcp` pinned to an exact version (not `@latest`), `--headless --isolated`: an in-memory profile, never your browser, cookies or extensions.
- Fixed `--viewport-size`. Each flow runs twice: **1366×768 (a typical school Chromebook, the target device in the vision doc)** and one phone size.
- A pinned Chromium from that Playwright version.
- **Scoped to the two tester agents only** through `mcpServers` in their frontmatter, so the main session never carries browser tools.
- **axe runs as a small Playwright script** (`@axe-core/playwright`, pinned) at fixed steps in each flow, rather than as a free-form CLI call. Violation counts and screenshots at those steps are the reproducible part of the report.

**The limit on "same result every run":** Playwright fixes the *environment*. The testers' written judgments still come from an LLM, and the app's tutor replies come from an LLM too. So the axe numbers and fixed-step screenshots will repeat exactly, and the prose findings will be close but not identical. Making the app's own output fixed (seeded and pinned) is item 1 in `deferred-credibility-checks.md` ("cold demo" script), which **isn't in this round**.

**`/demo-check`** starts the app locally against a **seeded fake-kid profile**, never real kid data: screenshots and LLM calls must not touch a real child's state. It runs both agents and writes one dated report to `demo-reports/`, sorted into must-fix before the demo / should-fix / ignore.
- **When:** before any demo, investor or YC checkpoint, or pilot-family session. You run it by hand.
- **Kill criterion:** if two demo-checks in a row find nothing you didn't already know from using it yourself, run it less often.

### 3.2c Methodology: `superpowers` *(v2, Addition 1)*

Installed at project scope from `claude-plugins-official` (v6.4.2 at research time). It's the working discipline *inside* the main session. **`/ship` and `scripts/check` stay the authority.** The precedence rules go in `CLAUDE.md`, because superpowers' own skills tell Claude to check the user's instructions first:

| Superpowers skill | How it fits |
|---|---|
| `test-driven-development`, `verification-before-completion` | **Use as-is.** They reinforce the failing-test-first step `/ship` already requires. Neither one gets its own hook. |
| `systematic-debugging` | **Use as-is,** for failures that aren't just a red gate. |
| `brainstorming` → `writing-plans` → `executing-plans` | **For anything bigger than one `/ship` task** (e.g. BKT cold-start integration, the onboarding flow). Every plan task must cite an **R-id**, name its acceptance test, and *(v3)* declare **`arch: none | <expected change>`**. Each one then goes through `/ship`. A task from an approved plan counts as approved; don't brainstorm it again. |
| `subagent-driven-development`, `dispatching-parallel-agents` | **Off by preference:** execute inline. Sub-agent implementers skip the Stop gate (§3.1) and add handoffs without independence (§4). |
| `using-git-worktrees` | **Off by preference:** no worktrees (§4 cut list). The skill asks before creating one, and `CLAUDE.md` answers "no." |
| `requesting-code-review`, `finishing-a-development-branch` | **`/ship` replaces them.** It's the review step and the commit step. There's no remote to push to. |

- **Gate conflict check:** its only hook is `SessionStart` context injection, so nothing overlaps the Stop hook. If a future version adds a Stop or PostToolUse hook, **the project gate wins**; I'd disable the plugin's hook.
- It writes specs and plans to `docs/superpowers/{specs,plans}/`. That's fine: plans with R-ids give scope-skeptic more to trace against.
- **Kill criterion:** if its skill-triggering keeps fighting `/ship` (re-brainstorming approved tasks, asking about worktrees) after the CLAUDE.md rules are in place, uninstall it and keep only the TDD habit in `CLAUDE.md`.

### 3.2d Design skills *(v2, Addition 3)*: guidance only, no gate, no hook

| Skill | Source | Governs |
|---|---|---|
| `frontend-design` | Anthropic, via `claude-plugins-official` (project scope) | **All kid-facing UI.** It works plan → critique the plan against the brief → build, and it names the AI-design tells (cream + terracotta, the SaaS card kit, ALL-CAPS eyebrows, `→` buttons). |
| `design-taste-frontend` (from `Leonxlnx/taste-skill`, MIT, **only this one skill**, D5) | `npx skills add … --skill design-taste-frontend`, pinned into `.claude/skills/` | **The parent-facing landing page** (its own stated scope). For kid UI the dials are VARIANCE ≈3, MOTION ≈2, DENSITY ≈3, because a struggling kid shouldn't get cinematic motion. |

- **Precedence when they disagree** (e.g. taste-skill strongly discourages serif, frontend-design doesn't): `frontend-design` wins on kid UI, taste-skill wins on the landing page.
- Neither skill gets to pick the frontend stack. That's Q1.
- Both are installed now and get used once `web/` exists.

### 3.3 Where Codex plugs in

| When | Command | Focus |
|---|---|---|
| Diff touches privacy-boundary paths | `/codex:adversarial-review` | "Check against PRIVACY.md. Find any path where conversation content, audio, photos or PII escapes the gateway." |
| Diff touches mastery-model math (BKT update, parameter loading, context→guess/slip mapping) | `/codex:adversarial-review` | "Check the BKT update equations and parameter handling against [spec/doc]." |
| End of each build phase | `/codex:adversarial-review --base <phase-start>` | "Architecture and scope: what here isn't needed?" |

**Rules** (from the §2 finding):
1. Codex is **read-only.** `/codex:rescue` isn't used on boundary or math code, and Codex's rewrites never get applied.
2. Every Codex finding is a hypothesis. Claude either **reproduces it as a failing test** and then fixes it, or **dismisses it with one line** saying why. `/ship` shows you both lists.
3. The review gate stays **off**.

**The other direction (Claude reviewing Codex):** if you ever hand a task to Codex (`/codex:rescue`), its diff goes through the same gate and reviewers automatically, because everything is diff-based. The study found that direction helps (+18 pp).

**Kill criterion:** keep a one-line log per Codex review in `.claude/codex-log.md` (accepted / dismissed). If Codex has 0 accepted findings after 10 reviews, drop it.

### 3.4 The per-task loop (`/ship`)

```
[multi-task feature?  superpowers: brainstorming → writing-plans (each task = 1 R-id + acceptance test)
                      → executing-plans, inline, one task at a time ↓]

task (1 R-id, acceptance test named, arch: none|<change>)  →  write failing test (superpowers TDD)  →  implement
      →  Stop hook: scripts/check green (mechanical, can't be skipped)
      →  /ship:
           1. scripts/check (again, from clean)
              + scripts/eval         [if [pedagogy] paths touched; fails closed]      (v3)
              + scripts/diagram      [always: grimp → edge check → AS-BUILT.md]       (v3)
           2. in parallel (independent, read-only):
                scope-skeptic                        [always]
                architect-reviewer                   [always; sees AS-BUILT diff + arch declaration]   (v2/v3)
                /code-review                         [unless docs/tests-only]
                privacy-boundary-reviewer + Codex    [if [privacy] paths touched]
                Codex                                [if [mastery_math] paths touched]
           3. summary for you: R-id, test evidence, KEEP/CUT/SHRINK, drift (A-ids),
              findings fixed/dismissed, "gate files changed: y/n",
              "eval: pass/skipped/n.a.", "architecture changed: y/n, declared: y/n",   (v3)
              "UI changed → consider /demo-check"                                        (v2)
           4. commit message (change-summarizer); YOU commit
              → pre-commit: unstaged check → gate-file tripwire → scripts/check
                → eval (hard, cached) → diagram (stamp fresh → no-op) → stage AS-BUILT.md   (v3)

/demo-check (separate, by hand, before demos/pilots; never per commit)                (v2)
      →  start app with seeded fake-kid profile  →  Playwright (headless, isolated, pinned; 1366×768 + phone)
      →  axe at fixed steps  →  ui-ux-tester ∥ accessibility-tester
      →  demo-reports/YYYY-MM-DD.md (must-fix / should-fix / ignore)
```

You read the step-3 summary and the test evidence, not every diff. The reviewers run in parallel, so the extra agent adds cost but no wait.

### 3.5 Files this creates (after approval)

```
CLAUDE.md                        ~40 lines: commands, loop, pointers; "never persist raw conversation" marked IMPORTANT;
                                 (v2) superpowers precedence rules (§3.2c) + design-skill precedence (§3.2d)
                                 (v3) + "every task declares arch: none|<change>"
REQUIREMENTS.md                  R-ids distilled from vision + brief (you approve)
DECISIONS.md                     (v3) ALREADY EXISTS, written by you; read-only for Claude (added to the protected list)
PRIVACY.md                       P-invariants, each tracing to A-2/A-3 (you approve)
scripts/check                    the gate
scripts/triggers.toml            (v3) the one list of trigger paths: privacy / mastery_math / pedagogy
scripts/diagram                  (v3) grimp → stamp check → LLM update if needed → normalize → edge check → stage
scripts/edge_diff.py             (v3) Mermaid edges vs grimp; built around edges(file) so TARGET-ARCHITECTURE plugs in later
diagrams/AS-BUILT.md             (v3) generated only by the hook; first version produced at the first real commit
.claude/settings.json            3 hooks + permission allowlist for check/test commands
                                 (v2) + enabledPlugins: superpowers, frontend-design, codex (project scope)
.claude/hooks/{format_file,stop_gate,protect_gate}.sh
.claude/agents/{scope-skeptic,privacy-boundary-reviewer}.md
.claude/agents/architect-reviewer.md                     (v2) project-specific; (v3) reads DECISIONS.md + AS-BUILT diff
.claude/agents/{ui-ux-tester,accessibility-tester}.md    (v2) copied from VoltAgent (MIT), trimmed, read-only
                                                         (v3) + Playwright MCP via frontmatter mcpServers, pinned
.claude/skills/ship/SKILL.md
.claude/skills/demo-check/SKILL.md                       (v2)
.claude/skills/design-taste-frontend/SKILL.md            (v2) via npx skills add --skill, pinned
.git/hooks/pre-commit            → unstaged check → gate-file tripwire → scripts/check → eval (if triggered) → diagram
dev dependencies (v3)            import-linter (brings grimp; nothing extra for the diagram); @playwright/mcp + @axe-core/playwright, exact versions

NOT created this round (v3):     scripts/eval + evals/  (next phase; the gate already fails closed without them)
                                 diagrams/TARGET-ARCHITECTURE.md  (you write it; comparison added then)
                                 anything in deferred-credibility-checks.md
(created later by superpowers)   docs/superpowers/{specs,plans}/
(created later by /demo-check)   demo-reports/
```

---

## 4. Considered and cut

| Idea | Why cut |
|---|---|
| Custom "senior dev" agent | `/code-review` already does it, gets maintained, and verifies its own findings. |
| Test-writer / implementer / planner agents | Splitting up job titles adds handoffs without independence. The main session writes the test first, and plan mode handles planning. |
| General security-review agent | Kid-data privacy is the real risk, and it has its own agent. Run built-in `/security-review` once before any wider launch. |
| LLM `agent`/`prompt` hooks as gates | Non-deterministic, slow, and they cost money on every stop. LLMs advise and scripts decide. *(v3: the two LLM steps now on the commit path are **not** LLMs judging code, so this rule still holds.) The pedagogy eval **tests the product**, which is itself an LLM, and its pass/fail is defined by scripted cases. The diagram LLM only **writes**: `edge_diff.py` decides whether its output is true, and it only runs when the import graph or privacy paths change.* |
| Codex on every diff / Codex review gate | Evidence of net regressions on Claude-written code, plus the README's own usage-drain warning. |
| Agent teams / workflow fan-outs / worktree parallelism | Small team, pre-MVP, small tasks. Nothing needs parallel coordination yet. *(v2: this also covers superpowers' `subagent-driven-development` and `using-git-worktrees`, which are turned off by preference in §3.2c.)* |
| CI | No remote yet. `scripts/check` is ready for CI once there is one. |
| Frontend lint/type hooks | No frontend yet. Add them the day `web/` exists. *(v2: `axe-core` becomes a gate check then too, not just part of `/demo-check`.)* |
| Multi-subject abstractions in the harness | Algebra only (brief §3). |
| *(v2)* The other 15 `voltagent-qa-sec` agents | They'd arrive with the plugin install and could be handed work automatically. `security-auditor` is already cut above, and `code-reviewer`/`debugger`/`test-automator` duplicate `/code-review` and superpowers. Only the two testers get copied (D1). |
| *(v2)* The other ~12 taste-skill skills | They conflict with each other, and `gpt-taste`/`output-skill` change agent behavior in ways we don't want. Only `design-taste-frontend` (D5). |
| *(v2)* UI testers or a11y in `/ship` or any hook | Expensive and non-deterministic (addendum Addition 2). `/demo-check` only. |
| *(v3)* **Deferred, not cut:** cold-demo script, gateway fault-injection tests, recurring privacy audit report, mutation + property-based BKT tests | Tracked in `deferred-credibility-checks.md`. Each needs a working system to test, so **none gets built this round** and none is on the build order below. Two small overlaps I'll keep in mind but won't build: `/demo-check`'s output determinism waits on the cold-demo item, and the privacy audit report will reuse the `demo-reports/` pattern. |
| *(v3)* `TARGET-ARCHITECTURE.md` comparison | You haven't written that file yet. The hook is shaped for it (§3.1b), but the comparison step isn't built. |

---

## 5. Open research items (flagged, not solved)

1. **BKT cold-start** (from the brief). Mastery-model work depends on choosing published parameter sources (ASSISTments-style) and mapping them to our skill-graph node IDs. pyBKT can *fix* parameters without fitting, so it's technically possible. Which sources, and how they map to our nodes, is still open. **Blocks the mastery-model tasks, not the harness.**
2. **Contextual guess/slip vs. pyBKT.** pyBKT's `multigs` gives each value of a *discrete* column its own guess/slip. Baker et al. 2008 estimates guess/slip *per observation* with a trained model over continuous features. This needs deciding before implementation:
   - (a) Bucket hint use, latency and self-explanation into a few classes for `multigs`, or
   - (b) Compute contextual guess/slip outside pyBKT.
   - This isn't re-opening the locked decision. It's pinning down what "via pyBKT, using contextual extensions" means in code. It also affects what Codex reviews on math diffs.
   - *(v3)* **This now affects architect-reviewer too.** A-5 is locked and this detail isn't in `DECISIONS.md`'s "Open" list, so the reviewer would have to *guess* whether option (a) counts as "contextual extensions." Once you pick, I'd suggest adding one line to A-5 (your file, your call) so the reviewer has something concrete to check against.
   - **RESOLVED 2026-09-29: option (a).** Contextual modulation goes through pyBKT's `multigs`, with hint usage, response time and self-explanation quality **bucketed into discrete classes**, not continuous covariates. Architect-reviewer treats a continuous-covariate or outside-pyBKT guess/slip model as A-5 drift. **Build-time check:** when this was approved, that line was **not yet in `DECISIONS.md` on disk** (A-5 at line 15 was unchanged). Build step 0 confirms it's there before architect-reviewer is written.
3. **pyBKT on modern Python.** Covered by Q2. Verify before building on it.

---

## 6. Build order once approved (roughly one session)

0. Confirm the A-5 `multigs` line is in `DECISIONS.md` (see the build handoff).
1. ~~You answer §1 (and approve D1–D5)~~ *(done; defaults confirmed)*. Then `git init` and the `uv` project skeleton. That skeleton is also where the real paths in `scripts/triggers.toml` get fixed.
2. `REQUIREMENTS.md` + `PRIVACY.md` drafts for your approval. **The reviewers depend on these.** *(`DECISIONS.md` is already done.)*
3. `scripts/check` + `triggers.toml` + the 3 hooks + pre-commit. Prove it by committing a deliberately broken file and showing the gate blocks it.
   - *(v3)* **Eval-gate proof:** stage a dummy file under a pedagogy path with no `scripts/eval` → commit **blocked**. Add a trivially passing stub eval → commit passes. Change the stub to fail → **blocked**. Then delete all the dummies, so the rule stays wired and dormant.
   - *(v3)* **Diagram proof** on a two-module toy package:
     - (a) add a cross-component import → `AS-BUILT.md` updates and is **staged in the same commit**
     - (b) commit with no structural change → file **byte-identical**, and no LLM call
     - (c) hand-insert a fake edge into the Mermaid (with `ALLOW_GATE_CHANGE=1`) → `edge_diff` **blocks**
     - (d) partial staging → the hook refuses
     - (e) check that an import three hops out still shows up in the graph
     - Then remove the toy package. `AS-BUILT.md` stays as the empty-graph baseline.
4. *(v2)* Install `superpowers` + `frontend-design` at project scope. Write the `CLAUDE.md` precedence rules. **Confirm superpowers adds only its `SessionStart` hook** (`/hooks`) and that the Stop gate from step 3 still blocks.
5. Three reviewer agents + `/ship`. Dry-run on a toy diff that includes:
   - a deliberately unneeded helper (scope-skeptic should CUT it)
   - a `logger.info(message)` in the session code (the canary test + privacy reviewer should catch it)
   - *(v2)* a hand-written skill list next to the graph (architect-reviewer should flag **A-6**, per your numbering)
   - *(v3)* a new cross-component import in a task marked `arch: none` (architect-reviewer should report an **undeclared architecture change**)
   - *(v3)* a change touching something listed as "Open" (e.g. a cold-start method), where architect-reviewer should report **nothing**
6. Install the Codex CLI + plugin and run `/codex:setup`. Run one adversarial review on the step-5 toy diff.
7. *(v2)* Copy and trim the two tester agents, install `design-taste-frontend` only, and write `/demo-check`. **You can't really dry-run it until a frontend exists.** *(v3)* For now I'll run it **twice** against a one-page static stub, with Playwright pinned, headless and isolated. The pass condition is that both runs give **identical axe counts and identical fixed-step screenshots**. Then I'll delete the stub.

---

### Sources
- [Claude Code hooks reference](https://code.claude.com/docs/en/hooks)
- [Claude Code sub-agents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code best practices](https://code.claude.com/docs/en/best-practices): verification gates, the 8-block Stop override, the adversarial-review over-engineering warning
- [openai/codex-plugin-cc README](https://github.com/openai/codex-plugin-cc/blob/main/README.md)
- [Cross-Model LLM Code Review: Should you use Claude to review Codex or vice versa? (arXiv 2607.21656)](https://arxiv.org/abs/2607.21656)
- [Codex CLI review workflows](https://codex.danielvaughan.com/2026/03/30/codex-cli-review-command-code-review-workflows/)
- [pyBKT](https://github.com/CAHLR/pyBKT) and [PyPI metadata](https://pypi.org/project/pyBKT/)
- *(v2)* [obra/superpowers](https://github.com/obra/superpowers): v6.4.2, `hooks/hooks.json`, `skills/*/SKILL.md`
- *(v2)* [VoltAgent/awesome-claude-code-subagents, category 04](https://github.com/VoltAgent/awesome-claude-code-subagents/tree/main/categories/04-quality-security): `plugin.json` (17 agents), `ui-ux-tester.md`, `accessibility-tester.md`, `architect-reviewer.md`
- *(v2)* [anthropics/skills: frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design)
- *(v2)* [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill): `skills/taste-skill/SKILL.md` (`design-taste-frontend`), `skill.sh`
- *(v3)* [grimp](https://github.com/python-grimp/grimp), the import-graph engine behind import-linter (Q12). pydeps was evaluated and dropped.
- *(v3)* [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp): `--isolated`, `--headless`, `--viewport-size`, `--browser`
