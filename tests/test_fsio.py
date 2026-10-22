"""R-14 persistence: atomic writes, the consent gate on disk, backups and the revoke purge."""

import json
import os
import stat
import traceback
from datetime import UTC, datetime
from importlib.resources import files
from pathlib import Path
from typing import Any

import pytest

from platy.fsio import atomic_write, load_state, save_state
from platy.skills.skill_map import load_skill_map
from platy.student_state import (
    Consent,
    SessionRecord,
    StudentState,
    StudentStateError,
    create_state,
    load_example_state,
)

SKILL_MAP = load_skill_map()
NODE_IDS = [node.id for node in SKILL_MAP.nodes]
NOW = datetime(2026, 10, 22, 12, 0, tzinfo=UTC)
# Planted profile content: it must never reach an error, or disk once consent is gone.
SECRET = "canary-5d2e8b"


def consented() -> Consent:
    return Consent(parent_consented=True, consented_at=NOW)


def full_state(consent: Consent, student_id: str = "test-student") -> StudentState:
    """A profile with the canary in every free-text field."""
    state = create_state(student_id, "Test Student", SKILL_MAP)
    state.consent = consent
    state.interests = [f"{SECRET} interest"]
    state.motivational_hooks = [f"{SECRET} hook"]
    state.sensitive_topics_to_avoid = [f"{SECRET} topic"]
    state.communication_prefs = {"openings": f"{SECRET} pref"}
    state.notes = [f"{SECRET} note"]
    state.confidence["two_step_equations"] = 0.8
    state.session_records = [
        SessionRecord(session_id="s1", ended_at=NOW, skill_ids=["two_step_equations"])
    ]
    return state


def snapshot(directory: Path) -> dict[Path, bytes]:
    return {p: p.read_bytes() for p in directory.rglob("*") if p.is_file()}


def canary_on_disk(directory: Path) -> bool:
    return any(SECRET.encode() in data for data in snapshot(directory).values())


def error_text(err: BaseException) -> str:
    return str(err) + repr(err) + "".join(traceback.format_exception(err))


def saved_json(directory: Path, student_id: str = "test-student") -> dict[str, Any]:
    return json.loads((directory / f"{student_id}.json").read_text(encoding="utf-8"))


def test_example_round_trips_except_updated_at(tmp_path: Path) -> None:
    example = load_example_state(SKILL_MAP)
    save_state(example, tmp_path, SKILL_MAP)

    loaded = load_state(tmp_path, example.student_id, SKILL_MAP)
    assert loaded.updated_at > example.updated_at
    assert loaded.model_copy(update={"updated_at": example.updated_at}) == example

    packaged = files("platy") / "data" / "example_student.json"
    original = json.loads(packaged.read_text(encoding="utf-8"))
    saved = saved_json(tmp_path, example.student_id)
    original.pop("updated_at")
    saved.pop("updated_at")
    assert saved == original


def test_unconsented_save_writes_only_the_session_minimum(tmp_path: Path) -> None:
    state = full_state(Consent())
    state.sessions_completed = 2
    save_state(state, tmp_path, SKILL_MAP)
    save_state(state, tmp_path, SKILL_MAP)

    raw = saved_json(tmp_path)
    for field in ("interests", "motivational_hooks", "sensitive_topics_to_avoid", "notes"):
        assert raw[field] == []
    assert raw["communication_prefs"] == {}
    assert raw["confidence"] == dict.fromkeys(NODE_IDS)
    assert raw["session_records"] == []
    assert raw["consent"] == Consent().model_dump()
    assert (raw["student_id"], raw["display_name"]) == ("test-student", "Test Student")
    assert raw["sessions_completed"] == 2
    assert not canary_on_disk(tmp_path)
    assert list(snapshot(tmp_path)) == [tmp_path / "test-student.json"]


def test_consented_save_writes_everything(tmp_path: Path) -> None:
    state = full_state(consented())
    save_state(state, tmp_path, SKILL_MAP)
    loaded = load_state(tmp_path, "test-student", SKILL_MAP)
    assert loaded.model_copy(update={"updated_at": state.updated_at}) == state


def test_saved_confidence_follows_map_order(tmp_path: Path) -> None:
    state = full_state(consented())
    state.confidence = {node_id: None for node_id in reversed(NODE_IDS)}
    save_state(state, tmp_path, SKILL_MAP)
    assert list(saved_json(tmp_path)["confidence"]) == NODE_IDS


def test_consented_saves_keep_the_newest_ten_backups(tmp_path: Path) -> None:
    state = full_state(consented())
    for _ in range(12):
        save_state(state, tmp_path, SKILL_MAP)
    backups = sorted(p.name for p in (tmp_path / ".backups").iterdir())
    assert backups == [f"test-student.{n:06d}.json" for n in range(2, 12)]


def test_revoking_consent_purges_backups(tmp_path: Path) -> None:
    state = full_state(consented())
    other = full_state(consented(), student_id="other-student")
    for _ in range(3):
        save_state(state, tmp_path, SKILL_MAP)
        save_state(other, tmp_path, SKILL_MAP)
    assert any(SECRET.encode() in p.read_bytes() for p in (tmp_path / ".backups").iterdir())

    state.consent = Consent()
    save_state(state, tmp_path, SKILL_MAP)

    assert list((tmp_path / ".backups").glob("test-student.*")) == []
    assert SECRET.encode() not in (tmp_path / "test-student.json").read_bytes()
    assert len(list((tmp_path / ".backups").glob("other-student.*"))) == 2


def test_revoke_also_purges_temp_files_a_crash_left_behind(tmp_path: Path) -> None:
    save_state(full_state(consented()), tmp_path, SKILL_MAP)
    save_state(full_state(consented(), student_id="other-student"), tmp_path, SKILL_MAP)
    orphans = [
        tmp_path / ".test-student.json.x1.tmp",
        tmp_path / ".backups" / ".test-student.000002.json.x2.tmp",
    ]
    others = [
        tmp_path / ".other-student.json.x3.tmp",
        tmp_path / ".backups" / ".other-student.000002.json.x4.tmp",
    ]
    (tmp_path / ".backups").mkdir()
    for orphan in orphans + others:
        orphan.write_bytes(SECRET.encode())

    save_state(full_state(Consent()), tmp_path, SKILL_MAP)

    assert not any(p.exists() for p in orphans)
    assert all(p.exists() for p in others)


def test_revoke_with_an_invalid_profile_in_memory_still_purges(tmp_path: Path) -> None:
    state = full_state(consented())
    save_state(state, tmp_path, SKILL_MAP)
    save_state(state, tmp_path, SKILL_MAP)

    state.interests.append(SECRET * 10)
    state.confidence[SECRET] = 0.5
    state.consent = Consent()
    save_state(state, tmp_path, SKILL_MAP)

    assert not canary_on_disk(tmp_path)


def test_revoke_by_flipping_the_flag_drops_the_consent_record(tmp_path: Path) -> None:
    state = full_state(consented())
    state.consent = Consent(parent_consented=True, consented_at=NOW, consent_note=SECRET)
    save_state(state, tmp_path, SKILL_MAP)

    state.consent = state.consent.model_copy(update={"parent_consented": False})
    save_state(state, tmp_path, SKILL_MAP)

    assert saved_json(tmp_path)["consent"] == Consent().model_dump()
    assert not canary_on_disk(tmp_path)


def test_store_directories_are_owner_only(tmp_path: Path) -> None:
    store = tmp_path / "students"
    save_state(full_state(consented()), store, SKILL_MAP)
    save_state(full_state(consented()), store, SKILL_MAP)
    assert stat.S_IMODE(store.stat().st_mode) == 0o700
    assert stat.S_IMODE((store / ".backups").stat().st_mode) == 0o700


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("interests", ["Soccer", SECRET * 10]),
        ("motivational_hooks", [SECRET * 10]),
        ("sensitive_topics_to_avoid", [SECRET * 10]),
        ("notes", [SECRET] * 21),
        ("confidence", {SECRET: 0.5}),
        ("confidence", {"two_step_equations": float("nan")}),
        ("updated_at", datetime(2026, 10, 22, 12, 0)),
        (
            "consent",
            Consent.model_construct(parent_consented=True, consented_at=None, consent_note=SECRET),
        ),
        ("schema_version", 2),
        ("session_records", [SessionRecord(session_id="s2", ended_at=NOW, skill_ids=[SECRET])]),
        ("interests", SECRET),
        ("communication_prefs", {"openings": [SECRET]}),
    ],
    ids=[
        "long interest",
        "long hook",
        "long topic",
        "21 notes",
        "unknown confidence key",
        "nan confidence",
        "naive updated_at",
        "undated consent",
        "schema_version 2",
        "unknown record skill id",
        "interests not a list",
        "pref not a string",
    ],
)
def test_save_rejects_mutated_state_without_writing(
    tmp_path: Path, field: str, value: object, recwarn: pytest.WarningsRecorder
) -> None:
    state = full_state(consented())
    save_state(state, tmp_path, SKILL_MAP)
    before = snapshot(tmp_path)

    setattr(state, field, value)
    with pytest.raises(StudentStateError) as caught:
        save_state(state, tmp_path, SKILL_MAP)

    assert snapshot(tmp_path) == before
    assert SECRET not in error_text(caught.value)
    assert caught.value.__context__ is None
    assert not [w for w in recwarn if SECRET in str(w.message)]


def test_load_errors_carry_codes_not_content(tmp_path: Path) -> None:
    stored = json.loads(full_state(consented()).model_dump_json())
    (tmp_path / "test-student.json").write_text(json.dumps(stored | {SECRET: 1}))
    with pytest.raises(StudentStateError) as caught:
        load_state(tmp_path, "test-student", SKILL_MAP)
    assert caught.value.codes == ("extra_forbidden",)
    assert SECRET not in error_text(caught.value)


@pytest.mark.parametrize("student_id", ["../escape", "a/b", "", "Test", "test\n", "a" * 65])
def test_load_refuses_ids_outside_the_pattern(tmp_path: Path, student_id: str) -> None:
    with pytest.raises(StudentStateError):
        load_state(tmp_path, student_id, SKILL_MAP)


def test_atomic_write_is_owner_only(tmp_path: Path) -> None:
    target = tmp_path / "f.json"
    atomic_write(target, b"data")
    assert stat.S_IMODE(target.stat().st_mode) == 0o600


def test_atomic_write_crash_keeps_old_file_and_no_temp(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    target = tmp_path / "f.json"
    atomic_write(target, b"old")

    def crash(*_args: object) -> None:
        raise OSError("simulated crash")

    monkeypatch.setattr(os, "replace", crash)
    with pytest.raises(OSError, match="simulated crash"):
        atomic_write(target, b"new")

    assert target.read_bytes() == b"old"
    assert [p.name for p in tmp_path.iterdir()] == ["f.json"]
