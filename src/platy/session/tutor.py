"""The tutor's structured reply. The gateway sends TutorTurn's schema as one strict tool, and
policy/checks.py checks every turn before the student sees it."""

from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

# Skill-map ids: a snake_case node id, and its probes as node.1, node.2 and so on. The model
# writes these, so a fixed shape keeps a sentence from riding into state or records (P-8).
_NODE = r"[a-z][a-z0-9]*(?:_[a-z0-9]+)*"
NodeId = Annotated[str, StringConstraints(pattern=rf"^{_NODE}$", max_length=64)]
ProblemId = Annotated[str, StringConstraints(pattern=rf"^{_NODE}\.[0-9]+$", max_length=64)]


class TutorAction(StrEnum):
    GREET = "greet"
    ASK_EXPLAIN = "ask_explain"
    GIVE_HINT = "give_hint"
    PROBE_PREREQUISITE = "probe_prerequisite"
    PRESENT_PROBLEM = "present_problem"
    CONFIRM_CORRECT = "confirm_correct"
    RETEACH = "reteach"
    REVIEW_PRIOR = "review_prior"
    CHECK_CONFIDENCE = "check_confidence"
    CLOSE_SESSION = "close_session"


# One tutor turn. The student sees `message`, never `rationale`. Both are child content: memory
# only, never in a file, log, error or repr (P-1, P-10). There's no correctness field, since sympy
# decides correctness, never the model. Comments rather than docstrings here: a docstring would
# become a description in the tool schema, and model-facing text lives in prompts/*.md.
class TutorTurn(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, hide_input_in_errors=True)

    message: str = Field(min_length=1, repr=False)
    action: TutorAction
    active_node_id: NodeId | None
    active_problem_id: ProblemId | None
    rationale: str = Field(max_length=200, repr=False)
