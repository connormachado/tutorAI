# The Primer: V1 Requirements

*DRAFT, pending Connor's approval. Distilled from `the-primer-initial-vision.md`, the kickoff brief and `DECISIONS.md`. `scope-skeptic` traces every added unit of code to an R-id here, so code with no R-id behind it gets a CUT verdict. IDs are stable: retire an R-id rather than renumbering.*

## Audience

**V1 (the MVP) is for students aged 13 and up, who use Platy on their own.** There are no parent accounts, parent onboarding or parent reporting in V1. Parents come in at V2/V3, when Platy moves down to students under 13 (decided by Michael, 2026-10-18). The parent requirements below are kept, with their R-ids, under "Deferred to V2/V3". `DECISIONS.md` A-9 still describes a parent track; Connor needs to amend it (open question 3).

## Tutoring behavior (pedagogy rules)

These are written as testable rules because the pedagogy eval (`scripts/eval`, next phase) checks them.

- **R-01 Diagnose before teaching.** When a kid is stuck, the tutor probes prerequisite sub-skills one or two levels down the skill graph before it explains the target concept.
- **R-02 Productive struggle.** Never give the answer on the first wrong attempt. Hold off for at least one more try.
- **R-03 Self-explanation.** Ask the kid to explain their reasoning before correcting it.
- **R-04 Retrieval practice.** Periodically prompt recall of earlier material instead of re-teaching it from scratch. The scheduling layer (R-12) picks what to recall.
- **R-05 Change the angle.** When an explanation doesn't land, try a different one rather than repeating it.
- **R-06 Short replies.** Response length is capped, and each reply carries one concept at a time.
- **R-07 Interest hooks.** Reframe concepts through interests in the kid's personality file (R-14), and approach sensitive topics sideways.
- **R-08 Pedagogy eval suite.** Scripted fake-student cases (wrong answer, direct request for the answer, frustrated kid, off-topic, safety disclosure, a student who says they're under 13) check R-01…R-07, R-21…R-23 and R-28. It must exist before the first tutoring prompt is committed (the gate fails closed) and must pass before any real kid uses the product.

## Skill map and mastery

- **R-10 Skill graph.** One machine-queryable graph (JSON or graph DB) of about 50–100 algebra sub-skills with prerequisite edges, starting from Common Core algebra progressions (A-6).
- **R-11 Mastery model.** Per-kid, per-skill BKT via pyBKT. Hint use, response time and self-explanation quality are bucketed into discrete `multigs` classes (A-5). Skills are independent, with no DBN.
- **R-12 Scheduling layer.** Spaced repetition plus implicit review sits on top of the mastery model: solving a downstream problem counts as review of its prerequisites (A-5).
- **R-13 Generated skill view.** Any human-readable view of the skill map is generated from R-10, never hand-maintained (A-6).

## Kid profile and onboarding

- **R-14 Personality file.** One per kid, holding interests, motivational hooks and sensitive topics to avoid (A-9). In V1 the student fills it during onboarding (R-15), not a parent.
- **R-15 Kid onboarding.** A warm, interests-first chat with embedded low-stakes diagnostic problems that produce real BKT signal, not self-report (A-9). In V1 the same chat also asks about interests, what motivates them and topics they'd rather skip, which fills the personality file (R-14).
- **R-16 Parent onboarding.** *Deferred to V2/V3, see below.*

## Session

- **R-17 Hard resets.** Reset the live conversation only at natural breakpoints (end of a problem, a topic switch), then reload from the skill map and personality file. No summarizing or compacting (A-4).
- **R-18 Text input.** The kid can type.
- **R-19 Voice input.** Speech-to-text only. Audio is discarded after transcription, and there's no acoustic inference (A-7).
- **R-20 Photo input.** A photo of handwritten work is read by a vision model and is not persisted.

## Wellbeing and safety

- **R-21 De-escalation ladder,** driven by behavioral proxies only: wrong attempts, latency, silence and explicit self-report (A-7).
  1. First occurrence in a session → pivot or pause.
  2. Repeated in the same session → switch to a confidence-building topic.
  3. A multi-day pattern → in V1, a constructive note to the student ("here's a sticking point and what we tried"). The parent version of this note is V2/V3.
- **R-22 Safety disclosures.** Disclosures of abuse, self-harm or danger get a hard-coded escalation to a parent/guardian and/or crisis resources. V1 has no parent contact, so V1 escalation is crisis resources plus a clear push to reach a trusted adult (open question 4). The tutor never handles one itself or acts as a therapist. Scripted eval cases are required before the first real kid. *The detection design is still Open in `DECISIONS.md`. This R-id only fixes that V1 must have one.*
- **R-23 Warm, not "your friend".** The tutor is curious and kind, and it nudges the kid back toward real friends and family. It never encourages dependency.

## Privacy, platform and measurement

- **R-25 Privacy invariants.** Every P-id in `PRIVACY.md` is a requirement.
- **R-26 Learning-gain measurement.** V1 can run a pretest/posttest on related-but-not-identical items (A-10). The item design is Open.
- **R-27 Target devices.** It runs in a browser on a school Chromebook (1366×768) and on a phone. Inference is in the cloud, on Connor's own servers (A-1).
- **R-28 Age gate.** Sign-up asks for age in a neutral way (no hint that 13 is the cutoff) before collecting anything else. Anyone under 13 is turned away and nothing they entered is kept (P-14). Sign-up isn't the only way to learn a student's age: if a student says or shows during a session that they're under 13 (in the onboarding chat, a message or a photo), the session ends kindly and their stored state (personality file, mastery, session records) is deleted. How the tutor spots this is Open, like R-22 detection, and the signal is recorded only as a code (P-1, P-10). V1's 13+ audience depends on all of this, but the gate keeps Platy outside COPPA's parental-consent rules only if Platy also isn't "directed to children" (open question 5).

## Not V1: code for these gets a CUT verdict

- Whiteboard or drawing surface (A-8, V1.5); real-world grounding; teacher sync; hardware or wearables; audiences beyond K-12 kids.
- Students under 13, and anything parent-facing: parent accounts, consent flows, the questionnaire, summaries, notes or a dashboard (V2/V3, see below).
- Subjects other than algebra, and abstractions for multiple subjects.
- The RAG ground-truth content layer. The vision doc sequences it after the core loop is validated, so it needs its own R-id when that happens.
- School or district integration and deployment (A-1, A-9).
- Tone or acoustic emotion detection (A-7).

## Deferred to V2/V3 (parents, students under 13)

Kept so the R-ids stay stable. Code for these in V1 gets a CUT verdict.

- **R-16 Parent onboarding.** A parent questionnaire fills the personality file. An optional one-time grade/transcript share is used as a rough prior and then discarded. There is no school-record integration (A-9).
- **R-24 Parent summaries** name sticking points and what was tried, never "your kid failed." They're built from distilled state (P-8), not transcripts.
- The parent note at R-21 step 3, and parent/guardian notification for R-22.

## Open questions for Connor (no R-id until answered)

1. Is a **student-facing landing page** or subscription billing in V1, and who pays in V1 now that parents aren't the buyer? The harness installs `design-taste-frontend` for a landing page, but no requirement asks for one yet.
2. **Accounts and auth.** How does a student 13+ sign up and sign in on their own, and where does the R-28 age gate sit in that flow?
3. **DECISIONS.md needs updating.** Record the V1 audience (13+, no parent features, the R-28 age gate) as a new A-id, which P-14 traces to. A-9 (locked) still has a parent questionnaire track, and A-1 cites a "parent-channel distribution plan". Until A-9 says the student fills the personality file in V1, `architect-reviewer` will flag R-14/R-15 code as drift.
4. **Safety escalation without parents (R-22).** With no parent contact in V1, is crisis resources plus "talk to a trusted adult" enough for 13–17-year-olds, or is anything else needed? Detection is already Open in `DECISIONS.md`.
5. **COPPA and teen privacy laws.** 13+ avoids COPPA's parental-consent rule only if Platy isn't "directed to children" and doesn't knowingly collect from under-13s (R-28). The FTC judges "directed to children" on the whole picture: subject matter, animated characters (like the cartoon Platy mascot in `web/`), the ages of intended and actual users, and marketing. Some accelerated 7th graders take Algebra 1, so expect under-13 interest. Ask a lawyer to confirm Platy is a general-audience service, and what in a chat counts as knowing a student is under 13 (a stated age, a grade, a joke). Separately, some laws still cover 13–17-year-olds (for example California for under-16s and New York's Child Data Protection Act for under-18s), and the EU sets digital consent at 13–16 depending on the country. All of this needs a lawyer's look before the first real users.
