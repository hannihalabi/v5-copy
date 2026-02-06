#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "1/4 Regenerating sitemap.xml..."
python3 scripts/generate-sitemap.py

echo "2/4 Checking canonicals..."
python3 scripts/check-canonicals.py

echo "3/4 Verifying SEO-critical files..."
for file in robots.txt sitemap.xml llms.txt .htaccess; do
  if [[ ! -f "$file" ]]; then
    echo "Missing required file: $file" >&2
    exit 1
  fi
done

if ! grep -q '^Sitemap: https://creatinghomes.se/sitemap.xml$' robots.txt; then
  echo "robots.txt is missing canonical sitemap line." >&2
  exit 1
fi

echo "4/4 Done. SEO sync checks passed."
