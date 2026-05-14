#!/usr/bin/env python3
"""Build D3 templates from shared scaffold + per-chart fragments.

A fragment file (`*.frag.html`) contains named sections delimited by HTML
comments of the form `<!-- @section: NAME -->`. Sections recognized:

  frontmatter   — multi-line key: value frontmatter (without the surrounding
                  <!-- --> markers). Required.
  head-title    — content of <head><title>...</title></head>.
  body          — full HTML for the inside of <div id="chart-container">,
                  including h1, subtitle, svg (or div), tooltip, details, etc.
  chart-css     — chart-specific CSS appended after the shared base.css.
  extra-imports — additional ESM import lines (one per line).
  helpers       — comma-separated names of shared helpers to inline. Choices:
                    tooltip, a11y, data-table
  chart-js      — the d3 chart code that runs after helpers.

Skeleton placeholders filled in by this script:
  {{FRONTMATTER}}, {{HEAD_TITLE}}, {{BODY}},
  {{BASE_CSS}}, {{CHART_CSS}}, {{EXTRA_IMPORTS}}, {{HELPERS_JS}}, {{CHART_JS}}

CLI:
  build_d3.py --fragment <path> --out <path>   # build one
  build_d3.py --all                            # rebuild every fragment in tree
  build_d3.py --check                          # build to /tmp; nonzero on drift
"""

from __future__ import annotations

import argparse
import difflib
import re
import sys
import tempfile
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
SHARED_DIR = SKILL_DIR / "assets" / "d3" / "_shared"
FRAGMENTS_DIR = SKILL_DIR / "assets" / "d3" / "fragments"
TEMPLATES_DIR = SKILL_DIR / "assets" / "d3" / "templates"

SECTION_RE = re.compile(r"<!--\s*@section:\s*([a-z-]+)\s*-->")
HELPER_FILES = {
    "tooltip": "tooltip.js",
    "a11y": "a11y.js",
    "data-table": "data-table.js",
}


def read(path: Path) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def parse_fragment(text: str) -> dict[str, str]:
    """Split fragment text into named sections."""
    sections: dict[str, str] = {}
    parts = SECTION_RE.split(text)
    # parts[0] is leading text before any section (ignored).
    # then alternating: name, body, name, body, ...
    for i in range(1, len(parts), 2):
        name = parts[i].strip()
        body = parts[i + 1] if i + 1 < len(parts) else ""
        sections[name] = body.strip("\n")
    return sections


def indent_lines(text: str, prefix: str) -> str:
    return "\n".join(prefix + line if line else line for line in text.split("\n"))


def build(fragment_path: Path) -> str:
    """Render a fragment into final HTML."""
    fragment = parse_fragment(read(fragment_path))
    skeleton = read(SHARED_DIR / "skeleton.html")
    base_css = read(SHARED_DIR / "base.css").rstrip("\n")

    chart_css = fragment.get("chart-css", "").rstrip("\n")
    chart_js = fragment.get("chart-js", "").rstrip("\n")
    extra_imports = fragment.get("extra-imports", "").rstrip("\n")
    helpers = [h.strip() for h in fragment.get("helpers", "").split(",") if h.strip()]
    helpers_js_parts: list[str] = []
    for h in helpers:
        if h not in HELPER_FILES:
            raise SystemExit(f"unknown helper '{h}' in {fragment_path}")
        helpers_js_parts.append(read(SHARED_DIR / HELPER_FILES[h]).rstrip("\n"))
    helpers_js = "\n\n".join(helpers_js_parts)

    body = fragment.get("body", "").rstrip("\n")

    # Indent CSS, body, and JS to match skeleton context
    base_css_indented = indent_lines(base_css, "      ") + "\n"
    chart_css_indented = (indent_lines(chart_css, "      ") + "\n") if chart_css else ""
    body_indented = indent_lines(body, "      ") if body else ""
    chart_js_indented = indent_lines(chart_js, "      ") if chart_js else ""
    helpers_js_indented = indent_lines(helpers_js, "      ") if helpers_js else ""
    extra_imports_indented = indent_lines(extra_imports, "      ") if extra_imports else ""

    out = skeleton
    out = out.replace("{{FRONTMATTER}}", fragment.get("frontmatter", "").strip())
    out = out.replace("{{HEAD_TITLE}}", fragment.get("head-title", "").strip())
    out = out.replace("{{BODY}}", body_indented)
    out = out.replace("{{BASE_CSS}}", base_css_indented)
    out = out.replace("{{CHART_CSS}}", chart_css_indented)
    out = out.replace("{{EXTRA_IMPORTS}}", extra_imports_indented)
    out = out.replace("{{HELPERS_JS}}", helpers_js_indented)
    out = out.replace("{{CHART_JS}}", chart_js_indented)

    # Remove trailing whitespace lines introduced by empty placeholders
    out = re.sub(r"\n[ \t]+\n", "\n\n", out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out


def derive_out_path(fragment_path: Path) -> Path:
    """Map fragments/<cat>/<name>.frag.html → templates/<cat>/<name>.html."""
    rel = fragment_path.relative_to(FRAGMENTS_DIR)
    name = rel.name.replace(".frag.html", ".html")
    return TEMPLATES_DIR / rel.parent / name


def all_fragments() -> list[Path]:
    return sorted(FRAGMENTS_DIR.rglob("*.frag.html"))


def cmd_build_one(fragment: Path, out: Path) -> None:
    rendered = build(fragment)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(rendered)
    try:
        rel = out.resolve().relative_to(SKILL_DIR)
        print(f"built {rel}")
    except ValueError:
        print(f"built {out}")


def cmd_build_all() -> None:
    fragments = all_fragments()
    if not fragments:
        print("no fragments found", file=sys.stderr)
        sys.exit(1)
    for frag in fragments:
        cmd_build_one(frag, derive_out_path(frag))


def cmd_check() -> int:
    """Build all fragments to a temp dir, diff against committed templates."""
    fragments = all_fragments()
    if not fragments:
        print("no fragments found; nothing to check", file=sys.stderr)
        return 0
    drift = 0
    with tempfile.TemporaryDirectory() as tmp:
        for frag in fragments:
            committed = derive_out_path(frag)
            rendered = build(frag)
            if not committed.exists():
                print(f"DRIFT (missing committed): {committed.relative_to(SKILL_DIR)}")
                drift += 1
                continue
            existing = read(committed)
            if existing != rendered:
                drift += 1
                diff = difflib.unified_diff(
                    existing.splitlines(keepends=True),
                    rendered.splitlines(keepends=True),
                    fromfile=str(committed.relative_to(SKILL_DIR)),
                    tofile=str(committed.relative_to(SKILL_DIR)) + " (rebuilt)",
                    n=3,
                )
                sys.stdout.write("".join(diff))
            # Also write rendered to tmp for inspection
            outp = Path(tmp) / committed.relative_to(TEMPLATES_DIR)
            outp.parent.mkdir(parents=True, exist_ok=True)
            with open(outp, "w", encoding="utf-8") as f:
                f.write(rendered)
    if drift:
        print(f"\n{drift} template(s) drifted", file=sys.stderr)
        return 1
    print(f"OK: {len(fragments)} template(s) match committed output")
    return 0


def main():
    p = argparse.ArgumentParser(prog="build_d3.py")
    p.add_argument("--fragment", type=Path, help="single fragment path")
    p.add_argument("--out", type=Path, help="output path (paired with --fragment)")
    p.add_argument("--all", action="store_true", help="rebuild every fragment")
    p.add_argument(
        "--check", action="store_true", help="diff fragments against committed templates"
    )
    args = p.parse_args()

    if args.check:
        sys.exit(cmd_check())
    if args.all:
        cmd_build_all()
        return
    if args.fragment:
        out = args.out or derive_out_path(args.fragment)
        cmd_build_one(args.fragment, out)
        return
    p.print_help()
    sys.exit(1)


if __name__ == "__main__":
    main()
