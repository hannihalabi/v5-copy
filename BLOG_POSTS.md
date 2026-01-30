# Google Sheets Blog Flow

This setup generates static blog pages from a Google Sheet. Each row becomes a page at:
`/artiklar/<slug>/` (served from `artiklar/<slug>/index.html`).

## 1) Create the Sheet

Create a Google Sheet named `Posts` with these columns (case-sensitive):

Required:
- `slug`
- `title`
- `body` (Markdown text)

Recommended:
- `status` (`published` or `draft`)
- `published_at` (YYYY-MM-DD or a date cell)

Optional:
- `excerpt` (short summary for SEO)
- `cover_image` (URL or site path like `pics/blog/cover.jpg`)
- `author`
- `body_html` (if you prefer HTML instead of Markdown)

Example row:

| slug | title | published_at | excerpt | cover_image | author | body | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| post-1 | Styling homes for sale | 2024-10-01 | Tips for first impressions. | pics/extrapics/spacejoy-KSfe2Z4REEM-unsplash.webp | Creating Homes STHLM AB | # Heading\n\nYour content here. | published |

## 2) Expose the Sheet as JSON

In the Sheet, go to Extensions > Apps Script and paste:

```js
function doGet() {
  var sheet = SpreadsheetApp.getActive().getSheetByName('Posts');
  var rows = sheet.getDataRange().getValues();
  var headers = rows.shift();
  var data = rows.map(function (row) {
    var item = {};
    headers.forEach(function (header, i) {
      item[header] = row[i];
    });
    return item;
  });
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Deploy it: Deploy > New deployment > Web app.
- Execute as: Me
- Who has access: Anyone

Copy the Web app URL (this is your `SHEET_URL`).

## 3) Build the Pages

From the project root:

```bash
SHEET_URL="YOUR_WEB_APP_URL" \
SITE_URL="https://creatinghomes.se" \
node scripts/build-posts.mjs
```

Optional cleanup of removed posts:

```bash
CLEAN_ORPHANS=true \
  SHEET_URL="YOUR_WEB_APP_URL" \
  SITE_URL="https://creatinghomes.se" \
  node scripts/build-posts.mjs
```

This generates pages in `artiklar/<slug>/index.html` and `artiklar/index.html`.

Requirement: Node.js 18+ (uses built-in `fetch`).

## 4) Upload to Your SSH Server

Upload the generated `artiklar/` folder (and any new images) to your server.
Example:

```bash
rsync -av artiklar/ user@server:/path/to/site/artiklar/
```

## 5) Update Flow

When you add or edit posts:
1) Update the Sheet
2) Run the build command again
3) Upload the updated `artiklar/` folder

Note: If you delete a row in the Sheet, delete the matching `artiklar/<slug>/` folder on the server.
Or run the build with `CLEAN_ORPHANS=true` to remove missing posts automatically.

## Optional: HTML instead of Markdown

If you prefer HTML, add a `body_html` column and the build script will use it instead of `body`.
