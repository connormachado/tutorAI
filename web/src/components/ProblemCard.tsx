import { useEffect, useState } from "react";
import { Tex } from "../math/MathText";
import type { Problem } from "../protocol";
import type { AnswerFeedback } from "../session/state";
import { MathInput } from "./MathInput";
import { Mascot } from "./Mascot";

const FEEDBACK: Record<Exclude<AnswerFeedback, null>, { text: string; tone: string }> = {
  correct: { text: "That's right!", tone: "good" },
  partial: { text: "Part of the way there.", tone: "warm" },
  incorrect: { text: "Not yet. Keep going.", tone: "warm" },
  unreadable: { text: "Platy couldn't read that one.", tone: "warm" },
};

interface Props {
  problem: Problem | null;
  feedback: AnswerFeedback;
  onAnswer: (problemId: string, text: string) => void;
  onHint: (problemId: string) => void;
}

export function ProblemCard({ problem, feedback, onAnswer, onHint }: Props) {
  const [draft, setDraft] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const problemId = problem?.problem_id;

  useEffect(() => {
    setDraft("");
    setShowFeedback(false);
  }, [problemId]);

  useEffect(() => {
    if (feedback) setShowFeedback(true);
  }, [feedback]);

  if (!problem) {
    return (
      <section className="card problem problem--waiting" aria-label="Problem">
        <Mascot size={72} />
        <p>Your next problem is on its way.</p>
      </section>
    );
  }

  const solved = feedback === "correct";
  const submit = () => {
    if (!draft.trim() || solved) return;
    onAnswer(problem.problem_id, draft.trim());
  };
  const fb = showFeedback && feedback ? FEEDBACK[feedback] : null;

  return (
    <section className={`card problem${solved ? " problem--solved" : ""}`} aria-labelledby="problem-heading">
      <p className="problem__count">
        {problem.position > 0 ? `Problem ${problem.position} of ${problem.total}` : "Warm-up"}
      </p>
      <h2 id="problem-heading" className="problem__instruction">
        {problem.instruction}
      </h2>
      <div className="problem__prompt">
        <Tex latex={problem.prompt} display />
      </div>

      <MathInput
        id="answer"
        label="Your answer"
        value={draft}
        placeholder="Your answer, like x = 4"
        disabled={solved}
        onChange={(v) => {
          setDraft(v);
          setShowFeedback(false);
        }}
        onSubmit={submit}
      />

      <div className="problem__actions">
        <button type="button" className="btn btn--primary" onClick={submit} disabled={solved || !draft.trim()}>
          Check my answer
        </button>
        <button type="button" className="btn btn--quiet" onClick={() => onHint(problem.problem_id)} disabled={solved}>
          I need a hint
        </button>
      </div>

      <p className={`problem__feedback${fb ? ` problem__feedback--${fb.tone}` : ""}`} role="status">
        {fb?.text ?? ""}
      </p>
    </section>
  );
}
