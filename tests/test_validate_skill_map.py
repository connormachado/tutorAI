import pytest
from skill_map_builders import node, probe, skill_map

from platy.skills.skill_map import SkillMap
from platy.skills.validate_skill_map import SkillMapError, Summary, validate

BAD_MAPS = {
    "missing prerequisite": (skill_map(node("a", ["ghost"])), ["ghost"]),
    "cycle": (
        skill_map(node("a", ["b"]), node("b", ["c"]), node("c", ["a"]), node("top", ["a"])),
        ["a -> b -> c -> a"],
    ),
    "self-loop": (skill_map(node("a", ["a"])), ["a -> a"]),
    "two top-level nodes": (
        skill_map(node("a"), node("b", ["a"]), node("lonely")),
        ["b", "lonely"],
    ),
    "duplicate node id": (skill_map(node("a"), node("a")), ["duplicate node ids: a"]),
    "duplicate probe id": (
        skill_map(node("a"), node("b", ["a"], [probe("a.1"), probe("b.2"), probe("b.3")])),
        ["duplicate probe ids: a.1"],
    ),
    "wrong answer": (
        skill_map(node("a", probes=[probe("a.1"), probe("a.2", answer="3"), probe("a.3")])),
        ["a.2 (wrong answer)"],
    ),
    "equation without variable": (
        skill_map(node("a", probes=[probe("a.1"), probe("a.2"), probe("a.3", "x + 1 = 2")])),
        ["a.3 (equation needs a variable)"],
    ),
    "expression with variable": (
        skill_map(node("a", probes=[probe("a.1", variable="x"), probe("a.2"), probe("a.3")])),
        ["a.1 (expression has a variable)"],
    ),
    "two equals signs": (
        skill_map(
            node("a", probes=[probe("a.1"), probe("a.2"), probe("a.3", "x = 1 = 1", "x", "1")])
        ),
        ["a.3 (not_one_equals)"],
    ),
}


@pytest.mark.parametrize(("bad_map", "expected"), BAD_MAPS.values(), ids=BAD_MAPS.keys())
def test_validate_reports_each_failure(bad_map: SkillMap, expected: list[str]) -> None:
    with pytest.raises(SkillMapError) as err:
        validate(bad_map)
    for text in expected:
        assert text in str(err.value)


def test_validate_summarizes_a_good_map() -> None:
    diamond = skill_map(node("a"), node("b", ["a"]), node("c", ["a"]), node("d", ["b", "c"]))
    assert validate(diamond) == Summary(nodes=4, max_depth=2, probes=12)
