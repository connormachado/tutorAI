#!/usr/bin/env bash
# PreToolUse(Edit|Write|MultiEdit|NotebookEdit): deny edits to gate files ([gate] in
# scripts/triggers.toml). Otherwise the cheapest way to pass the gate is to weaken it.
# A tripwire, not a wall: Bash can still write these, and pre-commit + /ship report it.
set -uo pipefail
root=$CLAUDE_PROJECT_DIR
f=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
[ -n "$f" ] || exit 0
rel=$(python3 -c 'import os,sys; print(os.path.relpath(os.path.realpath(sys.argv[1]), os.path.realpath(sys.argv[2])))' "$f" "$root")
[[ "$rel" == ../* ]] && exit 0
cd "$root" || exit 2
uv run --frozen --quiet python scripts/gate.py match gate --files "$rel" >/dev/null
case $? in
  1) exit 0 ;;
  0) echo "BLOCKED: $rel is a protected gate file (scripts/triggers.toml [gate]). Don't weaken the gate to pass it; tell Connor what should change and why." >&2 ;;
  *) echo "BLOCKED: protect_gate could not classify $rel (gate.py error); failing closed." >&2 ;;
esac
exit 2
