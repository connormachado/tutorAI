from typing import Any

import pytest
from pydantic import ValidationError
from skill_map_builders import node, skill_map

from platy.skills.skill_map import SkillNode, load_skill_map
from platy.skills.validate_skill_map import validate

# The 10 nodes the demo spec names, plus fraction_coefficient_equations and the unit goal.
REQUIRED_IDS = {
    "integer_arithmetic",
    "order_of_operations",
    "fraction_operations",
    "inverse_operations",
    "combining_like_terms",
    "distributive_property",
    "one_step_equations",
    "two_step_equations",
    "multi_step_equations",
    "variables_both_sides",
    "fraction_coefficient_equations",
    "linear_equation_word_problems",
}


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


def test_shipped_skill_map_is_valid() -> None:
    shipped = load_skill_map()
    summary = validate(shipped)
    assert 14 <= summary.nodes <= 18
    ids = [n.id for n in shipped.nodes]
    assert REQUIRED_IDS - set(ids) == set()
    required = {p for n in shipped.nodes for p in n.prerequisites}
    assert [i for i in ids if i not in required] == ["linear_equation_word_problems"]


def test_shipped_prerequisite_chain_two_levels_down() -> None:
    assert load_skill_map().prerequisite_chain("two_step_equations", 2) == [
        "one_step_equations",
        "order_of_operations",
        "inverse_operations",
        "integer_arithmetic",
    ]
