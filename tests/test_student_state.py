"""R-14 student-state tests: clamping, dedup, caps, truncation, unknown-node
rejection, consent gating, and atomic-write crash behavior."""

import json
import os
from datetime import UTC
from pathlib import Path

import pytest

from platy.skills.skill_map import load_skill_map
from platy.student_state import (
    Consent,
    SessionSummary,
    StudentState,
    create_state,
    load_state,
    save_state,
)


@pytest.fixture()
def skill_map():
    return load_skill_map()


@pytest.fixture()
def state(skill_map):
    return create_state("test-student", "Test Student", skill_map)


def _summary(i: int) -> SessionSummary:
    from datetime import datetime

    return SessionSummary(
        session_id=f"s{i}",
        ended_at=datetime.now(UTC),
        summary=f"summary {i}",
        nodes_touched=[],
    )


class TestConfidence:
    def test_clamped_to_unit_interval(self, state):
        s = StudentState(
            student_id="x",
            display_name="X",
            confidence={"a": 2.5, "b": -0.3, "c": 0.7, "d": None},
        )
        assert s.confidence == {"a": 1.0, "b": 0.0, "c": 0.7, "d": None}

    def test_create_state_all_none(self, state, skill_map):
        assert set(state.confidence) == {n.id for n in skill_map.nodes}
        assert all(v is None for v in state.confidence.values())


class TestInterests:
    def test_dedup_case_insensitive(self):
        s = StudentState(
            student_id="x",
            display_name="X",
            interests=["Soccer", "soccer", "SOCCER", "Chess"],
        )
        assert s.interests == ["Soccer", "Chess"]

    def test_cap_15(self):
        s = StudentState(student_id="x", display_name="X", interests=[f"i{i}" for i in range(30)])
        assert len(s.interests) == 15

    def test_max_60_chars(self):
        with pytest.raises(ValueError, match="too long"):
            StudentState(student_id="x", display_name="X", interests=["x" * 61])


class TestNotes:
    def test_cap_20(self):
        with pytest.raises(ValueError, match="too many notes"):
            StudentState(student_id="x", display_name="X", notes=[f"n{i}" for i in range(21)])

    def test_max_140_chars(self):
        with pytest.raises(ValueError, match="too long"):
            StudentState(student_id="x", display_name="X", notes=["x" * 141])


class TestSummaries:
    def test_newest_five_kept(self):
        s = StudentState(
            student_id="x",
            display_name="X",
            session_summaries=[_summary(i) for i in range(8)],
        )
        assert [x.session_id for x in s.session_summaries] == [f"s{i}" for i in range(3, 8)]

    def test_summary_max_280_chars(self):
        from datetime import datetime

        with pytest.raises(ValueError):
            SessionSummary(
                session_id="s",
                ended_at=datetime.now(UTC),
                summary="x" * 281,
                nodes_touched=[],
            )


class TestLoad:
    def test_unknown_node_rejected(self, skill_map, tmp_path):
        p = tmp_path / "s.json"
        bad = StudentState(
            student_id="x", display_name="X", confidence={"nope": 0.5}
        ).model_dump_json()
        p.write_text(bad)
        with pytest.raises(ValueError, match="unknown skill-map node ids"):
            load_state(p, skill_map)

    def test_missing_nodes_added_as_none(self, skill_map, tmp_path):
        p = tmp_path / "s.json"
        p.write_text(StudentState(student_id="x", display_name="X").model_dump_json())
        loaded = load_state(p, skill_map)
        assert set(loaded.confidence) == {n.id for n in skill_map.nodes}
        assert all(v is None for v in loaded.confidence.values())


class TestConsentGating:
    def test_unconsented_writes_minimum_only(self, state, tmp_path):
        state.interests = ["Soccer"]
        state.notes = ["likes word problems"]
        state.confidence["two_step_equations"] = 0.8
        state.session_summaries = [_summary(0)]
        p = save_state(state, tmp_path / "s.json")
        raw = json.loads(p.read_text())
        assert raw["interests"] == []
        assert raw["notes"] == []
        assert raw["confidence"] == {}
        assert raw["communication_prefs"] == {}
        assert raw["session_summaries"] == []
        # identity + counters survive
        assert raw["student_id"] == "test-student"
        assert raw["display_name"] == "Test Student"
        assert raw["sessions_completed"] == 0

    def test_consented_writes_everything(self, state, tmp_path):
        state.consent = Consent(parent_consented=True)
        state.interests = ["Soccer"]
        state.confidence["two_step_equations"] = 0.8
        p = save_state(state, tmp_path / "s.json")
        raw = json.loads(p.read_text())
        assert raw["interests"] == ["Soccer"]
        assert raw["confidence"]["two_step_equations"] == 0.8


class TestAtomicWrite:
    def test_crash_mid_write_keeps_old_file(self, state, tmp_path, monkeypatch):
        p = tmp_path / "s.json"
        save_state(state, p)
        before = p.read_bytes()

        def boom(*args, **kwargs):
            raise RuntimeError("simulated crash")

        monkeypatch.setattr(os, "replace", boom)
        with pytest.raises(RuntimeError, match="simulated crash"):
            save_state(state, p)
        assert p.read_bytes() == before

    def test_backup_kept_max_10(self, state, tmp_path):
        p = tmp_path / "s.json"
        for _ in range(12):
            save_state(state, p)
        backups = list((tmp_path / ".backups").glob("test-student.*.json"))
        assert len(backups) == 10


class TestExample:
    def test_example_round_trips(self, skill_map, tmp_path):
        p = Path(__file__).resolve().parent.parent / "data" / "students" / "example.json"
        assert p.exists(), "data/students/example.json must exist"
        loaded = load_state(p, skill_map)
        assert loaded.consent.parent_consented is True
        reloaded_path = tmp_path / "roundtrip.json"
        save_state(loaded, reloaded_path)
        original = json.loads(p.read_text())
        roundtripped = json.loads(reloaded_path.read_text())
        original.pop("updated_at")
        roundtripped.pop("updated_at")
        assert original == roundtripped
