"""One session's tutoring state: ids, counts and flags, never what anyone said (P-1). Pure.

Attempts are counted here, never taken from the model: an attempt is a student message sent
while a problem is active (R-02). Transitions never change the state they're given.
"""

from pydantic import BaseModel, ConfigDict, Field

from platy.session.tutor import TutorAction, TutorTurn

TURN_CAP = 40


class SessionOver(RuntimeError):
    def __init__(self) -> None:
        super().__init__("session_over")


class SessionState(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, hide_input_in_errors=True)

    turn_index: int = 0  # tutor turns shown, fallback lines included
    turn_cap: int = Field(default=TURN_CAP, ge=1)
    active_node_id: str | None = None
    active_problem_id: str | None = None
    # (problem id, attempts) for each problem presented, in order. A tuple, so no copy of the
    # state can change another's counts.
    attempt_counts: tuple[tuple[str, int], ...] = ()
    nodes_touched: tuple[str, ...] = ()
    review_node_id: str | None = None  # R-04's one review; the scheduler (R-12) will pick it
    review_done: bool = False
    metacognition_done: bool = False  # R-30
    closed: bool = False

    @property
    def attempts(self) -> dict[str, int]:
        return dict(self.attempt_counts)

    @property
    def attempts_on_active(self) -> int:
        if self.active_problem_id is None:
            return 0
        return self.attempts.get(self.active_problem_id, 0)

    @property
    def turns_left(self) -> int:
        return max(0, self.turn_cap - self.turn_index)

    @property
    def is_over(self) -> bool:
        return self.closed or self.turns_left == 0


def start_session(review_node_id: str | None, turn_cap: int = TURN_CAP) -> SessionState:
    return SessionState(review_node_id=review_node_id, turn_cap=turn_cap)


def record_student_message(state: SessionState) -> SessionState:
    """Count an attempt if a problem is active. After the session ends a message changes
    nothing; the turn loop still runs safety on it first."""
    if state.is_over or state.active_problem_id is None:
        return state
    attempts = state.attempts | {state.active_problem_id: state.attempts_on_active + 1}
    return state.model_copy(update={"attempt_counts": tuple(attempts.items())})


def record_tutor_turn(state: SessionState, turn: TutorTurn) -> SessionState:
    """Record a turn the student saw. It has passed policy/checks.py, so its ids are real and
    the problem belongs to the node."""
    _require_open(state)
    attempts = state.attempts
    if turn.active_problem_id is not None:
        attempts.setdefault(turn.active_problem_id, 0)
    nodes = state.nodes_touched
    if turn.active_node_id is not None and turn.active_node_id not in nodes:
        nodes = (*nodes, turn.active_node_id)
    reviewed = turn.action is TutorAction.REVIEW_PRIOR and state.review_node_id in (
        None,
        turn.active_node_id,
    )
    return state.model_copy(
        update={
            "turn_index": state.turn_index + 1,
            "active_node_id": turn.active_node_id,
            "active_problem_id": turn.active_problem_id,
            "attempt_counts": tuple(attempts.items()),
            "nodes_touched": nodes,
            "review_done": state.review_done or reviewed,
            "metacognition_done": state.metacognition_done
            or turn.action is TutorAction.CHECK_CONFIDENCE,
            "closed": state.closed or turn.action is TutorAction.CLOSE_SESSION,
        }
    )


def record_fallback(state: SessionState) -> SessionState:
    """The fixed recovery line was shown instead of a turn: one turn used, nothing else."""
    _require_open(state)
    return state.model_copy(update={"turn_index": state.turn_index + 1})


def _require_open(state: SessionState) -> None:
    if state.is_over:
        raise SessionOver
