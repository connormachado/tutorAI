# The Primer — Initial Vision & Product Notes
 
*An adaptive, privacy-first AI tutor for kids. Compiled from the founding brainstorm session.*
 
---
 
## 1. Origin Story
 
This idea came out of working through YC's Fall 2026 Requests for Startups. Several other ideas were seriously considered and tabled first:
 
- **New Operating Systems for the Physical World** — tabled; the dispatch/coordination angle didn't feel exciting even after exploring realistic customers (mid-size construction/logistics firms).
- **Compute at Sea** — tabled; outside my current wheelhouse.
- **Future of American Defense / counter-drone** — genuinely exciting (Ukraine-relevant, huge market), but recognized as extremely hard and competitive. Have a potential co-founder in mind here: an electrical engineer friend currently in Dartmouth's MEM program, who'd be willing to join a YC application if this path is ever revisited.
- **Data for the Real World** (dense physical-world sensing + AI modeling) — explored deeply, fits a data-pipeline background well. Candidate verticals brainstormed: NYC's aging underground pipe infrastructure, the wine industry (personal connection: worked on mobile bottling trucks for Rye Mobile Bottling, a leading Napa Valley mobile bottler), and road/bridge structural health monitoring for NH DOT. Logged as a serious contender, not chosen.
- **"Claire OS"** — a separate, pre-existing capstone project (ingests a departed employee's email to surface institutional knowledge), rights currently held by an advisor. Distinct from the above; may revisit separately later.
**The choice: "The Primer"** — an adaptive AI tutor for kids. This won out for reasons beyond market logic: real tutoring/teaching background, two younger brothers (one just started high school and is struggling with math), and a mother who is a private tutor for exactly this age group — a built-in expert advisor and test group. This is the first project in a while that's felt personally fulfilling rather than just technically interesting. Goal: make this a paying job by January (~4 months out).
 
**Founder-market fit**, distilled: tutoring background + technical ability (CS + hardware/FPGA + heavy Claude Code / agentic workflow experience) + a mother with direct domain expertise + a brother who is a real, immediate test case.
 
---
 
## 2. Core Product Thesis
 
Most existing AI tutors (including chatbot homework helpers) fail because they either hand over answers or re-explain the same concept the same way repeatedly. The real insight:
 
> **Struggling kids are usually missing a foundational sub-skill one or two levels below the concept they're stuck on** — a "cracked floor" — not failing at the topic itself.
 
The product's core job is **diagnosis before teaching**: figure out the actual gap, then try different explanation angles until it clicks — never just hand over the answer.
 
A second, deeper thesis emerged during the discussion and may be the *real* differentiator:
 
> School isn't really about learning algebra or biology — it's about learning **how to learn**, how to adapt to unfamiliar systems, how to take in new information and act on it. That meta-skill is the actual differentiator over any homework-answering tool.
 
This reframes the product from "AI that knows algebra" to "AI that teaches metacognition, using algebra as the current vehicle."
 
### Grounding in real learning science
Rather than relying on vague "the AI understands the kid," the teaching approach should be explicitly grounded in established educational psychology:
- **Metacognition** — thinking about one's own thinking/learning process.
- **Retrieval practice / spaced repetition** — actively recalling information (not re-reading) builds durable understanding.
- **Productive struggle** — kids learn more when allowed to sit in confusion briefly before being rescued.
- **Self-explanation** — asking a kid to explain their own reasoning (even when wrong) builds understanding faster than being told the correct method.
Plan: read into this research directly (not just to have talking points, but because it will likely surface concrete features on its own).
 
### From theory to a working system
The practical path is **not** fine-tuning a model on pedagogy (expensive, hard to verify). Instead: encode these principles as **explicit, testable rules** in the system prompt and interaction loop, e.g.:
- Always ask the kid to explain their reasoning before correcting it (self-explanation).
- Never give the answer on the first wrong attempt — hold off through at least one more try (productive struggle).
- Periodically prompt recall of earlier material rather than just re-teaching fresh (retrieval practice).
Because these are literal, written rules, they're **testable**: build a suite of scripted fake student inputs (wrong answer, direct answer-request, clearly frustrated kid, etc.) and check whether the model actually follows the rule each turn. This is a much stronger, more honest thing to demonstrate than "trust me, it teaches well."
 
### Ground-truth content, not freelanced math
General models do make real errors on multi-step math, and a tutor product cannot afford that — trust breaks instantly. Rather than trusting the model to generate explanations freehand, or building a content library from scratch:
- Use a **retrieval-augmented (RAG) layer** pulling concept explanations from vetted, existing sources (open educational resources, established curricula).
- The model stays free to personalize *delivery and tone*, but the *core content* is anchored to something verified, not improvised.
- This directly answers "how do you know it teaches correctly" before a YC partner (or a parent) even asks.
Khan Academy / Khanmigo is the natural comparison here — they have breadth and a huge content library; the wedge is going **deeper on one kid**: real diagnostic sub-skill mapping and a persistent, evolving personality file, not just a chat layer over existing content.
 
---
 
## 3. Product Architecture
 
### Skill map
- A mutable, appendable graph of roughly 50–100 sub-skills per subject (starting with algebra), with prerequisite edges between them.
- Each kid has their own continuously-updating confidence score per node.
- Architecture should allow bolting on new subject-graphs later (not just algebra).
### Personality / interest profile
- A separate persistent file per kid (conceptually a per-kid markdown file) tracking interests (e.g., "loves Mbappe/Messi/soccer"), motivational hooks, and sensitive topics to avoid pushing on.
- Used to reframe concepts through things the kid already cares about, and to know how to approach a resisted topic sideways rather than head-on.
### Ingestion approach
- Not an upfront interview. Passive, ongoing inference over time, combined with a structured warm "be a friend first" onboarding chat — talk about their day/interests first, gently open the door to what they're stuck on at the end — to build trust before extracting data.
### Emotional detection
- Text alone is ambiguous (even adults misread tone), so a voice-first interface is preferred to capture pitch, pace, and pauses as real signal.
- De-escalation ladder on detecting frustration/resistance:
  1. First offense in a session → gently pivot or pause.
  2. Repeated within the session → switch to a confidence-building topic.
  3. Multi-day pattern → surface to parents constructively ("here's a sticking point and what we tried," never "your kid failed").
### Response length
- Deliberately capped/limited. A struggling kid should not be overwhelmed with a wall of text or too many concepts at once.
### Context management for long sessions
- Decided against rolling conversation-summary compaction (à la Claude Code).
- Instead: **periodic hard resets** of the live conversation, reloaded from the persistent skill map and personality file. The kid still feels continuity ("it still knows I like Mbappe") without the model dragging raw hours of dialogue behind it. Cheaper and more reliable than compaction for this use case.
### Local vs. cloud inference
- Original instinct was full local/on-device inference as a strong privacy pitch ("no servers collecting data").
- Reality check: target devices (e.g., a school-issued Chromebook) generally **cannot run a local model** — no GPU, minimal RAM. Pure on-device inference is not viable for V1.
- Revised privacy pitch: not "nothing ever leaves the device," but **"we don't store or sell raw conversation data"** — a more standard but still honest and defensible privacy stance.
- Data retention: don't persist raw transcripts long-term at all. Persist only distilled state — skill confidence scores, the personality/interest file, and short structured session summaries — encrypted at rest. Smaller attack surface, more honest privacy claim, simpler engineering.
### V1 scope
- Simple app/website.
- Voice or camera-photo input (to read handwritten work via a vision model) — avoids needing any wearable/robot hardware on day one.
- Cloud-inference model (given the device-capability reality above).
- Skill map + personality file + warm onboarding flow.
- A scripted test suite validating pedagogy-rule adherence (see above) before real users.
### Deferred to V2+ (explicitly not part of the initial pitch/build)
- **Interactive shared whiteboard**: both tutor and kid can draw/see visuals together — e.g., animating a parabola to teach the concept of a vertex, letting the kid mark where they think the peak is. Seen as a core differentiator from pure chatbot-style tutors, not a nice-to-have. Want tooling to generate graphs/diagrams/simple animations quickly — both for this feature and for personal use independent of the product.
- **Real-world grounding**: connecting lessons to physical objects/actions (e.g., "grab a football and throw it — see the arc it traces?"). Recognized as a harder, more novel problem than the whiteboard, not solved yet, but the instinct is considered a genuine differentiator tied to why in-person teaching works.
- **Teacher sync**: an end-of-semester interview/sync between the tutor and the kid's real teacher, comparing what was taught vs. what the student actually retained.
- **Physical device / wearable / robot companion** — deferred to a much later version, after the core loop is proven.
- **Broader audience** (college students / adult self-tutoring) — noted as a possible future expansion, deliberately not part of the initial pitch.
---
 
## 4. Safety & Legal (flagged as critical before scaling)
 
- **Mandatory reporting risk**: if a kid discloses abuse, self-harm, or danger, the system must never attempt to handle it itself or act as a therapist. It must detect specific disclosure categories and hard-code escalation to a parent/guardian and/or crisis resources.
- Needs real legal counsel on whether AI tutor products fall under mandatory-reporter frameworks, which vary by state and have historically applied to human caregivers/teachers — not yet clear how (or whether) this extends to AI products. **Not yet started; flagged as necessary before any wider launch.**
- Design principle discussed for the "friend" framing (see below): should not encourage emotional attachment or dependency on the AI as a substitute for real relationships. Warm and genuinely curious, yes — but should actively nudge the kid back toward real friends and family, never position itself as a replacement.
---
 
## 5. Business Model
 
- **Monetization**: direct-to-parent subscription. Deliberately skipping school-district sales for now — that path involves procurement cycles, IT approval, and much longer sales timelines that don't fit the current stage. Would consider a school integration later, once there's real proof of market through parents (and possibly even a Khan Academy–style partnership or acquisition path down the line, though that's speculative).
- **Distribution plan (honest version, not the "I'll just get traction on social media" version)**: convert my mother's existing tutoring client list and my brother's friend group first. Test whether organic referral follows from that base before betting on any broader channel.
- **Competition**: Khan Academy's Khanmigo is the most direct comparison — huge content library and distribution, but (as best understood) a chat layer over existing content rather than deep diagnostic sub-skill mapping or a persistent per-kid personality file. The wedge is "we go deeper on one kid" vs. "we have breadth across every kid." Still need to actually try Khanmigo directly and do real competitive research before finalizing this claim.
- **Retention/efficacy measurement**: not yet solved. Need a real way to show the tutoring is actually working (e.g., measurable improvement in confidence or grades over weeks), not just anecdote — especially since "we teach better" is the core claim. Plan to talk to my mother about how she personally judges whether she's actually helping a kid, as a starting point.
---
 
## 6. "Friend" Framing — Trust & Adoption
 
Instinct: framing the AI as more of a warm, curious presence ("how was your day?") rather than a pure answer-and-drill tutor, to build the rapport needed for the kid to actually open up about what they're stuck on. Current chatbots often read as generic people-pleasers; want something that feels like an actual conversationalist a kid wants to talk to at the end of the day.
 
**Important guardrail, agreed on explicitly**: this must not create emotional attachment to the AI as a substitute for real relationships. The framing should be "warm and genuinely curious," not "your friend," and the product should actively encourage real-world connection rather than displace it. This is a real design responsibility, not just a feature choice.
 
---
 
## 7. YC Prep (from the founders Q&A night this was drafted for)
 
**Elevator pitch**: AI tutor for kids struggling in school (math first). Differentiator vs. existing tools (answer-giving chatbots or rigid rule-based apps): real diagnosis of foundational gaps + teaching through the kid's existing interests + privacy-conscious architecture (no storing/selling raw conversation data). Cites mother's tutoring expertise and brother as a built-in test case.
 
**Questions prepared to ask founders:**
1. Cloud vs. local model tradeoff — is privacy alone a strong enough selling point for parents to accept a less-capable model? (Framed as an open question, not a defense.)
2. How to de-risk the hardest unsolved piece — reliably detecting a kid's frustration/emotional state — before building the whole product around it.
3. How seriously to take mandatory-reporting/safety-disclosure design before launching a prototype vs. figuring it out while scaling.
**Honest weak points identified (to address directly, not paper over):**
- Local model quality vs. cloud capability tradeoff, and what that does to the privacy pitch.
- Emotional detection is genuinely hard; errors here could break trust fast.
- Distribution — not "I'm the differentiator + social presence" (pushed back on as unproven), but the honest plan above: mom's client list + brother's friend group first, testing for organic referral before betting on a broader channel.
**What to say if asked "what do you need from us / what funding do you need":**
- Not a funding ask at this stage — the real need is feedback on the plan, intros to founders who've tackled kid-facing or consumer AI products, and eventually warm intros to early pilot families outside the existing network.
- Honest framing if pushed on funding: not looking for capital yet, heads-down building and testing; YC's standard deal would come through the normal application process once there's real signal.
---
 
## 8. Open Items / Next Steps
 
- [ ] Build a working prototype (V1: chat interface + local/cloud model + basic system prompt encoding the tutoring philosophy) — started concurrently in Claude Code.
- [ ] Read into the learning-science research (metacognition, retrieval practice, productive struggle, self-explanation) to sharpen both the pitch and the actual feature set.
- [ ] Try Khanmigo directly and do real competitive research rather than relying on secondhand impressions.
- [ ] Design the scripted test suite for pedagogy-rule adherence (simulated student inputs + rule-following checks).
- [ ] Talk to Mom about how she personally judges tutoring efficacy, as a starting point for a real retention/efficacy metric.
- [ ] Get legal input on mandatory-reporting obligations for AI tutor products before any wider launch — not yet started.
- [ ] Design the RAG/ground-truth content layer (source selection, retrieval architecture) once V1's core loop is validated.
- [ ] Come back to the interactive whiteboard and real-world-grounding features as a dedicated V2 design pass.
- [ ] Concrete technical build plan for the actual first demo/prototype — still open, to be worked out in a follow-up session.
---
 
*Compiled from a single long-form brainstorm session — first pass at capturing the full arc from idea selection through product design, architecture, safety, and business model. Meant as a living document to expand as the project grows (e.g., splitting off dedicated MVP roadmap, pedagogy/safety, and market-research docs as they earn it).*
 