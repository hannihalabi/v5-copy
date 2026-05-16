# Vercel Email Setup

Formuläret skickar nu till Vercel-funktionen `api/send-email.js`.

## Vercel Environment Variables

Lägg in dessa i Vercel Project Settings -> Environment Variables:

```text
SMTP_HOST=mailout.one.com
SMTP_PORT=587
SMTP_USERNAME=<e-postkontot som skickar>
SMTP_PASSWORD=<lösenord eller app-lösenord>
EMAIL_FROM=<valfritt, annars SMTP_USERNAME>
EMAIL_TO=info@creatinghomes.se
EMAIL_CC=<valfritt, kommaseparerat>
EMAIL_SUBJECT=Ny förfrågan från hemsidan
```

`SMTP_USERNAME` och `SMTP_PASSWORD` är obligatoriska. Övriga har rimliga standardvärden i funktionen.

## Bilagor

Formuläret tillåter max 3 bilder i `jpg`, `png` eller `webp`. Varje bild får vara max 1,5 MB och total storlek max 3 MB. Det håller requesten under Vercels gräns för function payloads.

## Lokal kontroll

```bash
npm install
npm run check
```

## SEO Continuity

Run this command before deployment to keep SEO-critical files in sync:

```bash
./scripts/seo-sync.sh
```

It will:
- regenerate `sitemap.xml`
- validate canonical tags
- verify required files exist: `robots.txt`, `sitemap.xml`, `llms.txt`, `.htaccess`
- verify `robots.txt` contains the canonical sitemap URL
