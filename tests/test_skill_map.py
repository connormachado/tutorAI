from typing import Any

import pytest
from pydantic import ValidationError
from skill_map_builders import node, skill_map

from primer.skills.skill_map import SkillNode


def node_data(**overrides: Any) -> dict[str, Any]:
    data: dict[str, Any] = node("two_step").model_dump()
    return data | overrides


@pytest.mark.parametrize(
    "overrides",
    [
        {"description": "x" * 121},
        {"probes": node_data()["probes"][:2]},
        {"id": "TwoStep"},
        {"difficulty": 3},
    ],
    ids=["long description", "two probes", "not snake_case", "extra key"],
)
def test_node_rejects_bad_fields(overrides: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        SkillNode.model_validate(node_data(**overrides))


# top -> mid1 -> leaf, top -> mid2 -> leaf + other, and top -> leaf directly.
CHAIN_MAP = skill_map(
    node("leaf"),
    node("other"),
    node("mid1", ["leaf"]),
    node("mid2", ["leaf", "other"]),
    node("top", ["mid1", "mid2", "leaf"]),
)


@pytest.mark.parametrize(
    ("depth", "expected"),
    [
        (0, []),
        (1, ["mid1", "mid2", "leaf"]),
        (2, ["mid1", "mid2", "leaf", "other"]),
        (5, ["mid1", "mid2", "leaf", "other"]),
    ],
)
def test_prerequisite_chain_nearest_first_each_once(depth: int, expected: list[str]) -> None:
    assert CHAIN_MAP.prerequisite_chain("top", depth) == expected


def test_prerequisite_chain_unknown_node() -> None:
    with pytest.raises(KeyError):
        CHAIN_MAP.prerequisite_chain("ghost", 1)
