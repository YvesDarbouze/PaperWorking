#!/usr/bin/env python3
"""Validate citation sources from stdin JSON. Readonly, no side effects.

Input (stdin):  [{ "type": "file"|"url", "path_or_url": "...", "claim": "..." }]
Output (stdout): [{ "source": "...", "status": "valid"|"broken"|"redirect"|"timeout"|"not_found", "details": "..." }]
"""

import json
import os
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def validate_file(entry: dict) -> dict:
    """Check file exists and optionally grep for claim-relevant text."""
    path = entry["path_or_url"]
    result = {"source": path, "status": "not_found", "details": ""}

    if not os.path.exists(path):
        result["details"] = "File does not exist"
        return result

    result["status"] = "valid"
    result["details"] = "File exists"

    claim = entry.get("claim", "").strip()
    if claim:
        try:
            with open(path, "r", errors="replace") as f:
                content = f.read(500_000)  # cap read to 500KB
            # extract keywords (3+ chars) from claim for fuzzy matching
            keywords = [w.lower() for w in re.findall(r"\b\w{3,}\b", claim)]
            if keywords:
                content_lower = content.lower()
                matched = sum(1 for kw in keywords if kw in content_lower)
                ratio = matched / len(keywords)
                if ratio >= 0.3:
                    result["details"] = (
                        f"File exists, claim keywords partially matched ({matched}/{len(keywords)})"
                    )
                else:
                    result["details"] = (
                        f"File exists, but claim keywords not found ({matched}/{len(keywords)})"
                    )
                    result["status"] = "valid"  # file still valid, just noting mismatch
        except OSError, UnicodeDecodeError:
            result["details"] = "File exists but could not be read for claim verification"

    return result


def validate_url(entry: dict) -> dict:
    """HTTP HEAD with timeout, follow redirects, check status."""
    url = entry["path_or_url"]
    result = {"source": url, "status": "broken", "details": ""}

    try:
        req = Request(url, method="HEAD", headers={"User-Agent": "rabbit-hole-validator/1.0"})
        with urlopen(req, timeout=10) as resp:
            final_url = resp.url if hasattr(resp, "url") else url
            status = resp.status

            if 200 <= status < 300:
                if final_url != url:
                    result["status"] = "redirect"
                    result["details"] = f"HTTP {status}, redirected to {final_url}"
                else:
                    result["status"] = "valid"
                    result["details"] = f"HTTP {status}"
            else:
                result["status"] = "broken"
                result["details"] = f"HTTP {status}"
    except HTTPError as e:
        if e.code == 405:
            # HEAD not allowed, try GET with range
            try:
                req = Request(
                    url,
                    method="GET",
                    headers={
                        "User-Agent": "rabbit-hole-validator/1.0",
                        "Range": "bytes=0-0",
                    },
                )
                with urlopen(req, timeout=10) as resp:
                    result["status"] = "valid"
                    result["details"] = f"HTTP {resp.status} (HEAD rejected, GET ok)"
            except Exception:
                result["status"] = "broken"
                result["details"] = "HTTP 405 (HEAD) and GET also failed"
        elif e.code == 404:
            result["status"] = "not_found"
            result["details"] = "HTTP 404"
        else:
            result["status"] = "broken"
            result["details"] = f"HTTP {e.code}"
    except TimeoutError:
        result["status"] = "timeout"
        result["details"] = "Connection timed out (10s)"
    except URLError as e:
        result["status"] = "broken"
        result["details"] = f"URL error: {e.reason}"
    except Exception as e:
        result["status"] = "broken"
        result["details"] = f"Unexpected error: {type(e).__name__}: {e}"

    return result


def main() -> None:
    raw = sys.stdin.read().strip()
    if not raw:
        json.dump([], sys.stdout, indent=2)
        return

    try:
        sources = json.loads(raw)
    except json.JSONDecodeError as e:
        print(
            json.dumps([{"source": "stdin", "status": "broken", "details": f"Invalid JSON: {e}"}]),
            file=sys.stdout,
        )
        sys.exit(1)

    if not isinstance(sources, list):
        sources = [sources]

    results = []
    for entry in sources:
        src_type = entry.get("type", "").lower()
        if src_type == "file":
            results.append(validate_file(entry))
        elif src_type == "url":
            results.append(validate_url(entry))
        else:
            results.append(
                {
                    "source": entry.get("path_or_url", "unknown"),
                    "status": "broken",
                    "details": f"Unknown source type: {src_type}",
                }
            )

    json.dump(results, sys.stdout, indent=2)


if __name__ == "__main__":
    main()
