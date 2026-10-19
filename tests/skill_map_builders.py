"""Tiny skill maps for tests. Each node gets three trivially correct probes unless given some."""

from platy.skills.skill_map import ProbeProblem, SkillMap, SkillNode


def probe(
    probe_id: str, equation: str = "1 + 1", variable: str | None = None, answer: str = "2"
) -> ProbeProblem:
    return ProbeProblem(
        id=probe_id, prompt="Try this one.", equation=equation, variable=variable, answer=answer
    )


def node(
    node_id: str, prerequisites: list[str] | None = None, probes: list[ProbeProblem] | None = None
) -> SkillNode:
    return SkillNode(
        id=node_id,
        name=node_id.replace("_", " "),
        description="A test skill.",
        prerequisites=prerequisites or [],
        probes=probes or [probe(f"{node_id}.{i}") for i in (1, 2, 3)],
    )


def skill_map(*nodes: SkillNode) -> SkillMap:
    return SkillMap(schema_version=1, subject="algebra", unit="test unit", nodes=list(nodes))
