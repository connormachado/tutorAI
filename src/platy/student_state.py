"""R-14 student state: one child's personality file, mastery estimates and session records.

Pure: the only file it reads is packaged data. platy.fsio does every read and write, and its
docstring covers what may reach disk and when. Errors carry codes, never profile content (P-10).
"""

from collections.abc import Iterable
from datetime import UTC, datetime
from importlib.resources import files
from typing import Annotated, Any, Literal, Self

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    ValidationError,
    field_validator,
    model_validator,
)

from platy.skills.skill_map import SkillMap

ID_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
ID_MAX_LENGTH = 64

# A lowercase slug, short enough that it can't smuggle a sentence into a record (P-8).
Id = Annotated[str, StringConstraints(max_length=ID_MAX_LENGTH, pattern=ID_PATTERN)]
# NaN and inf are rejected; finite values outside [0, 1] are clamped.
Estimate = Annotated[float, Field(allow_inf_nan=False)]
ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]
Note = Annotated[str, StringConstraints(max_length=140)]


class StudentStateError(ValueError):
    def __init__(self, codes: Iterable[str]) -> None:
        self.codes = tuple(sorted(set(codes)))
        super().__init__(", ".join(self.codes))


class Consent(BaseModel):
    """Parent consent. V1 is 13+ with no parent accounts (A-9 note), so it stays off until the
    post-demo parent track; the field is kept for then."""

    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    parent_consented: bool = False
    consented_at: AwareDatetime | None = None
    consent_note: str = Field(default="", max_length=140)

    @model_validator(mode="after")
    def _consent_is_dated(self) -> Self:
        if self.parent_consented and self.consented_at is None:
            raise ValueError("consented_at is required when parent_consented is true")
        return self


class SessionRecord(BaseModel):
    """One finished session. Structured only, never free text (P-8)."""

    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    session_id: Id
    ended_at: AwareDatetime
    skill_ids: list[str] = Field(default_factory=list)


def _no_records() -> list[SessionRecord]:
    """Typed factory: pyright strict can't infer list[SessionRecord] from bare list."""
    return []


class StudentState(BaseModel):
    """One child's persistent state. `confidence` maps each skill-map node id to a mastery
    estimate in [0, 1], or None if never assessed."""

    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    schema_version: Literal[1] = 1
    student_id: Id
    display_name: ShortText
    created_at: AwareDatetime
    updated_at: AwareDatetime
    consent: Consent = Field(default_factory=Consent)
    confidence: dict[str, Estimate | None] = Field(default_factory=dict)
    # The personality file (R-14). P-6 wants a fixed field allowlist with no free-form fields,
    # and these five are free text. Kept per Connor (2026-10-22); revisit with platy.store.
    interests: list[ShortText] = Field(default_factory=list, max_length=15)
    motivational_hooks: list[ShortText] = Field(default_factory=list, max_length=15)
    sensitive_topics_to_avoid: list[ShortText] = Field(default_factory=list, max_length=15)
    communication_prefs: dict[ShortText, ShortText] = Field(default_factory=dict, max_length=15)
    notes: list[Note] = Field(default_factory=list, max_length=20)
    session_records: list[SessionRecord] = Field(default_factory=_no_records)
    sessions_completed: int = Field(default=0, ge=0)

    @field_validator("confidence")
    @classmethod
    def _clamp(cls, v: dict[str, float | None]) -> dict[str, float | None]:
        return {k: None if x is None else min(1.0, max(0.0, x)) for k, x in v.items()}

    @field_validator("interests", "motivational_hooks", "sensitive_topics_to_avoid")
    @classmethod
    def _drop_repeats(cls, v: list[str]) -> list[str]:
        """Case-insensitive repeats go; the first spelling stays."""
        seen: set[str] = set()
        out: list[str] = []
        for item in v:
            if item.casefold() not in seen:
                seen.add(item.casefold())
                out.append(item)
        return out

    @field_validator("session_records")
    @classmethod
    def _newest_five(cls, v: list[SessionRecord]) -> list[SessionRecord]:
        return v[-5:]


def create_state(student_id: str, display_name: str, skill_map: SkillMap) -> StudentState:
    """A new child: every node unassessed, consent off, counters zero."""
    now = datetime.now(UTC)
    return StudentState(
        student_id=student_id,
        display_name=display_name,
        created_at=now,
        updated_at=now,
        confidence={node.id: None for node in skill_map.nodes},
    )


def _codes(err: ValidationError) -> list[str]:
    """Error types, prefixed with the field only when it's a declared one. The rest of a `loc` can
    hold dict keys or unknown field names, which are profile content."""
    codes: list[str] = []
    for detail in err.errors(include_url=False, include_context=False, include_input=False):
        field = detail["loc"][0] if detail["loc"] else None
        known = isinstance(field, str) and field in StudentState.model_fields
        codes.append(f"{field}.{detail['type']}" if known else detail["type"])
    return codes


def _fit_to_map(state: StudentState, skill_map: SkillMap) -> StudentState:
    """Refuse skill ids the map doesn't have, and give `confidence` one entry per node, in map
    order (never set order, so output doesn't depend on PYTHONHASHSEED)."""
    node_ids = [node.id for node in skill_map.nodes]
    used = set(state.confidence).union(*(r.skill_ids for r in state.session_records))
    if not used <= set(node_ids):
        raise StudentStateError(["unknown_skill_id"])
    confidence = {node_id: state.confidence.get(node_id) for node_id in node_ids}
    return state.model_copy(update={"confidence": confidence})


def _validated(data: bytes | dict[str, Any], skill_map: SkillMap) -> StudentState:
    """Validate a file's bytes or a dumped state, then fit it to the map. The error is raised
    outside the except block: a chained ValidationError still holds the input (P-10)."""
    try:
        if isinstance(data, bytes):
            state = StudentState.model_validate_json(data)
        else:
            state = StudentState.model_validate(data)
    except ValidationError as err:
        codes = _codes(err)
    else:
        return _fit_to_map(state, skill_map)
    raise StudentStateError(codes)


def parse_state(data: bytes, skill_map: SkillMap) -> StudentState:
    """A stored state, checked against the model and the skill map."""
    return _validated(data, skill_map)


def revalidated(state: StudentState, skill_map: SkillMap) -> StudentState:
    """A fresh copy of `state`, checked as parse_state checks a file, so an in-place mutation that
    skipped validation can't write a file that loading would refuse. Serializer warnings are off:
    they quote the mistyped value (P-10)."""
    return _validated(state.model_dump(warnings=False), skill_map)


def persistable(state: StudentState) -> StudentState:
    """What may reach disk. With parent consent, everything. Without it, the session-scoped
    minimum: identity, timestamps and the session count, with no profile content and a blank
    consent record, so a revoke that only flipped the flag keeps no note or date.

    The minimum is built unvalidated, so an invalid profile field can't block a revoke; only
    these fields reach disk, and save_state re-validates them."""
    if state.consent.parent_consented:
        return state
    return StudentState.model_construct(
        student_id=state.student_id,
        display_name=state.display_name,
        created_at=state.created_at,
        updated_at=state.updated_at,
        sessions_completed=state.sessions_completed,
    )


def load_example_state(skill_map: SkillMap) -> StudentState:
    """The packaged seeded fake profile (P-13): a consented tester."""
    data = files("platy") / "data" / "example_student.json"
    return parse_state(data.read_bytes(), skill_map)
