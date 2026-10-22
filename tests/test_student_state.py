"""R-14 student state: validation, skill-map fitting, the consent gate and codes-only errors."""

import json
import traceback
from datetime import UTC, datetime
from typing import Any

import pytest
from pydantic import ValidationError

from platy.skills.skill_map import load_skill_map
from platy.student_state import (
    Consent,
    SessionRecord,
    StudentState,
    StudentStateError,
    create_state,
    load_example_state,
    parse_state,
    persistable,
    revalidated,
)

SKILL_MAP = load_skill_map()
NODE_IDS = [node.id for node in SKILL_MAP.nodes]
NOW = datetime(2026, 10, 22, 12, 0, tzinfo=UTC)
NAIVE = datetime(2026, 10, 22, 12, 0)
# Planted profile content: it must never reach an error message (P-10).
SECRET = "canary-7f3a9c"
SHORT_LISTS = ["interests", "motivational_hooks", "sensitive_topics_to_avoid"]


def state_data(**overrides: Any) -> dict[str, Any]:
    data: dict[str, Any] = {
        "student_id": "test-student",
        "display_name": "Test Student",
        "created_at": NOW.isoformat(),
        "updated_at": NOW.isoformat(),
    }
    return data | overrides


def error_text(err: BaseException) -> str:
    return str(err) + repr(err) + "".join(traceback.format_exception(err))


def test_confidence_clamped_to_unit_interval() -> None:
    state = StudentState.model_validate(
        state_data(confidence={"a": 2.5, "b": -0.3, "c": 0.7, "d": None})
    )
    assert state.confidence == {"a": 1.0, "b": 0.0, "c": 0.7, "d": None}


@pytest.mark.parametrize(
    "overrides",
    [
        {"confidence": {"one_step_equations": float("nan")}},
        {"confidence": {"one_step_equations": float("inf")}},
        {"created_at": NAIVE},
        {"updated_at": NAIVE},
        {"consent": {"parent_consented": True, "consented_at": NAIVE}},
        {"session_records": [{"session_id": "s1", "ended_at": NAIVE}]},
        {"consent": {"parent_consented": True}},
        {"schema_version": 2},
        {"student_id": "Test Student"},
        {"session_records": [{"session_id": "s 1", "ended_at": NOW}]},
        {"notes": [f"n{i}" for i in range(21)]},
        {"notes": ["x" * 141]},
        {"sessions_completed": -1},
        {"student_id": "a" * 65},
        {"session_records": [{"session_id": "a" * 65, "ended_at": NOW}]},
        {"display_name": "x" * 61},
        {"display_name": "   "},
        {"communication_prefs": {f"k{i}": "v" for i in range(16)}},
        {"communication_prefs": {"x" * 61: "v"}},
        {"communication_prefs": {"openings": "x" * 61}},
        {"mood": "happy"},
    ],
    ids=[
        "nan confidence",
        "inf confidence",
        "naive created_at",
        "naive updated_at",
        "naive consented_at",
        "naive ended_at",
        "consent without consented_at",
        "schema_version 2",
        "student_id not an id",
        "session_id not an id",
        "21 notes",
        "141-char note",
        "negative session count",
        "65-char student_id",
        "65-char session_id",
        "61-char display_name",
        "blank display_name",
        "16 prefs",
        "61-char pref key",
        "61-char pref value",
        "extra field",
    ],
)
def test_state_rejects(overrides: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        StudentState.model_validate(state_data(**overrides))


@pytest.mark.parametrize("field", SHORT_LISTS)
def test_short_list_drops_case_insensitive_repeats(field: str) -> None:
    state = StudentState.model_validate(
        state_data(**{field: ["Soccer", " soccer", "SOCCER", "Chess"]})
    )
    assert getattr(state, field) == ["Soccer", "Chess"]


@pytest.mark.parametrize("field", SHORT_LISTS)
def test_short_list_takes_fifteen(field: str) -> None:
    items = [f"item {i}" for i in range(15)]
    assert getattr(StudentState.model_validate(state_data(**{field: items})), field) == items


@pytest.mark.parametrize("field", SHORT_LISTS)
@pytest.mark.parametrize(
    "items",
    [[f"item {i}" for i in range(16)], ["x" * 61], [""], ["   "]],
    ids=["16 items", "61 chars", "empty", "blank"],
)
def test_short_list_rejects_rather_than_truncates(field: str, items: list[str]) -> None:
    with pytest.raises(ValidationError):
        StudentState.model_validate(state_data(**{field: items}))


def test_session_records_keep_newest_five() -> None:
    records = [{"session_id": f"s{i}", "ended_at": NOW} for i in range(8)]
    state = StudentState.model_validate(state_data(session_records=records))
    assert [r.session_id for r in state.session_records] == ["s3", "s4", "s5", "s6", "s7"]


def test_create_state_every_node_unassessed_in_map_order() -> None:
    state = create_state("test-student", "Test Student", SKILL_MAP)
    assert list(state.confidence) == NODE_IDS
    assert all(v is None for v in state.confidence.values())
    assert state.consent.parent_consented is False
    assert state.sessions_completed == 0


def test_parse_fills_missing_nodes_in_map_order() -> None:
    partial = {NODE_IDS[5]: 0.5, NODE_IDS[0]: 0.9}
    state = parse_state(json.dumps(state_data(confidence=partial)).encode(), SKILL_MAP)
    assert list(state.confidence) == NODE_IDS
    assert state.confidence[NODE_IDS[0]] == 0.9
    assert state.confidence[NODE_IDS[5]] == 0.5
    assert [state.confidence[n] for n in NODE_IDS[6:]] == [None] * len(NODE_IDS[6:])


def test_revalidated_catches_in_place_mutation() -> None:
    state = create_state("test-student", "Test Student", SKILL_MAP)
    state.interests.append("x" * 61)
    with pytest.raises(StudentStateError) as caught:
        revalidated(state, SKILL_MAP)
    assert caught.value.codes == ("interests.string_too_long",)


def test_revalidated_puts_confidence_in_map_order() -> None:
    state = create_state("test-student", "Test Student", SKILL_MAP)
    state.confidence = {node_id: None for node_id in reversed(NODE_IDS)}
    assert list(revalidated(state, SKILL_MAP).confidence) == NODE_IDS


def full_state(consent: Consent) -> StudentState:
    state = create_state("test-student", "Test Student", SKILL_MAP)
    state.consent = consent
    state.interests = ["Soccer"]
    state.motivational_hooks = ["Beating a personal best"]
    state.sensitive_topics_to_avoid = ["Pets"]
    state.communication_prefs = {"openings": "direct"}
    state.notes = ["Rushes through negative signs."]
    state.confidence["two_step_equations"] = 0.8
    state.session_records = [SessionRecord(session_id="s1", ended_at=NOW, skill_ids=[])]
    state.sessions_completed = 3
    return state


def test_persistable_without_consent_is_the_session_minimum() -> None:
    # Revoked by flipping the flag only: the old timestamp and note must not survive.
    state = full_state(Consent(consented_at=NOW, consent_note="Revoked."))
    assert persistable(state) == StudentState(
        student_id="test-student",
        display_name="Test Student",
        created_at=state.created_at,
        updated_at=state.updated_at,
        consent=Consent(),
        sessions_completed=3,
    )


def test_persistable_with_consent_is_everything() -> None:
    state = full_state(Consent(parent_consented=True, consented_at=NOW))
    assert persistable(state) == state


def test_example_is_a_consented_fake_profile() -> None:
    example = load_example_state(SKILL_MAP)
    assert example.consent.parent_consented is True
    assert list(example.confidence) == NODE_IDS
    assert example.motivational_hooks
    assert example.sensitive_topics_to_avoid


@pytest.mark.parametrize(
    "overrides",
    [
        {"interests": [SECRET * 10]},
        {"motivational_hooks": [SECRET * 10]},
        {"sensitive_topics_to_avoid": [SECRET * 10]},
        {"notes": [SECRET * 20]},
        {"communication_prefs": {"openings": [SECRET]}},
        {"communication_prefs": {"openings": SECRET * 10}},
        {"display_name": SECRET * 10},
        {"consent": {"consent_note": SECRET * 20}},
        {"consent": {"parent_consented": True, "consent_note": SECRET}},
        {"student_id": f"{SECRET} X"},
        {"confidence": {"two_step_equations": SECRET}},
    ],
    ids=[
        "interest",
        "hook",
        "topic",
        "note",
        "pref",
        "long pref",
        "display_name",
        "consent note",
        "undated consent",
        "student_id",
        "confidence value",
    ],
)
def test_model_errors_hide_planted_secret(overrides: dict[str, Any]) -> None:
    with pytest.raises(ValidationError) as caught:
        StudentState.model_validate(state_data(**overrides))
    assert SECRET not in error_text(caught.value)


@pytest.mark.parametrize(
    ("data", "codes"),
    [
        (state_data(interests=[SECRET * 10]), ("interests.string_too_long",)),
        (state_data(confidence={SECRET: 0.5}), ("unknown_skill_id",)),
        (state_data(confidence={SECRET: "high"}), ("confidence.float_parsing",)),
        (state_data() | {SECRET: 1}, ("extra_forbidden",)),
        (
            state_data(
                session_records=[
                    {"session_id": "s1", "ended_at": NOW.isoformat(), "skill_ids": [SECRET]}
                ]
            ),
            ("unknown_skill_id",),
        ),
        (
            state_data(consent={"parent_consented": True, "consent_note": SECRET}),
            ("consent.value_error",),
        ),
    ],
    ids=[
        "value",
        "unknown key",
        "bad value under key",
        "extra field",
        "record skill id",
        "consent",
    ],
)
def test_parse_errors_carry_codes_not_content(data: dict[str, Any], codes: tuple[str, ...]) -> None:
    with pytest.raises(StudentStateError) as caught:
        parse_state(json.dumps(data).encode(), SKILL_MAP)
    assert caught.value.codes == codes
    assert SECRET not in error_text(caught.value)
    assert caught.value.__context__ is None


@pytest.mark.parametrize("field", ["created_at", "updated_at"])
def test_parse_refuses_missing_timestamps_rather_than_inventing_them(field: str) -> None:
    data = state_data()
    del data[field]
    with pytest.raises(StudentStateError) as caught:
        parse_state(json.dumps(data).encode(), SKILL_MAP)
    assert caught.value.codes == (f"{field}.missing",)


def test_parse_broken_json_carries_codes_not_content() -> None:
    broken = json.dumps(state_data(display_name=SECRET * 3))[:-20].encode()
    with pytest.raises(StudentStateError) as caught:
        parse_state(broken, SKILL_MAP)
    assert caught.value.codes == ("json_invalid",)
    assert SECRET not in error_text(caught.value)
