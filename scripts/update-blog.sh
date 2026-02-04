#!/bin/sh
set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

SHEET_URL="${SHEET_URL:-}"
SITE_URL="${SITE_URL:-}"
CLEAN_ORPHANS="${CLEAN_ORPHANS:-true}"

if [ -z "$SHEET_URL" ]; then
  echo "Missing SHEET_URL. Example: SHEET_URL=\"https://script.google.com/.../exec\""
  exit 1
fi
if [ -z "$SITE_URL" ]; then
  echo "Missing SITE_URL. Example: SITE_URL=\"https://creatinghomes.se\""
  exit 1
fi

NODE_BIN="${NODE_BIN:-}"
if [ -z "$NODE_BIN" ]; then
  NODE_BIN="$(command -v node 2>/dev/null || true)"
fi
if [ -z "$NODE_BIN" ]; then
  NODE_BIN="$(command -v nodejs 2>/dev/null || true)"
fi
if [ -z "$NODE_BIN" ] && [ -s "$HOME/.nvm/nvm.sh" ]; then
  # Load nvm for cron shells
  . "$HOME/.nvm/nvm.sh"
  NODE_BIN="$(command -v node 2>/dev/null || true)"
fi
if [ -z "$NODE_BIN" ]; then
  echo "node not found in PATH. Set NODE_BIN in scripts/update-blog.sh."
  exit 1
fi

cd "$ROOT_DIR"
SHEET_URL="$SHEET_URL" SITE_URL="$SITE_URL" CLEAN_ORPHANS="$CLEAN_ORPHANS" "$NODE_BIN" scripts/build-posts.mjs
