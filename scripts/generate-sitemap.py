#!/usr/bin/env python3
from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path


CANONICAL_RE = re.compile(
    r'<link\s+[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']+)["\'][^>]*>',
    re.IGNORECASE,
)


def find_canonical(html: str) -> str | None:
    match = CANONICAL_RE.search(html)
    return match.group(1).strip() if match else None


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    canon_map: dict[str, float] = {}

    # Only include site pages we publish
    candidates: list[Path] = []
    for p in [root / "index.html", root / "index-en.html", root / "artiklar" / "index.html"]:
        if p.exists():
            candidates.append(p)

    if (root / "artiklar").exists():
        candidates.extend((root / "artiklar").rglob("index.html"))

    for path in candidates:
        text = path.read_text(encoding="utf-8", errors="ignore")
        canonical = find_canonical(text)
        if not canonical:
            continue
        if not canonical.startswith("https://creatinghomes.se/"):
            continue
        mtime = path.stat().st_mtime
        if canonical in canon_map:
            canon_map[canonical] = max(canon_map[canonical], mtime)
        else:
            canon_map[canonical] = mtime

    urls = sorted(canon_map.items())
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]

    for url, mtime in urls:
        lastmod = datetime.fromtimestamp(mtime, tz=timezone.utc).date().isoformat()
        lines.append("  <url>")
        lines.append(f"    <loc>{url}</loc>")
        lines.append(f"    <lastmod>{lastmod}</lastmod>")
        lines.append("  </url>")

    lines.append("</urlset>")
    (root / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {len(urls)} urls")


if __name__ == "__main__":
    main()
