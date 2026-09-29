#!/usr/bin/env bash
# Stop: run scripts/check if the tree changed since the last green run. Red -> exit 2 and Claude
# keeps working. (Claude Code overrides after 8 consecutive blocks; git pre-commit is the backstop.)
set -uo pipefail
cd "$CLAUDE_PROJECT_DIR" || exit 0
cache=.claude/.gate-cache/stop-green
if ! hash=$(uv run --frozen --quiet python scripts/gate.py tree-hash); then
  echo "stop gate: could not hash the tree; run scripts/check by hand" >&2
  exit 2
fi
[ -f "$cache" ] && [ "$(cat "$cache")" = "$hash" ] && exit 0
if out=$(scripts/check 2>&1); then
  mkdir -p .claude/.gate-cache && echo "$hash" > "$cache"
  exit 0
fi
{ echo "scripts/check is RED. Fix it before ending the turn (last 60 lines):"; echo "$out" | tail -60; } >&2
exit 2
