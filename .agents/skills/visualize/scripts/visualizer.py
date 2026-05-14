#!/usr/bin/env python3
"""Visualizer CLI — data visualization management.

Commands: create, list, show, search, delete

Storage: ~/.visualizations/ flat directory. Each visualization is a standalone
HTML or markdown file with frontmatter metadata. HTML files use an HTML-comment
frontmatter block; markdown files use a YAML frontmatter block delimited by `---`.

Requires only Python 3.6+ stdlib. No external dependencies.
"""

import argparse
import json
import os
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

VERSION = "0.1.0"

COMMANDS = ["create", "list", "show", "search", "delete"]


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------


def cli_error(message, hint, json_mode=False):
    """Print error with actionable hint and exit."""
    if json_mode:
        obj = {"status": "error", "message": message, "hint": hint}
        print(json.dumps(obj), file=sys.stderr)
    else:
        print(f"error: {message}", file=sys.stderr)
        print(f"  hint: {hint}", file=sys.stderr)
    sys.exit(1)


def levenshtein(a, b):
    """Levenshtein edit distance between two strings."""
    len_a, len_b = len(a), len(b)
    if len_a == 0:
        return len_b
    if len_b == 0:
        return len_a
    prev = list(range(len_b + 1))
    curr = [0] * (len_b + 1)
    for i in range(1, len_a + 1):
        curr[0] = i
        for j in range(1, len_b + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            curr[j] = min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
        prev, curr = curr, prev
    return prev[len_b]


def suggest_command(input_cmd, commands):
    """Suggest the closest command if within edit distance 3."""
    scored = [(levenshtein(input_cmd, c), c) for c in commands]
    candidates = [(d, c) for d, c in scored if d <= 3]
    candidates.sort(key=lambda x: x[0])
    return candidates[0][1] if candidates else None


# ---------------------------------------------------------------------------
# Metadata parsing
# ---------------------------------------------------------------------------

REQUIRED_FIELDS = ["name", "description", "chart-type", "project", "created"]


def _parse_kv_block(block):
    """Parse a `key: value` block (one per line) into a dict."""
    fields = {}
    for line in block.split("\n"):
        line = line.strip()
        colon = line.find(":")
        if colon < 0:
            continue
        key = line[:colon].strip()
        value = line[colon + 1 :].strip()
        if key and value:
            fields[key] = value
    return fields


def parse_frontmatter(text):
    """Parse frontmatter from HTML or markdown.

    HTML form (file starts with an HTML comment):

        <!--
        name: Visualization Name
        chart-type: bar-chart
        ...
        -->

    Markdown form (file starts with `---` fence):

        ---
        name: Visualization Name
        chart-type: bar-chart
        ...
        ---

    Returns (meta_dict, None) on success or (None, error_message) on failure.
    """
    trimmed = text.strip()
    if trimmed.startswith("<!--"):
        end = trimmed.find("-->", 4)
        if end < 0:
            return None, "Unterminated HTML comment in frontmatter"
        block = trimmed[4:end].strip()
    elif trimmed.startswith("---"):
        end = trimmed.find("\n---", 3)
        if end < 0:
            return None, "Unterminated YAML frontmatter (missing closing ---)"
        block = trimmed[3:end].strip()
    else:
        return None, "No frontmatter found at start of file (expected <!-- or ---)"

    fields = _parse_kv_block(block)
    missing = [f for f in REQUIRED_FIELDS if f not in fields]
    if missing:
        return None, f"Missing required fields: {', '.join(missing)}"

    return {
        "name": fields["name"],
        "description": fields["description"],
        "chart_type": fields["chart-type"],
        "project": fields["project"],
        "created": fields["created"],
    }, None


# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------


def get_root():
    """Get the root storage directory for visualizations."""
    env = os.environ.get("VISUALIZER_HOME")
    if env:
        return env
    home = os.environ.get("HOME", str(Path.home()))
    return os.path.join(home, ".visualizations")


def slugify(text):
    """Convert text to kebab-case slug."""
    lower = text.lower().strip()
    no_spec = re.sub(r"[^\w\s-]", "", lower)
    hyphen = re.sub(r"[\s_]+", "-", no_spec)
    return re.sub(r"^-+|-+$", "", hyphen)


def generate_filename(name, created, ext):
    """Generate a filename: <slug-of-name>-<YYYYMMDD-HHMMSS>.<ext>."""
    slug = slugify(name) or "viz"
    try:
        dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        ts = dt.strftime("%Y%m%d-%H%M%S")
    except ValueError, TypeError:
        # Fall back: strip non-digits from raw value
        ts = re.sub(r"[^0-9]", "", created)[:14] or "00000000-000000"
    return f"{slug}-{ts}.{ext}"


def format_date(iso_string):
    """Format an ISO 8601 timestamp to DD-MM-YYYY H:MM AM/PM."""
    try:
        dt = datetime.fromisoformat(iso_string.replace("Z", "+00:00"))
        dt = dt.astimezone()
        hour_12 = dt.hour % 12
        if hour_12 == 0:
            hour_12 = 12
        ampm = "PM" if dt.hour >= 12 else "AM"
        return f"{dt.day:02d}-{dt.month:02d}-{dt.year} {hour_12}:{dt.minute:02d} {ampm}"
    except ValueError, OSError:
        return iso_string


def read_and_parse(file_path):
    """Read a file and parse its frontmatter. Returns dict or None."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
    except OSError:
        return None
    meta, _err = parse_frontmatter(text)
    if meta is None:
        return None
    name = Path(file_path).stem
    return {
        "id": name,
        "meta": meta,
        "path": str(Path(file_path).resolve()),
        "ext": Path(file_path).suffix.lstrip("."),
    }


VIZ_EXTENSIONS = (".html", ".md")


def scan_storage(chart_type_filter=None, project_filter=None):
    """Scan storage directory (flat), return visualizations sorted newest first."""
    root = get_root()
    if not os.path.isdir(root):
        return []
    results = []
    for fname in os.listdir(root):
        if not fname.endswith(VIZ_EXTENSIONS):
            continue
        fpath = os.path.join(root, fname)
        if not os.path.isfile(fpath):
            continue
        viz = read_and_parse(fpath)
        if viz is None:
            continue
        if chart_type_filter is not None and viz["meta"]["chart_type"] != chart_type_filter:
            continue
        if project_filter is not None and viz["meta"]["project"] != project_filter:
            continue
        results.append(viz)
    results.sort(key=lambda v: v["meta"]["created"], reverse=True)
    return results


def get_visualization(id_or_path):
    """Find a single visualization by ID or absolute path."""
    if "/" in id_or_path:
        if not os.path.isfile(id_or_path):
            return None
        return read_and_parse(id_or_path)
    for viz in scan_storage():
        if viz["id"] == id_or_path or id_or_path in viz["path"]:
            return viz
    return None


def save_visualization(source_path):
    """Save a visualization file into flat storage. Returns (stored_dict, None) or (None, err)."""
    with open(source_path, "r", encoding="utf-8") as f:
        text = f.read()
    meta, err = parse_frontmatter(text)
    if meta is None:
        return None, f"invalid visualization: {err}"
    root = get_root()
    os.makedirs(root, exist_ok=True)
    src_ext = Path(source_path).suffix.lstrip(".") or "html"
    fname = generate_filename(meta["name"], meta["created"], src_ext)
    dest_path = os.path.join(root, fname)
    shutil.copy2(source_path, dest_path)
    return {
        "id": Path(fname).stem,
        "meta": meta,
        "path": dest_path,
        "ext": src_ext,
    }, None


# ---------------------------------------------------------------------------
# Table formatting
# ---------------------------------------------------------------------------

BORDER = "\u2550" * 99
SEPARATOR = "\u2500" * 99


def format_table_header():
    """Format the table header row."""
    return f"  {'Project':<20} {'Type':<15} {'Description':<40} Created"


def format_table_row(viz):
    """Format a single visualization as a table row."""
    m = viz["meta"]
    desc = m["description"]
    if len(desc) > 40:
        desc = desc[:37] + "..."
    return f"  {m['project']:<20} {m['chart_type']:<15} {desc:<40} {format_date(m['created'])}"


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------


def cmd_create(args, json_mode):
    """Save a visualization to storage."""
    if not args.file:
        cli_error(
            "missing required option: --file <path>",
            "visualizer.py create --file sales.html",
            json_mode,
        )
    source = args.file
    if not os.path.isfile(source):
        cli_error(
            f"file not found: {source}",
            "ensure the visualization file exists at the specified path",
            json_mode,
        )
    if not json_mode:
        print(f"saving {source} to storage...")
    stored, err = save_visualization(source)
    if stored is None:
        cli_error(err, "check the HTML frontmatter comment format", json_mode)
    if json_mode:
        print(
            json.dumps(
                {
                    "id": stored["id"],
                    "name": stored["meta"]["name"],
                    "project": stored["meta"]["project"],
                    "chartType": stored["meta"]["chart_type"],
                    "path": stored["path"],
                },
                indent=2,
            )
        )
    else:
        m = stored["meta"]
        print("visualization saved")
        print(f"  name:       {m['name']}")
        print(f"  project:    {m['project']}")
        print(f"  chart type: {m['chart_type']}")
        print(f"  path:       {stored['path']}")
        print()
        print(f"next: visualizer.py show {stored['id']}")


def cmd_list(args, json_mode):
    """List stored visualizations."""
    vizs = scan_storage(
        chart_type_filter=args.type,
        project_filter=args.project,
    )
    if not vizs:
        if json_mode:
            print("[]")
        else:
            print("no visualizations found")
            filters = []
            if args.type:
                filters.append(f"type={args.type}")
            if args.project:
                filters.append(f"project={args.project}")
            if filters:
                print(f"  no matches for filters: {', '.join(filters)}")
            else:
                print("  storage is empty")
            print()
            print("next: visualizer.py create --file <path>")
        return
    if json_mode:
        items = []
        for v in vizs:
            items.append(
                {
                    "id": v["id"],
                    "name": v["meta"]["name"],
                    "project": v["meta"]["project"],
                    "chartType": v["meta"]["chart_type"],
                    "description": v["meta"]["description"],
                    "created": v["meta"]["created"],
                    "path": v["path"],
                }
            )
        print(json.dumps(items, indent=2))
    else:
        root = get_root()
        print()
        print(BORDER)
        print("  STORED VISUALIZATIONS")
        print(SEPARATOR)
        print(format_table_header())
        print(SEPARATOR)
        for v in vizs:
            print(format_table_row(v))
        print(SEPARATOR)
        print(f"  {len(vizs)} visualization(s) | storage: {root}")
        print(BORDER)
        print()
        filters = []
        if args.type:
            filters.append(f"type={args.type}")
        if args.project:
            filters.append(f"project={args.project}")
        if filters:
            print(f"  filtered by: {', '.join(filters)}")


def cmd_show(args, json_mode):
    """Show visualization details."""
    if not args.id:
        cli_error(
            "missing required argument: <id-or-path>",
            "visualizer.py show <id>  or  visualizer.py show /abs/path/to/file.html",
            json_mode,
        )
    viz = get_visualization(args.id)
    if viz is None:
        cli_error(
            f"visualization not found: {args.id}",
            "use 'visualizer.py list' to see available visualizations",
            json_mode,
        )
    if json_mode:
        print(
            json.dumps(
                {
                    "id": viz["id"],
                    "name": viz["meta"]["name"],
                    "description": viz["meta"]["description"],
                    "chartType": viz["meta"]["chart_type"],
                    "project": viz["meta"]["project"],
                    "created": viz["meta"]["created"],
                    "ext": viz["ext"],
                    "path": viz["path"],
                },
                indent=2,
            )
        )
    else:
        m = viz["meta"]
        print()
        print(BORDER)
        print(f"  VISUALIZATION: {m['name']}")
        print(SEPARATOR)
        print(f"  description:  {m['description']}")
        print(f"  chart type:   {m['chart_type']}")
        print(f"  project:      {m['project']}")
        print(f"  created:      {format_date(m['created'])}")
        print(f"  format:       {viz['ext']}")
        print(f"  path:         {viz['path']}")
        print(BORDER)
        print()


def cmd_search(args, json_mode):
    """Search visualizations by keyword."""
    if not args.term:
        cli_error(
            "missing required argument: <term>",
            "visualizer.py search <term>",
            json_mode,
        )
    all_vizs = scan_storage()
    if not all_vizs:
        if json_mode:
            print("[]")
        else:
            print("no visualizations to search")
            print("  no visualizations stored yet")
            print()
            print("next: visualizer.py create --file <path>")
        return
    term_lower = args.term.lower()
    results = [
        v
        for v in all_vizs
        if any(
            term_lower in v["meta"][field].lower()
            for field in ("name", "description", "project", "chart_type")
        )
    ]
    if not results:
        if json_mode:
            print("[]")
        else:
            print("no matches found")
            print(f'  no matches for "{args.term}"')
            print()
            print("next: visualizer.py list")
        return
    if json_mode:
        items = []
        for v in results:
            items.append(
                {
                    "id": v["id"],
                    "name": v["meta"]["name"],
                    "project": v["meta"]["project"],
                    "chartType": v["meta"]["chart_type"],
                    "description": v["meta"]["description"],
                    "created": v["meta"]["created"],
                    "path": v["path"],
                }
            )
        print(json.dumps(items, indent=2))
    else:
        print()
        print(BORDER)
        print(f'  SEARCH RESULTS: "{args.term}"')
        print(SEPARATOR)
        print(format_table_header())
        print(SEPARATOR)
        for v in results:
            print(format_table_row(v))
        print(SEPARATOR)
        print(f"  {len(results)} match(es) from {len(all_vizs)} visualization(s)")
        print(BORDER)
        print()


def cmd_delete(args, json_mode):
    """Delete a visualization."""
    if not args.id:
        cli_error(
            "missing required argument: <id-or-path>",
            "visualizer.py delete <id>  or  visualizer.py delete /abs/path/to/file.html",
            json_mode,
        )
    viz = get_visualization(args.id)
    if viz is None:
        cli_error(
            f"visualization not found: {args.id}",
            "use 'visualizer.py list' to see available visualizations",
            json_mode,
        )
    if not args.force and not json_mode:
        name = viz["meta"]["name"]
        vid = viz["id"]
        print(f"visualization: {name}")
        print(f"  path: {viz['path']}")
        print()
        print("to delete, re-run with --force:")
        print(f"  visualizer.py delete {vid} --force")
        return
    if not json_mode:
        print(f"deleting {viz['meta']['name']}...")
    try:
        os.remove(viz["path"])
    except OSError:
        cli_error(
            f"failed to delete visualization: {args.id}",
            "the file may have been moved or deleted externally",
            json_mode,
        )
    if json_mode:
        print(
            json.dumps(
                {
                    "deleted": True,
                    "id": viz["id"],
                    "name": viz["meta"]["name"],
                    "path": viz["path"],
                },
                indent=2,
            )
        )
    else:
        print("visualization deleted")
        print(f"  name:     {viz['meta']['name']}")
        print(f"  path was: {viz['path']}")
        print()
        print("next: visualizer.py list")


# ---------------------------------------------------------------------------
# Argument parser
# ---------------------------------------------------------------------------


def build_parser():
    """Build the argparse parser with subcommands."""
    # Shared --json flag available on every subcommand
    shared = argparse.ArgumentParser(add_help=False)
    shared.add_argument("--json", action="store_true", help="output JSON instead of human text")

    parser = argparse.ArgumentParser(
        prog="visualizer.py",
        description="visualizer \u2014 data visualization management",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        parents=[shared],
        epilog=(
            "examples:\n"
            "  visualizer.py create --file sales.html\n"
            "  visualizer.py list --type scatter-plot\n"
            '  visualizer.py search "revenue"\n'
            "  visualizer.py show sales-dashboard-20240113T143022\n"
            "  visualizer.py delete sales-dashboard-20240113T143022 --force"
        ),
    )
    parser.add_argument("--version", action="version", version=f"visualizer {VERSION}")

    sub = parser.add_subparsers(dest="command", metavar="<command>")

    # create
    p_create = sub.add_parser("create", help="save a visualization to storage", parents=[shared])
    p_create.add_argument(
        "--file", metavar="<path>", help="path to HTML file with frontmatter metadata"
    )

    # list
    p_list = sub.add_parser("list", help="list stored visualizations", parents=[shared])
    p_list.add_argument("--type", metavar="<chart-type>", help="filter by chart type")
    p_list.add_argument("--project", metavar="<name>", help="filter by project name")

    # show
    p_show = sub.add_parser("show", help="show visualization details", parents=[shared])
    p_show.add_argument(
        "id", nargs="?", metavar="<id-or-path>", help="visualization ID or absolute path"
    )

    # search
    p_search = sub.add_parser("search", help="search visualizations by keyword", parents=[shared])
    p_search.add_argument(
        "term", nargs="?", metavar="<term>", help="search term (case-insensitive)"
    )

    # delete
    p_delete = sub.add_parser("delete", help="delete a visualization", parents=[shared])
    p_delete.add_argument(
        "id", nargs="?", metavar="<id-or-path>", help="visualization ID or absolute path"
    )
    p_delete.add_argument(
        "--force", action="store_true", help="skip confirmation and delete immediately"
    )

    return parser


def main():
    # Pre-scan for unknown commands before argparse to provide Levenshtein suggestions
    raw_args = sys.argv[1:]
    non_flags = [a for a in raw_args if not a.startswith("-")]
    if non_flags and non_flags[0] not in COMMANDS:
        json_mode = "--json" in raw_args
        cmd = non_flags[0]
        suggestion = suggest_command(cmd, COMMANDS)
        if suggestion:
            hint = f"did you mean '{suggestion}'?\n  run: visualizer.py --help"
        else:
            hint = "available commands: create, list, show, search, delete\n  run: visualizer.py --help"
        cli_error(f"unknown command '{cmd}'", hint, json_mode)

    parser = build_parser()
    args = parser.parse_args()
    json_mode = args.json

    if args.command is None:
        parser.print_help()
        sys.exit(0)

    dispatch = {
        "create": cmd_create,
        "list": cmd_list,
        "show": cmd_show,
        "search": cmd_search,
        "delete": cmd_delete,
    }

    handler = dispatch[args.command]
    handler(args, json_mode)


if __name__ == "__main__":
    main()
