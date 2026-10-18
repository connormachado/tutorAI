import { checkAnswer, matchesValue, readAnswer } from "../mock/answers";
import {
  CLOSING, CONFIDENCE_BUILDER, LESSON, NO_ANSWERS, NUDGES, OPENING, OUT_OF_HINTS,
  SAFETY_RESOURCES, type ScriptedProblem, UNREADABLE,
} from "../mock/script";
import type { ClientEvent, ServerEvent, SessionMode } from "../protocol";
import type { DemoTrigger, TutorTransport } from "./types";

export interface MockTiming {
  /** Pause before the tutor starts a reply. */
  thinkMs: number;
  /** Pause between streamed words. */
  wordMs: number;
  /** How long the "nice, fresh page" moment lasts before the next problem. */
  resetMs: number;
}

export const DEMO_TIMING: MockTiming = { thinkMs: 550, wordMs: 35, resetMs: 1600 };

// Plays the role of Platy's server, in the browser, from a fixed script. Nothing the kid
// types is stored: it is read once to pick the scripted reply and then dropped (P-1).
export class MockTransport implements TutorTransport {
  readonly kind = "mock";
  private emit: (e: ServerEvent) => void = () => {};
  private queue: Promise<void> = Promise.resolve();
  private closed = false;
  private nextMessage = 1;

  private order: ScriptedProblem[] = [...LESSON];
  private index = 0;
  private current: ScriptedProblem | null = null;
  private misses = 0;
  private hintsUsed = 0;
  private awaitingWhy = false;
  private paused = false;
  private pivoted = false;
  private solved = 0;
  private nudge = 0;

  constructor(private readonly timing: MockTiming = DEMO_TIMING) {}

  async start(_mode: SessionMode, onEvent: (event: ServerEvent) => void): Promise<void> {
    this.emit = onEvent;
    this.run(async () => {
      await this.say(OPENING);
      await this.present(this.order[0]!);
    });
  }

  send(event: ClientEvent): void {
    this.run(() => this.handle(event));
  }

  close(): void {
    this.closed = true;
  }

  /** Resolves once every queued tutor turn has played out. Used by tests. */
  whenIdle(): Promise<void> {
    return this.queue;
  }

  demo(trigger: DemoTrigger): void {
    this.run(async () => {
      switch (trigger) {
        case "pause":
          this.paused = true;
          this.out({ type: "pause_suggested" });
          return;
        case "safety":
          this.out({ type: "safety_escalation", resources: SAFETY_RESOURCES });
          return;
        case "error":
          this.out({ type: "error", code: "demo_gateway_timeout" });
          this.closed = true;
          return;
        case "skip":
          if (this.current) await this.finishProblem();
          return;
      }
    });
  }

  // Tutor turns run one at a time, in order, so streamed replies never interleave.
  private run(step: () => Promise<void>): void {
    this.queue = this.queue.then(() => (this.closed ? undefined : step()));
  }

  private out(event: ServerEvent): void {
    if (!this.closed) this.emit(event);
  }

  private async handle(event: ClientEvent): Promise<void> {
    const p = this.current;
    switch (event.type) {
      case "end_session":
        this.out({ type: "session_end", solved: this.solved });
        this.closed = true;
        return;
      case "resume":
        if (!this.paused) return;
        this.paused = false;
        await this.pivot();
        return;
      case "hint_requested":
        if (p) await this.hint(p);
        return;
      case "answer":
        if (p && event.problem_id === p.problem_id) await this.answer(p, event.text);
        return;
      case "kid_message":
        await this.chat(p, event.text);
        return;
    }
  }

  private async chat(p: ScriptedProblem | null, text: string): Promise<void> {
    if (!p) return;
    if (this.awaitingWhy) {
      this.awaitingWhy = false;
      await this.say(p.afterWhy);
    } else if (/just tell me|what'?s the answer|give me the answer|tell me the answer/i.test(text)) {
      await this.say(NO_ANSWERS);
    } else if (/\b(idk|i don'?t know|stuck|confused|hint|help)\b/i.test(text)) {
      await this.hint(p);
    } else if (readAnswer(text)) {
      // A kid who types the answer into the chat gets it checked, not redirected.
      await this.answer(p, text);
    } else {
      await this.say(NUDGES[this.nudge++ % NUDGES.length]!);
    }
  }

  private async hint(p: ScriptedProblem): Promise<void> {
    const hint = p.hints[this.hintsUsed];
    if (hint === undefined) {
      await this.say(OUT_OF_HINTS);
      return;
    }
    this.hintsUsed++;
    await this.say(hint);
  }

  private async answer(p: ScriptedProblem, text: string): Promise<void> {
    const result = checkAnswer(text, p.solutions);
    this.out({ type: "answer_result", problem_id: p.problem_id, result });
    if (result === "unreadable") {
      await this.say(UNREADABLE);
      return;
    }
    if (result === "correct") {
      this.solved++;
      for (const line of p.correct) await this.say(line);
      await this.finishProblem();
      return;
    }
    if (result === "partial" && p.partial) {
      await this.say(p.partial);
      return;
    }
    this.misses++;
    const slip = p.misconceptions.find((m) => matchesValue(text, m.value));
    if (this.misses >= 3 && !this.pivoted) {
      // Third miss on one problem: first rung of the de-escalation ladder (R-21).
      this.paused = true;
      await this.say("This one's being stubborn. Let's take a breath.");
      this.out({ type: "pause_suggested" });
    } else if (slip) {
      await this.say(slip.reply);
    } else if (this.misses === 1) {
      // Never correct on the first miss; ask for reasoning (R-02, R-03).
      this.awaitingWhy = true;
      await this.say(p.askWhy);
    } else {
      await this.say(p.secondMiss);
    }
  }

  private async pivot(): Promise<void> {
    this.pivoted = true;
    this.out({ type: "topic_switch", label: "Quick confidence builder" });
    this.out({ type: "reset", reason: "topic_switch" });
    await this.sleep(this.timing.resetMs);
    // Come back to the problem they were stuck on after the easier one.
    this.order.splice(this.index, 0, CONFIDENCE_BUILDER);
    await this.present(CONFIDENCE_BUILDER);
  }

  private async finishProblem(): Promise<void> {
    this.index++;
    this.current = null;
    const next = this.order[this.index];
    if (!next) {
      await this.say(CLOSING);
      this.out({ type: "session_end", solved: this.solved });
      this.closed = true;
      return;
    }
    await this.sleep(this.timing.resetMs);
    // Hard reset at the end of a problem (R-17); the next problem starts on a clean page.
    this.out({ type: "reset", reason: "problem_end" });
    await this.sleep(this.timing.resetMs);
    await this.present(next);
  }

  private async present(p: ScriptedProblem): Promise<void> {
    this.current = p;
    this.misses = 0;
    this.hintsUsed = 0;
    this.awaitingWhy = false;
    const lessonOnly = this.order.filter((q) => q !== CONFIDENCE_BUILDER);
    const position = lessonOnly.indexOf(p) + 1;
    for (const line of p.intro) await this.say(line);
    this.out({
      type: "problem",
      problem_id: p.problem_id,
      skill_id: p.skill_id,
      prompt: p.prompt,
      instruction: p.instruction,
      position, // 0 for the confidence builder, which isn't one of the lesson's problems
      total: lessonOnly.length,
    });
  }

  private async say(text: string): Promise<void> {
    const message_id = `t${this.nextMessage++}`;
    await this.sleep(this.timing.thinkMs);
    // Stream word by word, but keep each $...$ math span whole so it never renders half-typed.
    const words = text.match(/\$[^$]*\$\S*\s*|[^\s$]+\s*/g) ?? [text];
    for (const [i, word] of words.entries()) {
      if (this.closed) return;
      this.out({ type: "tutor_message", message_id, delta: word, done: i === words.length - 1 });
      if (i < words.length - 1) await this.sleep(this.timing.wordMs);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
