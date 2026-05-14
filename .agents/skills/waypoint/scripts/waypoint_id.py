#!/usr/bin/env python3
"""Generate 8-char waypoint IDs from file paths relative to git root.

Input (argv):  one or more file paths
Output (stdout): tabular lines of `<8-char-id>  <path>`
"""

import hashlib
import sys


def main() -> None:
    paths = sys.argv[1:]

    if not paths:
        print("Usage: waypoint-id <path> [path...]", file=sys.stderr)
        print("Generate 8-char waypoint IDs from file paths relative to git root.", file=sys.stderr)
        sys.exit(1)

    for p in paths:
        wp_id = hashlib.sha256(p.encode()).hexdigest()[:8]
        print(f"{wp_id}  {p}")


if __name__ == "__main__":
    main()
