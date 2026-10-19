"""R-10 skill graph models. Structural and sympy checks live in validate_skill_map."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ProbeProblem(BaseModel):
    """A diagnostic item. `equation` is "lhs = rhs" solved for `variable`, or a bare expression."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str = Field(min_length=1)
    prompt: str = Field(min_length=1)
    equation: str = Field(min_length=1)
    variable: str | None
    answer: str = Field(min_length=1)


class SkillNode(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str = Field(pattern=r"^[a-z][a-z0-9]*(_[a-z0-9]+)*$")
    name: str = Field(min_length=1)
    description: str = Field(min_length=1, max_length=120)
    prerequisites: list[str]
    probes: list[ProbeProblem] = Field(min_length=3, max_length=3)


class SkillMap(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    schema_version: Literal[1]
    subject: str
    unit: str
    nodes: list[SkillNode]

    def prerequisite_chain(self, node_id: str, depth: int) -> list[str]:
        """Prerequisites of `node_id` up to `depth` levels down, nearest first, each listed once."""
        by_id = {node.id: node for node in self.nodes}
        seen = {node_id}
        chain: list[str] = []
        level = [by_id[node_id]]
        for _ in range(depth):
            next_level: list[SkillNode] = []
            for node in level:
                for prereq in node.prerequisites:
                    if prereq not in seen:
                        seen.add(prereq)
                        chain.append(prereq)
                        next_level.append(by_id[prereq])
            level = next_level
        return chain
