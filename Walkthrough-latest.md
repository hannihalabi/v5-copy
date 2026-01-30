# Walkthrough (latest)

## Scope
- Added a "Nyheter" tab that links to `/artiklar/` in the main navigation.
- Updated blog templates/metadata to use "Nyheter" branding.
- Added cron-ready auto-update script for Google Docs feed.
- Added cleanup of removed posts (orphaned folders).

## Changes made
1) Navigation
- `index.html`: Added menu item "Nyheter" pointing to `/artiklar/`.
- `index-en.html`: Added menu item "News" pointing to `/artiklar/`.

2) Blog templates + metadata
- `templates/articles-index-template.html`: Changed "Artiklar" to "Nyheter" and updated lead text.
- `templates/article-template.html`: Changed header link text to "Nyheter".
- `scripts/build-posts.mjs`: Updated index meta title/description to "Nyheter".

3) Automation (cron)
- `scripts/update-blog.sh`: New script to run `build-posts.mjs` with:
  - `SHEET_URL` set to the Apps Script web app URL
  - `SITE_URL` set to https://creatinghomes.se
  - `CLEAN_ORPHANS=true`
- `SSH-setup.md`: Added cron instructions (1-minute interval) and cleanup note.

4) Cleanup of removed Docs
- `scripts/build-posts.mjs`: Added `CLEAN_ORPHANS` option to remove `/artiklar/<slug>/` folders that no longer exist in the feed.
- `BLOG_POSTS.md`: Documented the cleanup option.

## Commands executed locally (for verification)
- Ran the build script with your Apps Script URL to generate `/artiklar/`.
- Ran the build script with `CLEAN_ORPHANS=true` to test removal of orphaned posts.

## Current cron recommendation
```
* * * * * /www/scripts/update-blog.sh >/tmp/creatinghomes-blog.log 2>&1
```

## Notes
- Cleanup is enabled by default in `scripts/update-blog.sh`.
- If cron cannot find Node, set the full path in `scripts/update-blog.sh` via `NODE_BIN`.
