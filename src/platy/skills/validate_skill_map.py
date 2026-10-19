"""R-10 checks on a SkillMap: unique ids, known prerequisites, a DAG, one top-level node, and
every probe answer verified by sympy (via mathcheck). Each check names every offender."""

from collections import Counter
from dataclasses import dataclass

from platy.mathcheck import MathParseError, expressions_equal, solution_set_is
from platy.skills.skill_map import ProbeProblem, SkillMap, SkillNode


class SkillMapError(ValueError):
    pass


@dataclass(frozen=True)
class Summary:
    nodes: int
    max_depth: int
    probes: int


def validate(skill_map: SkillMap) -> Summary:
    nodes = skill_map.nodes
    _check_unique("node ids", [node.id for node in nodes])
    _check_unique("probe ids", [probe.id for node in nodes for probe in node.probes])
    _check_prerequisites_exist(nodes)
    order = _topological_order(nodes)
    _check_one_top_level(nodes)
    _check_probes([probe for node in nodes for probe in node.probes])

    depth: dict[str, int] = {}  # longest prerequisite chain below each node, in edges
    for node in order:
        depth[node.id] = max((depth[p] + 1 for p in node.prerequisites), default=0)
    return Summary(
        nodes=len(nodes),
        max_depth=max(depth.values(), default=0),
        probes=sum(len(node.probes) for node in nodes),
    )


def _check_unique(what: str, ids: list[str]) -> None:
    duplicates = sorted(i for i, count in Counter(ids).items() if count > 1)
    if duplicates:
        raise SkillMapError(f"duplicate {what}: {', '.join(duplicates)}")


def _check_prerequisites_exist(nodes: list[SkillNode]) -> None:
    known = {node.id for node in nodes}
    missing = [f"{n.id} -> {p}" for n in nodes for p in n.prerequisites if p not in known]
    if missing:
        raise SkillMapError(f"unknown prerequisites: {', '.join(missing)}")


def _topological_order(nodes: list[SkillNode]) -> list[SkillNode]:
    """Kahn's algorithm, prerequisites first. Raises with one cycle's path if the graph has one."""
    by_id = {node.id: node for node in nodes}
    waiting = {node.id: len(node.prerequisites) for node in nodes}
    dependents: dict[str, list[str]] = {node.id: [] for node in nodes}
    for node in nodes:
        for prereq in node.prerequisites:
            dependents[prereq].append(node.id)

    ready = [node.id for node in nodes if waiting[node.id] == 0]
    order: list[SkillNode] = []
    while ready:
        node_id = ready.pop(0)
        order.append(by_id[node_id])
        for dependent in dependents[node_id]:
            waiting[dependent] -= 1
            if waiting[dependent] == 0:
                ready.append(dependent)
    if len(order) == len(nodes):
        return order

    # Every node Kahn couldn't place still waits on another unplaced one, so following
    # unplaced prerequisites must revisit a node: that loop is a cycle.
    stuck = {node_id for node_id, count in waiting.items() if count > 0}
    path: list[str] = []
    current = next(node.id for node in nodes if node.id in stuck)
    while current not in path:
        path.append(current)
        current = next(p for p in by_id[current].prerequisites if p in stuck)
    cycle = [*path[path.index(current) :], current]
    raise SkillMapError(f"prerequisite cycle: {' -> '.join(cycle)}")


def _check_one_top_level(nodes: list[SkillNode]) -> None:
    """In a DAG every node leads up to some top-level node (one nothing depends on), so exactly
    one top-level node means every node is in its prerequisite closure: no orphans."""
    required = {prereq for node in nodes for prereq in node.prerequisites}
    top_level = [node.id for node in nodes if node.id not in required]
    if len(top_level) != 1:
        found = ", ".join(top_level) or "none"
        raise SkillMapError(f"expected exactly one top-level node, found: {found}")


def _check_probes(probes: list[ProbeProblem]) -> None:
    failures = [f"{probe.id} ({problem})" for probe in probes if (problem := _probe_problem(probe))]
    if failures:
        raise SkillMapError(f"probes failed sympy verification: {', '.join(failures)}")


def _probe_problem(probe: ProbeProblem) -> str | None:
    is_equation = "=" in probe.equation
    if is_equation and probe.variable is None:
        return "equation needs a variable"
    if not is_equation and probe.variable is not None:
        return "expression has a variable"
    try:
        if probe.variable is None:
            correct = expressions_equal(probe.equation, probe.answer)
        else:
            correct = solution_set_is(probe.equation, probe.variable, probe.answer)
    except MathParseError as err:
        return err.code
    return None if correct else "wrong answer"
