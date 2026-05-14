#!/usr/bin/env python3
"""Validate waypoint manifests against codebase comment blocks.

Scans all manifests in .ai/waypoints/, verifies each waypoint ID appears in
the expected file, and reports orphaned blocks not in any manifest.
Exits 0 if clean, 1 if drift is detected.
"""

import re
import subprocess
import sys
from pathlib import Path

WAYPOINTS_DIR = Path(".ai/waypoints")
WAYPOINT_PATTERN = re.compile(r"Waypoint\s+([0-9a-f]{8})")
MANIFEST_ROW = re.compile(r"\|\s*`([0-9a-f]{8})`\s*\|\s*(\S+)\s*\|")


def parse_manifest(content: str, pipeline: str) -> list[dict]:
    """Parse manifest table rows into entries with id, file, pipeline."""
    entries = []
    for line in content.splitlines():
        m = MANIFEST_ROW.search(line)
        if m:
            entries.append({"id": m.group(1), "file": m.group(2), "pipeline": pipeline})
    return entries


def find_manifests() -> list[Path]:
    """Return all .md files in the waypoints directory."""
    if not WAYPOINTS_DIR.is_dir():
        return []
    return sorted(p for p in WAYPOINTS_DIR.iterdir() if p.suffix == ".md")


def find_waypoint_blocks() -> dict[str, list[str]]:
    """Grep the codebase for waypoint comment blocks. Returns {id: [files]}."""
    blocks: dict[str, list[str]] = {}
    try:
        result = subprocess.run(
            ["grep", "-r", r"Waypoint [0-9a-f]\{8\}", "--include=*", "-l", "."],
            capture_output=True,
            text=True,
        )
        files = [f for f in result.stdout.strip().splitlines() if f]
    except OSError:
        return blocks

    waypoints_prefix = str(WAYPOINTS_DIR) + "/"
    for filepath in files:
        clean = filepath.lstrip("./")
        # Skip manifest files
        if clean.startswith(waypoints_prefix) or filepath.startswith(f"./{waypoints_prefix}"):
            continue
        try:
            content = Path(filepath).read_text()
        except OSError:
            continue
        for m in WAYPOINT_PATTERN.finditer(content):
            wp_id = m.group(1)
            blocks.setdefault(wp_id, []).append(clean)

    return blocks


def main() -> None:
    manifest_paths = find_manifests()

    if not manifest_paths:
        print("No waypoint manifests found. Nothing to validate.")
        sys.exit(0)

    all_entries: list[dict] = []
    manifest_ids: set[str] = set()

    for path in manifest_paths:
        content = path.read_text()
        pipeline = path.stem
        entries = parse_manifest(content, pipeline)
        all_entries.extend(entries)
        manifest_ids.update(e["id"] for e in entries)

    blocks = find_waypoint_blocks()

    # Group entries by pipeline
    by_pipeline: dict[str, list[dict]] = {}
    for entry in all_entries:
        by_pipeline.setdefault(entry["pipeline"], []).append(entry)

    has_drift = False

    for pipeline, entries in by_pipeline.items():
        stale = []
        verified = 0

        for entry in entries:
            files = blocks.get(entry["id"], [])
            if not any(f == entry["file"] or f == f"./{entry['file']}" for f in files):
                stale.append(entry)
            else:
                verified += 1

        print(f"\n{pipeline}:")
        print(f"  verified: {verified}/{len(entries)}")

        if stale:
            has_drift = True
            print("  stale IDs (in manifest but not found in expected file):")
            for entry in stale:
                print(f"    {entry['id']}  {entry['file']}")

    # Find orphaned waypoint blocks
    orphaned = [(wp_id, files) for wp_id, files in blocks.items() if wp_id not in manifest_ids]

    if orphaned:
        has_drift = True
        print("\norphaned (in files but not in any manifest):")
        for wp_id, files in orphaned:
            print(f"  {wp_id}  {', '.join(files)}")

    if has_drift:
        print("\ndrift detected.")
        sys.exit(1)
    else:
        print("\nall waypoints valid.")
        sys.exit(0)


if __name__ == "__main__":
    main()
