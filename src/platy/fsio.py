"""All file writes (CLAUDE.md), and the R-14 student-state store built on them.

Every write is atomic: a temp file in the same directory, fsync, then os.replace.

State files are plaintext for now. A-3 and P-7 require encryption at rest, and the mechanism is
still open (PRIVACY.md), so nothing real is saved until it's decided. Deleting a file is not a
secure erase either.

V1 persistence is single session (Connor, 2026-10-22). The demo flow never calls save_state:
V1 is 13+ with no parent accounts, so the consent gate never opens in the demo. It opens with
the post-demo parent track.
"""

import os
import re
import tempfile
from datetime import UTC, datetime
from pathlib import Path

from platy.skills.skill_map import SkillMap
from platy.student_state import (
    ID_MAX_LENGTH,
    ID_PATTERN,
    StudentState,
    StudentStateError,
    parse_state,
    persistable,
    revalidated,
)

_MAX_BACKUPS_PER_STUDENT = 10


def atomic_write(path: Path, data: bytes) -> None:
    """Replace `path` with `data` in one step, so a crash leaves the old file or the new one.
    The file is owner-only (0600, from mkstemp)."""
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


def _backups(backup_dir: Path, student_id: str) -> list[Path]:
    """This student's backups, oldest first (names are zero-padded sequence numbers)."""
    return sorted(backup_dir.glob(f"{student_id}.*.json"))


def _back_up(path: Path, backup_dir: Path, student_id: str) -> None:
    """Copy the current file to the next numbered backup, then keep only the newest ten."""
    if not path.exists():
        return
    backup_dir.mkdir(mode=0o700, exist_ok=True)
    existing = _backups(backup_dir, student_id)
    seq = int(existing[-1].name.split(".")[1]) + 1 if existing else 1
    atomic_write(backup_dir / f"{student_id}.{seq:06d}.json", path.read_bytes())
    for stale in _backups(backup_dir, student_id)[:-_MAX_BACKUPS_PER_STUDENT]:
        stale.unlink()


def _purge(directory: Path, student_id: str) -> None:
    """Delete this student's backups and any temp file a crash left mid-write."""
    leftovers = [
        *_backups(directory / ".backups", student_id),
        *(directory / ".backups").glob(f".{student_id}.*.tmp"),
        *directory.glob(f".{student_id}.json.*.tmp"),
    ]
    for leftover in leftovers:
        leftover.unlink()


def save_state(state: StudentState, directory: Path, skill_map: SkillMap) -> None:
    """Write `state` to `<directory>/<student_id>.json`, stamped with a new updated_at.

    What gets written is re-validated first, so a mutated state can't write a file load_state
    would refuse. With parent consent, the previous file is kept as a backup. Without it, only
    the session-scoped minimum is written and every other copy of this student is deleted, so
    revoking consent purges the old profile copies.
    """
    checked = revalidated(persistable(state), skill_map).model_copy(
        update={"updated_at": datetime.now(UTC)}
    )
    path = directory / f"{checked.student_id}.json"
    payload = checked.model_dump_json(indent=2).encode("utf-8")
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    if checked.consent.parent_consented:
        _back_up(path, directory / ".backups", checked.student_id)
        atomic_write(path, payload)
    else:
        atomic_write(path, payload)
        _purge(directory, checked.student_id)


def load_state(directory: Path, student_id: str, skill_map: SkillMap) -> StudentState:
    """Read `<directory>/<student_id>.json`. Nodes missing from the file come back as None."""
    if len(student_id) > ID_MAX_LENGTH or not re.fullmatch(ID_PATTERN, student_id):
        raise StudentStateError(["student_id.invalid"])
    return parse_state((directory / f"{student_id}.json").read_bytes(), skill_map)
