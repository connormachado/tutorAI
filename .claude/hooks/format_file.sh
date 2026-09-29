#!/usr/bin/env bash
# PostToolUse(Edit|Write): ruff format + fix the ONE edited .py file. Leftover errors -> exit 2,
# so Claude sees them at the edit instead of 20 edits later.
set -uo pipefail
root=$CLAUDE_PROJECT_DIR
f=$(jq -r '.tool_input.file_path // empty')
[[ "$f" == *.py && -f "$f" && "$f" == "$root"/* ]] || exit 0
cd "$root" || exit 0
# F401 (unused import) is left to scripts/check: an import often lands one edit before its use.
lint=(uv run --frozen --quiet ruff check --quiet --extend-ignore F401)
"${lint[@]}" --fix "$f" >/dev/null 2>&1
uv run --frozen --quiet ruff format --quiet "$f"
if ! out=$("${lint[@]}" "$f" 2>&1); then
  echo "$out" >&2
  exit 2
fi
