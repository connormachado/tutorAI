"""R-14 student state: the persistent personality file with consent gating.

The in-memory state holds the full profile for the session. What reaches
disk is gated: without parent consent only the session-scoped minimum is
written (identity + counters, no profile content). All writes are atomic;
every save keeps a timestamped backup of the previous file.
"""

import contextlib
import os
from datetime import UTC, datetime
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, field_validator

from platy.skills.skill_map import SkillMap

SCHEMA_VERSION = 1
_MAX_BACKUPS_PER_STUDENT = 10


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Consent(BaseModel):
    """Parent-consent record. V1 demo is 13+ (R-36), so this stays false
    until the post-demo parent track lands; the field is kept for then."""

    model_config = ConfigDict(extra="forbid")

    parent_consented: bool = False
    consented_at: datetime | None = None
    consent_note: str = Field(default="", max_length=140)


class SessionSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str = Field(min_length=1)
    ended_at: datetime
    summary: str = Field(min_length=1, max_length=280)
    nodes_touched: list[str] = Field(default_factory=list)


def _empty_summaries() -> list[SessionSummary]:
    """Typed factory: pyright strict can't infer list[SessionSummary] from bare list."""
    return []


class StudentState(BaseModel):
    """Persistent profile for one child. `confidence` maps every skill-map
    node id to a mastery estimate in [0.0, 1.0], or None if never assessed."""

    model_config = ConfigDict(extra="forbid")

    schema_version: int = Field(default=SCHEMA_VERSION, frozen=True)
    student_id: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    display_name: str = Field(min_length=1)
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)
    consent: Consent = Field(default_factory=Consent)
    confidence: dict[str, float | None] = Field(default_factory=dict)
    interests: list[str] = Field(default_factory=list)
    communication_prefs: dict[str, str] = Field(default_factory=dict)
    notes: list[str] = Field(default_factory=list)
    session_summaries: list[SessionSummary] = Field(default_factory=_empty_summaries)
    sessions_completed: int = Field(default=0, ge=0)

    @field_validator("confidence")
    @classmethod
    def _clamp_confidence(cls, v: dict[str, float | None]) -> dict[str, float | None]:
        return {k: (None if x is None else min(1.0, max(0.0, x))) for k, x in v.items()}

    @field_validator("interests")
    @classmethod
    def _dedupe_interests(cls, v: list[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for item in v:
            key = item.strip().casefold()
            if key and key not in seen:
                seen.add(key)
                out.append(item.strip())
            if len(out) >= 15:
                break
        return out

    @field_validator("interests")
    @classmethod
    def _interest_length(cls, v: list[str]) -> list[str]:
        for item in v:
            if len(item) > 60:
                raise ValueError(f"interest too long (>60 chars): {item!r}")
        return v

    @field_validator("notes")
    @classmethod
    def _notes_caps(cls, v: list[str]) -> list[str]:
        if len(v) > 20:
            raise ValueError(f"too many notes ({len(v)} > 20)")
        for item in v:
            if len(item) > 140:
                raise ValueError(f"note too long (>140 chars): {item!r}")
        return v

    @field_validator("session_summaries")
    @classmethod
    def _summaries_newest_five(cls, v: list[SessionSummary]) -> list[SessionSummary]:
        return v[-5:]

    def touch(self) -> None:
        """Bump updated_at. Call after mutating the state."""
        self.updated_at = _utcnow()


def create_state(student_id: str, display_name: str, skill_map: SkillMap) -> StudentState:
    """New-student state: every node unassessed, consent off, counters zero."""
    return StudentState(
        student_id=student_id,
        display_name=display_name,
        confidence={node.id: None for node in skill_map.nodes},
    )


def _stripped_for_unconsented(state: StudentState) -> StudentState:
    """Session-scoped minimum: identity + counters, no profile content."""
    return StudentState(
        student_id=state.student_id,
        display_name=state.display_name,
        created_at=state.created_at,
        updated_at=state.updated_at,
        consent=state.consent,
        sessions_completed=state.sessions_completed,
    )


def _prune_backups(backup_dir: Path, student_id: str) -> None:
    backups = sorted(backup_dir.glob(f"{student_id}.*.json"))
    for stale in backups[: max(0, len(backups) - _MAX_BACKUPS_PER_STUDENT)]:
        stale.unlink()


def save_state(state: StudentState, path: str | Path) -> Path:
    """Atomically write state to `path`. Without parent consent only the
    session-scoped minimum is persisted. Keeps a timestamped backup of the
    previous file (max 10 per student) in `<dir>/.backups/`."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    if path.exists():
        backup_dir = path.parent / ".backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        stamp = _utcnow().strftime("%Y%m%dT%H%M%S%f")
        backup = backup_dir / f"{state.student_id}.{stamp}.json"
        backup.write_bytes(path.read_bytes())
        _prune_backups(backup_dir, state.student_id)

    to_write = state if state.consent.parent_consented else _stripped_for_unconsented(state)
    payload = to_write.model_dump_json(indent=2).encode("utf-8")

    tmp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        with open(tmp, "wb") as f:
            f.write(payload)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    finally:
        with contextlib.suppress(FileNotFoundError):
            tmp.unlink()
    return path


def load_state(path: str | Path, skill_map: SkillMap) -> StudentState:
    """Load state from `path`. Unknown confidence keys raise; nodes missing
    from the file are added as None (never assessed)."""
    path = Path(path)
    state = StudentState.model_validate_json(path.read_text(encoding="utf-8"))
    known = {node.id for node in skill_map.nodes}
    unknown = [k for k in state.confidence if k not in known]
    if unknown:
        raise ValueError(f"unknown skill-map node ids in {path}: {sorted(unknown)}")
    for node_id in known:
        state.confidence.setdefault(node_id, None)
    return state
