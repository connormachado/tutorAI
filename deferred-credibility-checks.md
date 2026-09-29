# Deferred Trust & Credibility Checks

*Not part of this build round. All four need a working system to test — tabled for correct sequencing, not cut. Revisit once V1's core loop (chat interface + tutoring prompt + BKT) actually exists.*

---

**Reproducible "cold demo" script.** One command, from a clean checkout, fixed seed, fixed fake kid profile, deterministic output. Strongest available antidote to "this is vibe-coded" — a YC partner (or anyone) can clone the repo and get the exact promised behavior themselves, no live demo risk. Build once there's a demo to script.

**Gateway fault-injection tests.** Narrowly scoped to the allowlist gateway only — not general chaos engineering. Tests: LLM provider timeout, malformed response, dropped connection mid-session. Confirms the system actually fails closed under real failure conditions (A-2), not just on the happy path. Build once the gateway is implemented.

**Recurring privacy audit report.** Takes the canary test that already exists and turns it into a dated report artifact (same pattern as `demo-reports/`) instead of a pass/fail buried in test output — something to literally hand a parent or a YC partner. Build once the gateway + canary test exist.

**Mutation testing + property-based BKT tests.** More involved, higher payoff later: mutation testing on the gateway/BKT modules (deliberately break the code, confirm the test suite catches it — gives a real number like "94% mutation kill rate" to cite) and property-based tests on the BKT math itself (mastery probability monotonically non-decreasing on a correct response, guess/slip bounded in [0,1]). Build once pyBKT integration is stable enough to have real invariants worth protecting.
