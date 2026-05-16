#!/usr/bin/env node
import { readFile, writeFile, mkdir, readdir, rm } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
const BASE_PATH = 'artiklar';
const TEMPLATE_PATH = path.join(ROOT_DIR, 'templates', 'article-template.html');
const INDEX_TEMPLATE_PATH = path.join(ROOT_DIR, 'templates', 'articles-index-template.html');
const HUB_TEMPLATE_PATH = path.join(ROOT_DIR, 'templates', 'articles-hub-template.html');
const OUTPUT_DIR = path.join(ROOT_DIR, BASE_PATH);

const HUBS = [
  {
    id: 'salja-bostad',
    slug: 'salja-bostad',
    title: 'Sälja bostad',
    lead: 'Strategier och stylingtips som hjälper dig öka intresset inför foto, visning och budgivning.',
    intro:
      'Här hittar du artiklar om vad som påverkar slutpris, hur du prioriterar rätt insatser och hur du skapar ett första intryck som håller genom hela försäljningsresan.'
  },
  {
    id: 'rum-for-rum',
    slug: 'rum-for-rum',
    title: 'Rum för rum',
    lead: 'Konkreta guider för kök, sovrum, vardagsrum, hall och andra rum där små stylingbeslut gör stor skillnad.',
    intro:
      'Det här klustret samlar praktiska rumsguider med fokus på möblering, ljus och detaljer som gör bostaden mer attraktiv på både bild och visning.'
  },
  {
    id: 'kostnad-och-planering',
    slug: 'kostnad-och-planering',
    title: 'Kostnad och planering',
    lead: 'Planera rätt från start med guider om budget, stylingnivåer, tidslinje och förberedelser.',
    intro:
      'Här samlar vi allt som hjälper dig planera effektivt: vad styling kostar, vilken nivå som passar bostaden och hur du tajmar foto, visning och logistik.'
  },
  {
    id: 'lokalt-stockholm',
    slug: 'lokalt-stockholm',
    title: 'Lokalt i Stockholm',
    lead: 'Lokal vägledning för Stockholm med omnejd, inklusive områdesspecifika råd och inredningshjälp.',
    intro:
      'Här hittar du artiklar med lokal relevans för Stockholm, Söderort och närliggande områden. Fokus ligger på målgrupp, bostadstyp och rätt känsla för varje delmarknad.'
  }
];

const HUB_BY_ID = new Map(HUBS.map((hub) => [hub.id, hub]));

const SLUG_TO_HUB = {
  'bostadsstyling-infor-forsaljning': 'salja-bostad',
  'detaljer-som-far-spekulanter-att-stanna': 'salja-bostad',
  'fargsattning-som-saljer': 'salja-bostad',
  'fore-efter-60-kvm': 'salja-bostad',
  'homestyling': 'salja-bostad',
  'homestyling-for-villa': 'salja-bostad',
  'homestyling-infor-forsaljning': 'salja-bostad',
  'inredning-paverkar-slutpriset': 'salja-bostad',
  'inredningstrender-2026': 'salja-bostad',
  'styla-2a-snabbare-forsaljning': 'salja-bostad',
  'styling-hjalper-maklaren': 'salja-bostad',
  'styling-i-hyresratt': 'salja-bostad',
  'styling-pa-liten-budget': 'salja-bostad',
  'tom-bostad-vs-moblerad': 'salja-bostad',
  'vanliga-stylingmisstag': 'salja-bostad',
  'vinterstyling-infor-visning': 'salja-bostad',
  'styling-av-badrum-utan-renovering': 'rum-for-rum',
  'styling-av-balkong-och-uteplats': 'rum-for-rum',
  'styling-av-barnrum': 'rum-for-rum',
  'styling-av-hall-forsta-intrycket': 'rum-for-rum',
  'styling-av-hemmakontor': 'rum-for-rum',
  'styling-av-kok-utan-renovering': 'rum-for-rum',
  'styling-av-matplats': 'rum-for-rum',
  'styling-av-sovrum': 'rum-for-rum',
  'styling-av-vardagsrum': 'rum-for-rum',
  'styling-kontor': 'rum-for-rum',
  'checklista-infor-fotografering': 'kostnad-och-planering',
  'forbered-bostaden-infor-visning': 'kostnad-och-planering',
  'fore-fotografering-vs-infor-visning': 'kostnad-och-planering',
  'light-medium-full-styling': 'kostnad-och-planering',
  'sa-jobbar-vi-processen': 'kostnad-och-planering',
  'vad-kostar-en-styling': 'kostnad-och-planering',
  'bostadsstyling-stockholm': 'lokalt-stockholm',
  'homestyling-stockholm': 'lokalt-stockholm',
  'inredningshjalp-haninge': 'lokalt-stockholm',
  'inredningshjalp-sodermalm': 'lokalt-stockholm',
  'inredningshjalp-tyreso': 'lokalt-stockholm',
  'inredningshjalp-vasterhaninge': 'lokalt-stockholm',
  'interior-styling': 'lokalt-stockholm'
};

const SHEET_URL = process.env.SHEET_URL;
if (!SHEET_URL) {
  console.error('Missing SHEET_URL. Example: SHEET_URL="https://script.google.com/.../exec"');
  process.exit(1);
}

const SITE_URL = (process.env.SITE_URL || '').trim().replace(/\/+$/, '');
const DEFAULT_OG_IMAGE = 'pics/OG/OG.jpeg';
const CLEAN_ORPHANS = isTruthy(process.env.CLEAN_ORPHANS);
const BUILD_DATE = new Date().toISOString().slice(0, 10);

const template = await readFile(TEMPLATE_PATH, 'utf8');
const indexTemplate = await readFile(INDEX_TEMPLATE_PATH, 'utf8');
const hubTemplate = await readFile(HUB_TEMPLATE_PATH, 'utf8');

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
let writtenHubs = 0;
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
  const publishedDate = normalizeDate(row.published_at || row.date) || BUILD_DATE;
  const modifiedDate =
    normalizeDate(row.modified_at || row.updated_at || row.last_updated || row.updated || row.lastmod) ||
    BUILD_DATE;
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

  const hubId = resolveHubId(row, slug);
  const hub = HUB_BY_ID.get(hubId) || HUB_BY_ID.get('salja-bostad');

  posts.push({
    title,
    slug,
    excerpt,
    description,
    author,
    date: publishedDate,
    modifiedDate,
    coverImage,
    path: postPath,
    contentHtml,
    hubId: hub.id,
    hub
  });
}

const sortedPosts = sortPosts(posts);
const postsByHub = groupPostsByHub(sortedPosts);

for (const post of sortedPosts) {
  const canonicalUrl = SITE_URL ? `${SITE_URL}${post.path}` : post.path;
  const ogImage = absoluteUrl(post.coverImage || DEFAULT_OG_IMAGE, SITE_URL);
  const publishedTime = post.date || BUILD_DATE;
  const modifiedTime = post.modifiedDate || BUILD_DATE;
  const articleJsonLd = buildArticleJsonLd(post, canonicalUrl, ogImage, publishedTime, modifiedTime);

  const metaHtml = buildMetaHtml(post.date, post.author);
  const excerptHtml = post.excerpt
    ? `<p class="blog-excerpt">${escapeHtml(post.excerpt)}</p>`
    : '';
  const coverHtml = post.coverImage
    ? `<figure class="blog-cover"><img src="${escapeAttribute(post.coverImage)}" alt="${escapeAttribute(post.title)}" loading="lazy" decoding="async" /></figure>`
    : '';
  const relatedSection = buildRelatedSectionHtml(post, postsByHub, sortedPosts);
  const breadcrumbsHtml = buildBreadcrumbsHtml(post);

  const html = renderTemplate(template, {
    title: escapeHtml(post.title),
    meta_title: escapeHtml(post.title),
    meta_description: escapeHtml(post.description),
    canonical_url: canonicalUrl,
    og_title: escapeHtml(post.title),
    og_description: escapeHtml(post.description),
    og_image: escapeAttribute(ogImage),
    article_published_time: escapeAttribute(publishedTime),
    article_modified_time: escapeAttribute(modifiedTime),
    article_json_ld: articleJsonLd,
    slug: post.slug,
    meta_html: metaHtml,
    excerpt_html: excerptHtml,
    cover_html: coverHtml,
    breadcrumbs_html: breadcrumbsHtml,
    content: post.contentHtml,
    related_section: relatedSection
  });

  const postDir = path.join(OUTPUT_DIR, post.slug);
  await mkdir(postDir, { recursive: true });
  await writeFile(path.join(postDir, 'index.html'), html);
  written += 1;
}

const indexHtml = buildIndexHtml(indexTemplate, sortedPosts, SITE_URL, postsByHub);
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, 'index.html'), indexHtml);

for (const hub of HUBS) {
  const hubPosts = postsByHub.get(hub.id) || [];
  const hubDir = path.join(OUTPUT_DIR, hub.slug);
  await mkdir(hubDir, { recursive: true });
  const hubHtml = buildHubHtml(hubTemplate, hub, hubPosts, postsByHub, SITE_URL);
  await writeFile(path.join(hubDir, 'index.html'), hubHtml);
  writtenHubs += 1;
}

if (CLEAN_ORPHANS) {
  const keepDirectories = [...posts.map((post) => post.slug), ...HUBS.map((hub) => hub.slug)];
  const removed = await cleanupOrphans(OUTPUT_DIR, keepDirectories);
  if (removed.length) {
    console.log(`Removed ${removed.length} orphaned post folders.`);
  }
}

console.log(`Generated ${written} posts in ${OUTPUT_DIR}`);
console.log(`Generated index page at ${path.join(OUTPUT_DIR, 'index.html')}`);
console.log(`Generated ${writtenHubs} hub pages in ${OUTPUT_DIR}`);

function resolveHubId(row, slug) {
  const explicit = toText(row.hub || row.cluster || row.topic || row.category);
  if (explicit) {
    const normalized = slugify(explicit);
    const byId = HUB_BY_ID.get(normalized);
    if (byId) {
      return byId.id;
    }
    const bySlug = HUBS.find((hub) => hub.slug === normalized);
    if (bySlug) {
      return bySlug.id;
    }
  }

  if (Object.prototype.hasOwnProperty.call(SLUG_TO_HUB, slug)) {
    return SLUG_TO_HUB[slug];
  }

  if (slug.startsWith('styling-av-')) {
    return 'rum-for-rum';
  }
  if (slug.includes('stockholm') || slug.startsWith('inredningshjalp-')) {
    return 'lokalt-stockholm';
  }
  if (
    slug.includes('kostar') ||
    slug.includes('checklista') ||
    slug.includes('process') ||
    slug.includes('plan') ||
    slug.includes('fotografering')
  ) {
    return 'kostnad-och-planering';
  }

  return 'salja-bostad';
}

function groupPostsByHub(posts) {
  const map = new Map(HUBS.map((hub) => [hub.id, []]));
  for (const post of posts) {
    if (!map.has(post.hubId)) {
      map.set(post.hubId, []);
    }
    map.get(post.hubId).push(post);
  }
  return map;
}

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

function buildBreadcrumbsHtml(post) {
  const hubPath = `/${BASE_PATH}/${post.hub.slug}/`;
  return [
    '<nav class="blog-breadcrumbs" aria-label="Breadcrumb">',
    '  <a href="/">Startsida</a>',
    '  <span class="blog-breadcrumbs__sep" aria-hidden="true">/</span>',
    `  <a href="/${BASE_PATH}/">Nyheter</a>`,
    '  <span class="blog-breadcrumbs__sep" aria-hidden="true">/</span>',
    `  <a href="${escapeAttribute(hubPath)}">${escapeHtml(post.hub.title)}</a>`,
    '  <span class="blog-breadcrumbs__sep" aria-hidden="true">/</span>',
    `  <span aria-current="page">${escapeHtml(post.title)}</span>`,
    '</nav>'
  ].join('');
}

function buildIndexHtml(indexTemplateSource, posts, siteUrl, postsByHub) {
  const indexTitle = 'Nyheter om homestyling och inredning';
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
    hub_cards_html: buildHubCardsSectionHtml(postsByHub),
    posts_html: buildPostsListHtml(posts)
  });
}

function buildHubCardsSectionHtml(postsByHub) {
  return [
    '<section class="blog-hubs" aria-labelledby="article-hubs">',
    '  <h2 id="article-hubs">Utforska efter ämne</h2>',
    '  <p>Välj ett ämnesområde för att hitta artiklar som hör ihop och leder dig vidare steg för steg.</p>',
    `  <div class="blog-hub-grid">${buildHubCardsHtml(postsByHub)}</div>`,
    '</section>'
  ].join('');
}

function buildHubCardsHtml(postsByHub, options = {}) {
  const { excludeHubId = '' } = options;

  return HUBS.filter((hub) => hub.id !== excludeHubId)
    .map((hub) => {
      const count = (postsByHub.get(hub.id) || []).length;
      return [
        '<article class="blog-hub-card">',
        `  <h3 class="blog-hub-card__title"><a href="/${BASE_PATH}/${hub.slug}/">${escapeHtml(hub.title)}</a></h3>`,
        `  <p class="blog-hub-card__desc">${escapeHtml(hub.lead)}</p>`,
        `  <p class="blog-hub-card__meta">${count} artiklar</p>`,
        `  <a class="blog-card__link" href="/${BASE_PATH}/${hub.slug}/">Gå till hubb</a>`,
        '</article>'
      ].join('');
    })
    .join('');
}

function buildHubHtml(hubTemplateSource, hub, hubPosts, postsByHub, siteUrl) {
  const canonicalUrl = siteUrl ? `${siteUrl}/${BASE_PATH}/${hub.slug}/` : `/${BASE_PATH}/${hub.slug}/`;
  const metaTitle = `${hub.title} | Artiklar`;
  const metaDescription = `Artikelhubb: ${hub.lead}`;
  const ogImage = absoluteUrl(hubPosts[0]?.coverImage || DEFAULT_OG_IMAGE, siteUrl);
  const featured = hubPosts.slice(0, 6);

  return renderTemplate(hubTemplateSource, {
    meta_title: escapeHtml(metaTitle),
    meta_description: escapeHtml(metaDescription),
    canonical_url: canonicalUrl,
    og_title: escapeHtml(metaTitle),
    og_description: escapeHtml(metaDescription),
    og_image: escapeAttribute(ogImage),
    hub_title: escapeHtml(hub.title),
    hub_lead: escapeHtml(hub.lead),
    hub_intro: escapeHtml(hub.intro),
    all_hubs_html: buildHubCardsHtml(postsByHub, { excludeHubId: hub.id }),
    hub_featured_html: featured.length
      ? buildPostCardsHtml(featured)
      : '<p class="blog-empty">Inga artiklar publicerade i denna hubb ännu.</p>',
    hub_posts_html: hubPosts.length
      ? buildPostCardsHtml(hubPosts)
      : '<p class="blog-empty">Inga artiklar publicerade i denna hubb ännu.</p>'
  });
}

function buildPostsListHtml(posts) {
  if (!posts.length) {
    return '<p class="blog-empty">Inga artiklar publicerade just nu.</p>';
  }

  const sorted = sortPosts(posts);
  const items = buildPostCardsHtml(sorted);
  return `<div class="blog-list">${items}</div>`;
}

function sortPosts(posts) {
  return [...posts].sort((a, b) => {
    const dateA = a.date ? Date.parse(a.date) : 0;
    const dateB = b.date ? Date.parse(b.date) : 0;
    if (dateA !== dateB) {
      return dateB - dateA;
    }
    return a.title.localeCompare(b.title, 'sv', { sensitivity: 'base' });
  });
}

function buildPostCardsHtml(posts) {
  return posts
    .map((post) => {
      const title = escapeHtml(post.title);
      const excerptText = post.excerpt || post.description;
      const excerpt = excerptText
        ? `<p class="blog-card__excerpt">${escapeHtml(excerptText)}</p>`
        : '';
      const metaHtml = buildCardMetaHtml(post.date, post.author);
      const coverHtml = post.coverImage
        ? `<a class="blog-card__media" href="${escapeAttribute(post.path)}"><img src="${escapeAttribute(post.coverImage)}" alt="${escapeAttribute(post.title)}" loading="lazy" decoding="async" /></a>`
        : '<div class="blog-card__media blog-card__media--empty" aria-hidden="true"></div>';

      return `<article class="blog-card">${coverHtml}<div class="blog-card__body">${metaHtml}<h2 class="blog-card__title"><a href="${escapeAttribute(post.path)}">${title}</a></h2>${excerpt}<a class="blog-card__link" href="${escapeAttribute(post.path)}">Läs artikeln</a></div></article>`;
    })
    .join('');
}

function buildRelatedSectionHtml(currentPost, postsByHub, sortedPosts) {
  if (!sortedPosts.length || sortedPosts.length < 2) {
    return '';
  }

  const sameHub = (postsByHub.get(currentPost.hubId) || []).filter((post) => post.slug !== currentPost.slug);
  const related = [];

  for (const candidate of sameHub) {
    if (related.length >= 3) {
      break;
    }
    related.push(candidate);
  }

  if (related.length < 3) {
    for (const candidate of sortedPosts) {
      if (candidate.slug === currentPost.slug) {
        continue;
      }
      if (related.some((post) => post.slug === candidate.slug)) {
        continue;
      }
      related.push(candidate);
      if (related.length >= 3) {
        break;
      }
    }
  }

  if (!related.length) {
    return '';
  }

  const clusterLinks = HUBS.filter((hub) => hub.id !== currentPost.hubId)
    .slice(0, 3)
    .map(
      (hub) =>
        `<a class="blog-related__cluster-link" href="/${BASE_PATH}/${hub.slug}/">${escapeHtml(hub.title)}</a>`
    )
    .join('');

  return [
    '<section class="blog-index blog-related" aria-labelledby="related-articles">',
    '  <div class="blog-related__head">',
    `    <h2 id="related-articles">Fler artiklar inom ${escapeHtml(currentPost.hub.title)}</h2>`,
    '    <p>Fortsätt läsa i samma ämne eller hoppa vidare till ett närliggande område.</p>',
    '  </div>',
    `  <div class="blog-list">${buildPostCardsHtml(related)}</div>`,
    '  <div class="blog-related__footer">',
    `    <a class="blog-related__hub-link" href="/${BASE_PATH}/${currentPost.hub.slug}/">Till hubben ${escapeHtml(currentPost.hub.title)}</a>`,
    `    <div class="blog-related__clusters">${clusterLinks}</div>`,
    '  </div>',
    '</section>'
  ].join('');
}

function buildArticleJsonLd(post, canonicalUrl, ogImage, publishedTime, modifiedTime) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    image: [ogImage],
    author: {
      '@type': 'Organization',
      name: post.author || 'Creating Homes STHLM AB'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Creating Homes STHLM AB',
      logo: {
        '@type': 'ImageObject',
        url: 'https://creatinghomes.se/creatinghomeslogo.png'
      }
    },
    datePublished: publishedTime,
    dateModified: modifiedTime,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl
    }
  };

  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
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
