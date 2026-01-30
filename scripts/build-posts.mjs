#!/usr/bin/env node
import { readFile, writeFile, mkdir, readdir, rm } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
const BASE_PATH = 'artiklar';
const TEMPLATE_PATH = path.join(ROOT_DIR, 'templates', 'article-template.html');
const INDEX_TEMPLATE_PATH = path.join(ROOT_DIR, 'templates', 'articles-index-template.html');
const OUTPUT_DIR = path.join(ROOT_DIR, BASE_PATH);

const SHEET_URL = process.env.SHEET_URL;
if (!SHEET_URL) {
  console.error('Missing SHEET_URL. Example: SHEET_URL="https://script.google.com/.../exec"');
  process.exit(1);
}

const SITE_URL = (process.env.SITE_URL || '').trim().replace(/\/+$/, '');
const DEFAULT_OG_IMAGE = 'pics/OG/OG.jpeg';
const CLEAN_ORPHANS = isTruthy(process.env.CLEAN_ORPHANS);

const template = await readFile(TEMPLATE_PATH, 'utf8');
const indexTemplate = await readFile(INDEX_TEMPLATE_PATH, 'utf8');

const response = await fetch(SHEET_URL, {
  headers: {
    'Cache-Control': 'no-cache'
  }
});

if (!response.ok) {
  throw new Error(`Failed to fetch sheet data: ${response.status} ${response.statusText}`);
}

const responseText = await response.text();
let rows;
try {
  rows = JSON.parse(responseText);
} catch (error) {
  const preview = responseText.replace(/\s+/g, ' ').slice(0, 200);
  throw new Error(
    'Sheet response was not JSON. Make sure the Apps Script web app is deployed with access "Anyone" ' +
      'and you are using the /exec URL. First bytes: ' +
      preview
  );
}
if (!Array.isArray(rows)) {
  throw new Error('Expected the sheet web app to return a JSON array.');
}

let written = 0;
const posts = [];
for (const row of rows) {
  if (!row || typeof row !== 'object') {
    continue;
  }

  const statusValue = toText(row.status).toLowerCase();
  const publishedValue = row.published ?? row.is_published ?? row.publish;
  if (statusValue) {
    if (statusValue !== 'published') {
      continue;
    }
  } else if (hasValue(publishedValue) && !isPublished(publishedValue)) {
    continue;
  }

  const title = decodeHtmlEntities(toText(row.title));
  const slug = slugify(toText(row.slug)) || slugify(title);

  if (!title || !slug) {
    console.warn('Skipping row without title or slug:', row);
    continue;
  }

  if (slug === 'index') {
    console.warn('Skipping row with slug "index" (reserved for /artiklar/).');
    continue;
  }

  const excerpt = decodeHtmlEntities(toText(row.excerpt || row.description));
  const author = decodeHtmlEntities(toText(row.author)) || 'Creating Homes STHLM AB';
  const dateValue = normalizeDate(row.published_at || row.date);
  const coverImage = toText(row.cover_image || row.cover);

  const bodyHtml = toText(row.body_html);
  const bodyMarkdown = toText(row.body_markdown || row.body || row.content);
  const contentHtml = bodyHtml || markdownToHtml(bodyMarkdown);

  if (!contentHtml.trim()) {
    console.warn(`Skipping ${slug}: missing body content.`);
    continue;
  }

  const description = excerpt || deriveDescription(bodyHtml, bodyMarkdown, title);
  const postPath = `/${BASE_PATH}/${slug}/`;
  const canonicalUrl = SITE_URL ? `${SITE_URL}${postPath}` : postPath;
  const ogImage = absoluteUrl(coverImage || DEFAULT_OG_IMAGE, SITE_URL);

  const metaHtml = buildMetaHtml(dateValue, author);
  const excerptHtml = excerpt
    ? `<p class="blog-excerpt">${escapeHtml(excerpt)}</p>`
    : '';
  const coverHtml = coverImage
    ? `<figure class="blog-cover"><img src="${escapeAttribute(coverImage)}" alt="${escapeAttribute(title)}" loading="lazy" decoding="async" /></figure>`
    : '';

  const html = renderTemplate(template, {
    title: escapeHtml(title),
    meta_title: escapeHtml(title),
    meta_description: escapeHtml(description),
    canonical_url: canonicalUrl,
    og_title: escapeHtml(title),
    og_description: escapeHtml(description),
    og_image: escapeAttribute(ogImage),
    slug,
    meta_html: metaHtml,
    excerpt_html: excerptHtml,
    cover_html: coverHtml,
    content: contentHtml
  });

  const postDir = path.join(OUTPUT_DIR, slug);
  await mkdir(postDir, { recursive: true });
  await writeFile(path.join(postDir, 'index.html'), html);
  written += 1;
  posts.push({
    title,
    slug,
    excerpt: excerpt || description,
    author,
    date: dateValue,
    coverImage,
    path: postPath
  });
}

const indexHtml = buildIndexHtml(indexTemplate, posts, SITE_URL);
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, 'index.html'), indexHtml);

if (CLEAN_ORPHANS) {
  const removed = await cleanupOrphans(OUTPUT_DIR, posts.map((post) => post.slug));
  if (removed.length) {
    console.log(`Removed ${removed.length} orphaned post folders.`);
  }
}

console.log(`Generated ${written} posts in ${OUTPUT_DIR}`);
console.log(`Generated index page at ${path.join(OUTPUT_DIR, 'index.html')}`);

function toText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function isPublished(value) {
  if (value === true) {
    return true;
  }
  const text = toText(value).toLowerCase();
  return text === 'true' || text === 'yes' || text === '1' || text === 'y';
}

function hasValue(value) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim() !== '';
  }
  return true;
}

function isTruthy(value) {
  if (!value) {
    return false;
  }
  const text = String(value).trim().toLowerCase();
  return text === 'true' || text === '1' || text === 'yes' || text === 'y';
}

async function cleanupOrphans(outputDir, slugs) {
  const keep = new Set(slugs.filter(Boolean));
  const entries = await readdir(outputDir, { withFileTypes: true });
  const removed = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const name = entry.name;
    if (name === 'index' || name.startsWith('.')) {
      continue;
    }

    if (!keep.has(name)) {
      await rm(path.join(outputDir, name), { recursive: true, force: true });
      removed.push(name);
    }
  }

  return removed;
}

function slugify(value) {
  if (!value) {
    return '';
  }
  return value
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeDate(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

function buildMetaHtml(dateValue, author) {
  const parts = [];
  if (dateValue) {
    parts.push(`<time datetime="${dateValue}">${dateValue}</time>`);
  }
  if (author) {
    parts.push(`<span>${escapeHtml(author)}</span>`);
  }
  if (!parts.length) {
    return '';
  }
  return `<div class="blog-meta">${parts.join('<span class="blog-meta__divider" aria-hidden="true">•</span>')}</div>`;
}

function buildCardMetaHtml(dateValue, author) {
  const parts = [];
  if (dateValue) {
    parts.push(`<time datetime="${dateValue}">${dateValue}</time>`);
  }
  if (author) {
    parts.push(`<span>${escapeHtml(author)}</span>`);
  }
  if (!parts.length) {
    return '';
  }
  return `<div class="blog-card__meta">${parts.join('<span class="blog-meta__divider" aria-hidden="true">•</span>')}</div>`;
}

function buildIndexHtml(indexTemplateSource, posts, siteUrl) {
  const indexTitle = 'Nyheter';
  const indexDescription =
    'Nyheter, artiklar och guider om homestyling, inredning och bostadsförsäljning från Creating Homes STHLM AB.';
  const canonicalUrl = siteUrl ? `${siteUrl}/${BASE_PATH}/` : `/${BASE_PATH}/`;
  const ogImage = absoluteUrl(DEFAULT_OG_IMAGE, siteUrl);

  return renderTemplate(indexTemplateSource, {
    meta_title: escapeHtml(indexTitle),
    meta_description: escapeHtml(indexDescription),
    canonical_url: canonicalUrl,
    og_title: escapeHtml(indexTitle),
    og_description: escapeHtml(indexDescription),
    og_image: escapeAttribute(ogImage),
    posts_html: buildPostsListHtml(posts)
  });
}

function buildPostsListHtml(posts) {
  if (!posts.length) {
    return '<p class="blog-empty">Inga artiklar publicerade just nu.</p>';
  }

  const sorted = [...posts].sort((a, b) => {
    const dateA = a.date ? Date.parse(a.date) : 0;
    const dateB = b.date ? Date.parse(b.date) : 0;
    if (dateA !== dateB) {
      return dateB - dateA;
    }
    return a.title.localeCompare(b.title, 'sv', { sensitivity: 'base' });
  });

  const items = sorted
    .map((post) => {
      const title = escapeHtml(post.title);
      const excerpt = post.excerpt
        ? `<p class="blog-card__excerpt">${escapeHtml(post.excerpt)}</p>`
        : '';
      const metaHtml = buildCardMetaHtml(post.date, post.author);
      const coverHtml = post.coverImage
        ? `<a class="blog-card__media" href="${escapeAttribute(post.path)}"><img src="${escapeAttribute(post.coverImage)}" alt="${escapeAttribute(post.title)}" loading="lazy" decoding="async" /></a>`
        : '<div class="blog-card__media blog-card__media--empty" aria-hidden="true"></div>';

      return `<article class="blog-card">${coverHtml}<div class="blog-card__body">${metaHtml}<h2 class="blog-card__title"><a href="${escapeAttribute(post.path)}">${title}</a></h2>${excerpt}<a class="blog-card__link" href="${escapeAttribute(post.path)}">Läs artikeln</a></div></article>`;
    })
    .join('');

  return `<div class="blog-list">${items}</div>`;
}

function renderTemplate(templateSource, data) {
  return templateSource.replace(/{{\s*([a-z0-9_]+)\s*}}/gi, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      return data[key];
    }
    return '';
  });
}

function deriveDescription(bodyHtml, bodyMarkdown, fallbackTitle) {
  const raw = bodyHtml ? stripTags(bodyHtml) : stripMarkdown(bodyMarkdown || '');
  const cleaned = decodeHtmlEntities(raw).replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return fallbackTitle;
  }
  return cleaned.slice(0, 160);
}

function decodeHtmlEntities(value) {
  const text = String(value ?? '');
  if (!text.includes('&')) {
    return text;
  }

  const named = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    auml: 'ä',
    Auml: 'Ä',
    ouml: 'ö',
    Ouml: 'Ö',
    aring: 'å',
    Aring: 'Å'
  };

  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity[0] === '#') {
      const hex = entity[1]?.toLowerCase() === 'x';
      const number = hex ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      if (!Number.isNaN(number)) {
        try {
          return String.fromCodePoint(number);
        } catch {
          return match;
        }
      }
      return match;
    }

    return Object.prototype.hasOwnProperty.call(named, entity) ? named[entity] : match;
  });
}

function stripTags(value) {
  return String(value).replace(/<[^>]*>/g, ' ');
}

function stripMarkdown(value) {
  let output = String(value);
  output = output.replace(/`{1,3}[^`]*`{1,3}/g, ' ');
  output = output.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
  output = output.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  output = output.replace(/[#*_>\-]+/g, ' ');
  return output;
}

function markdownToHtml(markdown) {
  const input = escapeHtml(String(markdown));
  const lines = input.split(/\r?\n/);
  const blocks = [];
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (!paragraph.length) {
      return;
    }
    blocks.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!list) {
      return;
    }
    const items = list.items.map((item) => `<li>${renderInline(item)}</li>`).join('');
    blocks.push(`<${list.type}>${items}</${list.type}>`);
    list = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (ulMatch || olMatch) {
      flushParagraph();
      const type = ulMatch ? 'ul' : 'ol';
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push((ulMatch || olMatch)[1]);
      continue;
    }

    if (list) {
      flushList();
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();

  return blocks.join('\n');
}

function renderInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
      return `<a href="${escapeAttribute(url)}">${label}</a>`;
    });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function absoluteUrl(value, siteUrl) {
  if (!value) {
    return '';
  }
  if (!siteUrl) {
    return value;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  const trimmed = value.replace(/^\/+/, '');
  return `${siteUrl}/${trimmed}`;
}
