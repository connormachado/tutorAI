"""Mermaid diagram edges vs the real grimp import graph (protected gate file).

Everything is built on edges(mermaid) -> {(src, dst)}. A future TARGET-ARCHITECTURE.md
comparison is one more call to it.

Mermaid grammar accepted (anything else is a discrepancy):
  flowchart LR | flowchart TD
  %% comment
  id[label]  id(label)  id[(label)]  id((label))       node declaration
  a --> b    a -->|label| b                            edge
Node ids in the data-flow diagram: `ext_*` = third-party service (A-2: must connect only to
gateway), `actor_*` = a person, `data_*` = data at rest. Every other id must be a component.

Usage: edge_diff.py [diagrams/AS-BUILT.md]   exit 1 and print discrepancies if any.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import grimp

ID = r"[A-Za-z_][A-Za-z0-9_]*"
NODE_RE = re.compile(rf"^({ID})\s*(\[\(.*\)\]|\(\(.*\)\)|\[.*\]|\(.*\))$")
EDGE_RE = re.compile(rf"^({ID})\s*-->\s*(?:\|[^|]*\|\s*)?({ID})$")
HEADER_RE = re.compile(r"^flowchart (LR|TD)$")
BLOCK_RE = re.compile(r"^## (.+?)\s*\n+```mermaid\n(.*?)```", re.S | re.M)
EXTERNAL_PREFIXES = ("ext_", "actor_", "data_")
GATEWAY = "gateway"

Edge = tuple[str, str]


class MermaidError(ValueError):
    pass


def parse(mermaid: str) -> tuple[set[str], set[Edge]]:
    nodes: set[str] = set()
    edges_: set[Edge] = set()
    for raw in mermaid.splitlines():
        line = raw.strip()
        if not line or line.startswith("%%") or HEADER_RE.match(line):
            continue
        if m := EDGE_RE.match(line):
            edges_.add((m[1], m[2]))
            nodes.update((m[1], m[2]))
        elif m := NODE_RE.match(line):
            nodes.add(m[1])
        else:
            raise MermaidError(f"unsupported Mermaid line: {line!r}")
    return nodes, edges_


def edges(mermaid: str) -> set[Edge]:
    return parse(mermaid)[1]


def blocks(markdown: str) -> dict[str, str]:
    """`## Heading` followed by a ```mermaid block -> {heading: body}."""
    return {m[1]: m[2] for m in BLOCK_RE.finditer(markdown)}


def component_of(module: str) -> str:
    parts = module.split(".")
    return parts[1] if len(parts) > 1 else parts[0]


def component_graph(package: str = "primer") -> tuple[set[str], set[Edge]]:
    """Cross-component edges, importer -> imported. Components = top-level subpackages/modules."""
    graph = grimp.build_graph(package, cache_dir=None)
    real: set[Edge] = set()
    for importer in graph.modules:
        for imported in graph.find_modules_directly_imported_by(importer):
            a, b = component_of(importer), component_of(imported)
            if a != b:
                real.add((a, b))
    comps = {component_of(m) for m in graph.modules} - {package}
    comps |= {c for edge in real for c in edge}  # root package only if it has edges
    return comps, real


def check_components(mermaid: str, comps: set[str], real: set[Edge]) -> list[str]:
    try:
        nodes, drawn = parse(mermaid)
    except MermaidError as e:
        return [f"components: {e}"]
    out = [f"components: edge {a} --> {b} has no real import" for a, b in sorted(drawn - real)]
    out += [f"components: real import {a} --> {b} missing" for a, b in sorted(real - drawn)]
    out += [f"components: node {n} is not a real component" for n in sorted(nodes - comps)]
    out += [f"components: component {n} missing" for n in sorted(comps - nodes)]
    return out


def check_dataflow(mermaid: str, comps: set[str], real: set[Edge]) -> list[str]:
    try:
        nodes, drawn = parse(mermaid)
    except MermaidError as e:
        return [f"data flow: {e}"]
    out: list[str] = []
    internal = {n for n in nodes if not n.startswith(EXTERNAL_PREFIXES)}
    out += [f"data flow: node {n} is not a real component" for n in sorted(internal - comps)]
    for a, b in sorted(drawn):
        if a in internal and b in internal and (a, b) not in real and (b, a) not in real:
            out.append(f"data flow: {a} --> {b} has no import in either direction")
        for ext, other in ((a, b), (b, a)):
            if ext.startswith("ext_") and other != GATEWAY:
                out.append(f"data flow: {a} --> {b} reaches a third party without gateway (A-2)")
    return out


def check_document(markdown: str, comps: set[str], real: set[Edge]) -> list[str]:
    found = blocks(markdown)
    missing = [h for h in ("Components", "Data flow") if h not in found]
    if missing:
        return [f"missing mermaid section(s): {', '.join(missing)}"]
    return check_components(found["Components"], comps, real) + check_dataflow(
        found["Data flow"], comps, real
    )


def main(argv: list[str]) -> int:
    path = Path(argv[0] if argv else "diagrams/AS-BUILT.md")
    comps, real = component_graph()
    problems = check_document(path.read_text(), comps, real)
    print("\n".join(problems) or "edge_diff: diagram matches the import graph")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
