#!/bin/sh
set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

SHEET_URL="https://script.google.com/macros/s/AKfycbx6-Hri5vPSuQLlxO6m2BJ2ZeZD-iah8JUtX9zSO_V9RZKXWx0o_US0fdWLvolM_bo/exec"
SITE_URL="https://creatinghomes.se"
CLEAN_ORPHANS="true"

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
