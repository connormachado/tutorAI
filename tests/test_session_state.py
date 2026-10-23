import pytest

from platy.session.state import (
    SessionOver,
    SessionState,
    record_fallback,
    record_student_message,
    record_tutor_turn,
    start_session,
)
from platy.session.tutor import TutorAction, TutorTurn


def tutor(action: TutorAction, problem: str | None = None, node: str | None = None) -> TutorTurn:
    if problem is not None and node is None:
        node = problem.split(".")[0]
    return TutorTurn(
        message="A tutor message.",
        action=action,
        active_node_id=node,
        active_problem_id=problem,
        rationale="",
    )


def test_attempts_count_student_messages_on_active_problem() -> None:
    state = start_session(review_node_id=None)
    state = record_tutor_turn(state, tutor(TutorAction.PRESENT_PROBLEM, "two_step_equations.1"))
    assert state.attempts_on_active == 0
    state = record_student_message(state)
    state = record_student_message(state)
    assert state.attempts_on_active == 2
    assert state.attempts == {"two_step_equations.1": 2}


def test_a_message_with_no_active_problem_is_not_an_attempt() -> None:
    state = record_tutor_turn(start_session(review_node_id=None), tutor(TutorAction.GREET))
    state = record_student_message(state)
    assert state.attempts == {}
    assert state.attempts_on_active == 0


def test_attempts_survive_a_detour_to_a_prerequisite() -> None:
    state = start_session(review_node_id=None)
    state = record_tutor_turn(state, tutor(TutorAction.PRESENT_PROBLEM, "two_step_equations.1"))
    state = record_student_message(state)
    state = record_tutor_turn(state, tutor(TutorAction.PROBE_PREREQUISITE, "one_step_equations.2"))
    assert state.attempts_on_active == 0
    state = record_student_message(state)
    state = record_tutor_turn(state, tutor(TutorAction.GIVE_HINT, "two_step_equations.1"))
    assert state.attempts_on_active == 1
    state = record_student_message(state)
    assert state.attempts == {"two_step_equations.1": 2, "one_step_equations.2": 1}


def test_presenting_a_problem_again_keeps_its_count() -> None:
    """The session counts attempts; nothing the tutor sends resets them."""
    state = start_session(review_node_id=None)
    state = record_tutor_turn(state, tutor(TutorAction.PRESENT_PROBLEM, "two_step_equations.1"))
    state = record_student_message(state)
    state = record_tutor_turn(state, tutor(TutorAction.PRESENT_PROBLEM, "two_step_equations.1"))
    assert state.attempts_on_active == 1


def test_nodes_touched_in_order_once_each() -> None:
    state = start_session(review_node_id=None)
    for problem in ["two_step_equations.1", "one_step_equations.2", "two_step_equations.1"]:
        state = record_tutor_turn(state, tutor(TutorAction.PRESENT_PROBLEM, problem))
    state = record_tutor_turn(state, tutor(TutorAction.RETEACH, node="inverse_operations"))
    assert state.nodes_touched == ("two_step_equations", "one_step_equations", "inverse_operations")


def test_review_counts_only_for_the_chosen_node() -> None:
    state = start_session(review_node_id="fraction_operations")
    other = record_tutor_turn(state, tutor(TutorAction.REVIEW_PRIOR, node="integer_arithmetic"))
    assert other.review_done is False
    chosen = record_tutor_turn(state, tutor(TutorAction.REVIEW_PRIOR, node="fraction_operations"))
    assert chosen.review_done is True


def test_attempts_cannot_be_changed_from_outside() -> None:
    state = record_tutor_turn(
        start_session(review_node_id=None),
        tutor(TutorAction.PRESENT_PROBLEM, "two_step_equations.1"),
    )
    later = record_fallback(state)
    state.attempts["two_step_equations.1"] = 9
    assert state.attempts_on_active == 0
    assert later.attempts == {"two_step_equations.1": 0}


def test_errors_hide_state_input() -> None:
    with pytest.raises(ValueError) as err:
        SessionState(review_node_id="canary-7f3a", turn_cap="canary-7f3a")  # pyright: ignore[reportArgumentType]
    assert "canary-7f3a" not in str(err.value)


@pytest.mark.parametrize(
    ("action", "flag"),
    [
        (TutorAction.CHECK_CONFIDENCE, "metacognition_done"),
        (TutorAction.REVIEW_PRIOR, "review_done"),
        (TutorAction.CLOSE_SESSION, "closed"),
    ],
)
def test_actions_set_their_flags(action: TutorAction, flag: str) -> None:
    state = start_session(review_node_id=None)
    assert getattr(state, flag) is False
    assert getattr(record_tutor_turn(state, tutor(action)), flag) is True


def test_start_session() -> None:
    state = start_session(review_node_id="fraction_operations")
    assert state.review_node_id == "fraction_operations"
    assert state.turn_cap == 40
    assert (state.turn_index, state.turns_left, state.is_over) == (0, 40, False)


def test_turn_cap_ends_the_session() -> None:
    state = start_session(review_node_id=None, turn_cap=2)
    state = record_tutor_turn(state, tutor(TutorAction.GREET))
    state = record_fallback(state)
    assert (state.turn_index, state.turns_left, state.is_over) == (2, 0, True)
    with pytest.raises(SessionOver):
        record_tutor_turn(state, tutor(TutorAction.GREET))
    # A message after the end is no attempt, and never an error: safety still screens it first.
    assert record_student_message(state) == state


def test_a_closed_session_takes_nothing_more() -> None:
    state = record_tutor_turn(start_session(review_node_id=None), tutor(TutorAction.CLOSE_SESSION))
    assert state.is_over
    with pytest.raises(SessionOver) as err:
        record_fallback(state)
    assert str(err.value) == "session_over"


def test_a_fallback_counts_a_turn_and_changes_nothing_else() -> None:
    state = start_session(review_node_id=None)
    state = record_tutor_turn(state, tutor(TutorAction.PRESENT_PROBLEM, "two_step_equations.1"))
    after = record_fallback(state)
    assert after.turn_index == state.turn_index + 1
    assert after.model_dump(exclude={"turn_index"}) == state.model_dump(exclude={"turn_index"})


def test_transitions_never_change_the_state_they_are_given() -> None:
    state = record_tutor_turn(
        start_session(review_node_id=None),
        tutor(TutorAction.PRESENT_PROBLEM, "two_step_equations.1"),
    )
    before = state.model_dump()
    record_student_message(state)
    record_tutor_turn(state, tutor(TutorAction.CHECK_CONFIDENCE))
    assert state.model_dump() == before


def test_rejects_a_turn_cap_below_one() -> None:
    with pytest.raises(ValueError):
        SessionState(turn_cap=0)
