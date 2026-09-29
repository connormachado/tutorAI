#!/usr/bin/env -S uv run --frozen --quiet python
"""Shared helpers for the harness hooks (protected gate file).

Usage (always from inside the repo):
  gate.py match <section> (--staged | --unstaged | --changed | --files F...)
                                                   print matches; exit 1 if none, 3 on error
  gate.py tree-hash                                                hash of every non-ignored file
  gate.py eval-gate                                                fail-closed, cached pedagogy eval
"""

from __future__ import annotations

import fnmatch
import hashlib
import os
import subprocess
import sys
import tomllib
from pathlib import Path


def git(*args: str) -> str:
    return subprocess.run(["git", *args], capture_output=True, text=True, check=True).stdout


ROOT = Path(git("rev-parse", "--show-toplevel").strip())
CACHE = ROOT / ".claude" / ".gate-cache"


def sections() -> dict[str, list[str]]:
    data = tomllib.loads((ROOT / "scripts" / "triggers.toml").read_text())
    return {name: list(body["paths"]) for name, body in data.items()}


def matches(section: str, paths: list[str]) -> list[str]:
    globs = sections()[section]
    return sorted({p for p in paths if any(fnmatch.fnmatchcase(p, g) for g in globs)})


def repo_files() -> list[str]:
    """Tracked + untracked, non-ignored files that exist in the working tree."""
    out = git("ls-files", "-z", "--cached", "--others", "--exclude-standard", "--deduplicate")
    return sorted({p for p in out.split("\0") if p and (ROOT / p).is_file()})


def staged_files() -> list[str]:
    return [p for p in git("diff", "--cached", "--name-only", "-z").split("\0") if p]


def unstaged_files() -> list[str]:
    """Working-tree changes not in the index, plus untracked files."""
    changed = git("diff", "--name-only", "-z").split("\0")
    untracked = git("ls-files", "-z", "--others", "--exclude-standard").split("\0")
    return sorted({p for p in changed + untracked if p})


def changed_files() -> list[str]:
    """Everything that differs from HEAD, plus untracked files. No HEAD yet -> every file."""
    has_head = subprocess.run(["git", "rev-parse", "--verify", "-q", "HEAD"], capture_output=True)
    if has_head.returncode != 0:
        return repo_files()
    changed = git("diff", "HEAD", "--name-only", "-z").split("\0")
    untracked = git("ls-files", "-z", "--others", "--exclude-standard").split("\0")
    return sorted({p for p in changed + untracked if p})


def content_hash(paths: list[str]) -> str:
    h = hashlib.sha256()
    for p in sorted(set(paths)):
        f = ROOT / p
        h.update(p.encode() + b"\0")
        h.update(f.read_bytes() if f.is_file() else b"<missing>")
        h.update(b"\0")
    return h.hexdigest()[:16]


def eval_gate() -> int:
    """Pedagogy eval hard gate (plan §3.1a). Fails closed; a pass is cached by content."""
    files = repo_files()
    script = ROOT / "scripts" / "eval"
    if not (script.is_file() and os.access(script, os.X_OK)):
        print("BLOCKED: tutoring prompt/policy changed but no pedagogy eval exists (scripts/eval).")
        return 1
    if not [p for p in files if p.startswith("evals/pedagogy/")]:
        print("BLOCKED: tutoring prompt/policy changed but evals/pedagogy/ has zero cases.")
        return 1
    key = content_hash([*matches("pedagogy", files), "scripts/eval"])
    marker = CACHE / f"eval-pass-{key}"
    if marker.exists():
        print(f"eval: pass (cached, {key})")
        return 0
    rc = subprocess.run([str(script)], cwd=ROOT).returncode
    if rc == 0:
        CACHE.mkdir(parents=True, exist_ok=True)
        marker.touch()
        print(f"eval: pass ({key})")
    else:
        print(f"BLOCKED: scripts/eval exited {rc}.")
    return rc


def main(argv: list[str]) -> int:
    cmd = argv[0] if argv else ""
    if cmd == "match" and len(argv) >= 3:
        section, mode, rest = argv[1], argv[2], argv[3:]
        modes = {"--staged": staged_files, "--unstaged": unstaged_files, "--changed": changed_files}
        paths = modes[mode]() if mode in modes else rest
        hits = matches(section, paths)
        print("\n".join(hits))
        return 0 if hits else 1
    if cmd == "tree-hash":
        print(content_hash(repo_files()))
        return 0
    if cmd == "eval-gate":
        return eval_gate()
    print(__doc__, file=sys.stderr)
    return 2


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except Exception as e:  # hooks treat 3 as "fail closed", never as "no match"
        print(f"gate.py error: {e!r}", file=sys.stderr)
        sys.exit(3)
