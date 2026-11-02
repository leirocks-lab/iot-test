"""Apply a reviewed text patch only when its complete result matches a supplied overlay.

All hunks and all outputs are verified before any source write. This avoids implicit
Git CRLF conversion and records exact before/after bytes. No Git index operations.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("patch")
parser.add_argument("--expected-overlay", required=True)
parser.add_argument("--project-snapshot")
parser.add_argument("--journal", required=True)
args = parser.parse_args()

def local(value):
    path = (ROOT / value).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError("Workspace-contained input/output required")
    return path

def sha(data):
    return hashlib.sha256(data).hexdigest()

patch_path, overlay, journal = local(args.patch), local(args.expected_overlay), local(args.journal)
if journal.exists():
    raise ValueError("Preserve the existing application journal; choose a new name")
patch_bytes = patch_path.read_bytes()
lines = patch_bytes.decode("utf-8").replace("\r\n", "\n").splitlines(keepends=True)
i, outputs, records = 0, {}, []
while i < len(lines):
    if not lines[i].startswith("--- ") or i + 1 >= len(lines) or not lines[i+1].startswith("+++ b/"):
        raise ValueError("Only ordinary unified text patches are supported")
    old, relative = lines[i][4:].strip(), lines[i+1][6:].strip()
    if not relative.startswith(("android-as/", "ios-as/", "app-rn/")) or relative in outputs:
        raise ValueError("Unsupported or repeated source target")
    target = local(relative)
    before = target.read_bytes() if target.exists() else None
    if old == "/dev/null":
        if before is not None:
            raise ValueError("New target already exists: " + relative)
    elif old != "a/" + relative or before is None:
        raise ValueError("Unexpected source target: " + relative)
    source = before.decode("utf-8").replace("\r\n", "\n").splitlines(keepends=True) if before is not None else []
    i += 2
    out, position, hunks = [], 0, 0
    while i < len(lines) and lines[i].startswith("@@"):
        match = re.match(r"@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@", lines[i])
        if not match:
            raise ValueError("Invalid hunk")
        start, old_count = int(match[1]), int(match[2] or 1)
        new_start, new_count = int(match[3]), int(match[4] or 1)
        begin = start - 1 if start else 0
        if not position <= begin <= len(source):
            raise ValueError("Overlapping/out-of-bounds hunk")
        out.extend(source[position:begin]); position = begin
        if len(out) != (new_start - 1 if new_start else 0):
            raise ValueError("Unexpected output hunk position")
        i += 1
        removed, added = 0, 0
        while i < len(lines) and not lines[i].startswith(("@@", "--- ")):
            line = lines[i]
            prefix, payload = line[:1], line[1:]
            if prefix not in (" ", "+", "-"):
                raise ValueError("Unsupported patch line")
            if prefix in (" ", "-"):
                if position >= len(source) or source[position] != payload:
                    raise ValueError("Exact hunk context mismatch: " + relative)
                position += 1; removed += 1
            if prefix in (" ", "+"):
                out.append(payload); added += 1
            i += 1
        if (removed, added) != (old_count, new_count):
            raise ValueError("Hunk count mismatch")
        hunks += 1
    if not hunks:
        raise ValueError("Empty change")
    out.extend(source[position:])
    after = "".join(out).encode("utf-8")
    expected = overlay / relative
    if relative == "ios-as/Rowan.xcodeproj/project.pbxproj" and args.project_snapshot:
        expected = local(args.project_snapshot)
    reviewed = expected.read_bytes()
    if after != reviewed.replace(b"\r\n", b"\n"):
        raise ValueError("Complete output differs from reviewed overlay: " + relative)
    outputs[relative] = (target, after)
    records.append({"path": relative, "beforeSha256": sha(before) if before is not None else None,
                    "afterSha256": sha(after), "reviewedOverlaySha256": sha(reviewed),
                    "normalizedReviewedCRLF": reviewed != after, "lineEnding": "UTF-8 LF"})

# Recheck the entire read set immediately before writing; no mutation occurred on failure above.
for record in records:
    target = local(record["path"])
    actual = sha(target.read_bytes()) if target.exists() else None
    if actual != record["beforeSha256"]:
        raise ValueError("Source changed during validation")
for target, after in outputs.values():
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(after)
journal.parent.mkdir(parents=True, exist_ok=True)
journal.write_text(json.dumps({"date": datetime.now(timezone.utc).isoformat(),
    "patch": patch_path.relative_to(ROOT).as_posix(), "patchSha256": sha(patch_bytes),
    "stage": "APPLIED_EXACT_REVIEWED_TEXT_NOT_PLATFORM_VERIFIED", "files": records},
    ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Applied {len(records)} verified text targets; application journal: {journal.name}")
