#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path


CANONICAL_RE = re.compile(
    r'<link\s+[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']+)["\'][^>]*>',
    re.IGNORECASE,
)


def find_canonical(html: str) -> str | None:
    match = CANONICAL_RE.search(html)
    return match.group(1).strip() if match else None


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    errors: list[str] = []

    # Root pages
    expected_root_canonicals = {
        root / "index.html": "https://creatinghomes.se/",
        root / "index-en.html": "https://creatinghomes.se/index-en.html",
    }
    for page, expected in expected_root_canonicals.items():
        if not page.exists():
            continue
        canonical = find_canonical(page.read_text(encoding="utf-8", errors="ignore"))
        if not canonical:
            errors.append(f"Missing canonical: {page}")
            continue
        if canonical != expected:
            errors.append(f"Unexpected canonical: {page} -> {canonical} (expected {expected})")

    # Articles index
    articles_index = root / "artiklar" / "index.html"
    if articles_index.exists():
        canonical = find_canonical(articles_index.read_text(encoding="utf-8", errors="ignore"))
        if not canonical:
            errors.append(f"Missing canonical: {articles_index}")
        elif canonical != "https://creatinghomes.se/artiklar/":
            errors.append(f"Unexpected canonical: {articles_index} -> {canonical}")

    # Article pages
    articles_root = root / "artiklar"
    if articles_root.exists():
        for page in articles_root.rglob("index.html"):
            if page == articles_index:
                continue
            rel = page.relative_to(articles_root)
            # rel is like "slug/index.html"
            if rel.parts[-1] != "index.html" or len(rel.parts) < 2:
                continue
            slug = rel.parts[0]
            expected = f"https://creatinghomes.se/artiklar/{slug}/"
            canonical = find_canonical(page.read_text(encoding="utf-8", errors="ignore"))
            if not canonical:
                errors.append(f"Missing canonical: {page}")
                continue
            if canonical != expected:
                errors.append(f"Unexpected canonical: {page} -> {canonical} (expected {expected})")

    if errors:
        print("Canonical check failed:")
        for err in errors:
            print(f"- {err}")
        return 1

    print("Canonical check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
