#!/usr/bin/env node
import { mkdir, readFile, readdir, stat, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
const ARTICLES_DIR = path.join(ROOT_DIR, 'artiklar');
const HUB_TEMPLATE_PATH = path.join(ROOT_DIR, 'templates', 'articles-hub-template.html');

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
const HUB_SLUGS = new Set(HUBS.map((hub) => hub.slug));

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

const hubTemplate = await readFile(HUB_TEMPLATE_PATH, 'utf8');
const articleEntries = [];

for (const entry of await readdir(ARTICLES_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }
  if (HUB_SLUGS.has(entry.name)) {
    continue;
  }

  const slug = entry.name;
  const filePath = path.join(ARTICLES_DIR, slug, 'index.html');
  const fileStat = await stat(filePath).catch(() => null);
  if (!fileStat?.isFile()) {
    continue;
  }

  const html = await readFile(filePath, 'utf8');
  const title = decodeHtmlEntities(extractText(html, /<h1 class="blog-title">([\s\S]*?)<\/h1>/i)) || slug;
  const excerpt = decodeHtmlEntities(extractText(html, /<p class="blog-excerpt">([\s\S]*?)<\/p>/i));
  const date = extractText(html, /<time datetime="([^"]+)"/i);
  const author = decodeHtmlEntities(extractText(html, /<div class="blog-meta">[\s\S]*?<span>([^<]+)<\/span>/i)) ||
    'Creating Homes STHLM AB';
  const coverImage = extractText(html, /<figure class="blog-cover"><img[^>]*src="([^"]+)"/i);
  const hubId = resolveHubId(slug);
  const hub = HUB_BY_ID.get(hubId) || HUB_BY_ID.get('salja-bostad');

  articleEntries.push({
    slug,
    path: `/artiklar/${slug}/`,
    filePath,
    html,
    title,
    excerpt,
    date,
    author,
    coverImage,
    hubId: hub.id,
    hub
  });
}

const sortedArticles = sortPosts(articleEntries);
const postsByHub = groupPostsByHub(sortedArticles);

for (const article of sortedArticles) {
  const breadcrumbs = buildBreadcrumbsHtml(article);
  const relatedSection = buildRelatedSectionHtml(article, postsByHub, sortedArticles);
  let html = article.html;

  if (/<nav class="blog-breadcrumbs"/i.test(html)) {
    html = html.replace(/\s*<nav class="blog-breadcrumbs"[\s\S]*?<\/nav>\s*/i, `\n      ${breadcrumbs}\n`);
  } else {
    html = html.replace(
      /(<main id="content" class="blog-main">\s*<div class="container">)/i,
      `$1\n      ${breadcrumbs}`
    );
  }

  if (/<section class="blog-index blog-related"/i.test(html)) {
    html = html.replace(/\s*<section class="blog-index blog-related"[\s\S]*?<\/section>\s*/i, `\n      ${relatedSection}\n`);
  } else {
    html = html.replace(/\n\s*<\/div>\s*\n\s*<\/main>/i, `\n      ${relatedSection}\n    </div>\n  </main>`);
  }

  await writeFile(article.filePath, html);
}

const indexPath = path.join(ARTICLES_DIR, 'index.html');
let indexHtml = await readFile(indexPath, 'utf8');
const hubSectionHtml = buildHubCardsSectionHtml(postsByHub);

if (/<section class="blog-hubs"/i.test(indexHtml)) {
  indexHtml = indexHtml.replace(/\s*<section class="blog-hubs"[\s\S]*?<\/section>\s*/i, `\n      ${hubSectionHtml}\n`);
} else {
  indexHtml = indexHtml.replace(
    /(<section class="blog-intro">[\s\S]*?<\/section>)/i,
    `$1\n      ${hubSectionHtml}`
  );
}

await writeFile(indexPath, indexHtml);

for (const hub of HUBS) {
  const hubPosts = postsByHub.get(hub.id) || [];
  const hubHtml = buildHubHtml(hubTemplate, hub, hubPosts, postsByHub);
  const hubDir = path.join(ARTICLES_DIR, hub.slug);
  await mkdir(hubDir, { recursive: true });
  await writeFile(path.join(hubDir, 'index.html'), hubHtml);
}

console.log(`Updated ${sortedArticles.length} article pages.`);
console.log('Updated artiklar/index.html with hub cards.');
console.log(`Generated ${HUBS.length} hub pages.`);

function resolveHubId(slug) {
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

function extractText(html, regex) {
  const match = html.match(regex);
  if (!match) {
    return '';
  }
  return stripTags(match[1]).trim();
}

function stripTags(value) {
  return String(value).replace(/<[^>]*>/g, ' ');
}

function buildBreadcrumbsHtml(post) {
  return [
    '<nav class="blog-breadcrumbs" aria-label="Breadcrumb">',
    '  <a href="/">Startsida</a>',
    '  <span class="blog-breadcrumbs__sep" aria-hidden="true">/</span>',
    '  <a href="/artiklar/">Nyheter</a>',
    '  <span class="blog-breadcrumbs__sep" aria-hidden="true">/</span>',
    `  <a href="/artiklar/${post.hub.slug}/">${escapeHtml(post.hub.title)}</a>`,
    '  <span class="blog-breadcrumbs__sep" aria-hidden="true">/</span>',
    `  <span aria-current="page">${escapeHtml(post.title)}</span>`,
    '</nav>'
  ].join('');
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
        `  <h3 class="blog-hub-card__title"><a href="/artiklar/${hub.slug}/">${escapeHtml(hub.title)}</a></h3>`,
        `  <p class="blog-hub-card__desc">${escapeHtml(hub.lead)}</p>`,
        `  <p class="blog-hub-card__meta">${count} artiklar</p>`,
        `  <a class="blog-card__link" href="/artiklar/${hub.slug}/">Gå till hubb</a>`,
        '</article>'
      ].join('');
    })
    .join('');
}

function buildPostCardsHtml(posts) {
  return posts
    .map((post) => {
      const excerpt = post.excerpt ? `<p class="blog-card__excerpt">${escapeHtml(post.excerpt)}</p>` : '';
      const meta = buildCardMetaHtml(post.date, post.author);
      const cover = post.coverImage
        ? `<a class="blog-card__media" href="${escapeAttribute(post.path)}"><img src="${escapeAttribute(post.coverImage)}" alt="${escapeAttribute(post.title)}" loading="lazy" decoding="async" /></a>`
        : '<div class="blog-card__media blog-card__media--empty" aria-hidden="true"></div>';
      return `<article class="blog-card">${cover}<div class="blog-card__body">${meta}<h2 class="blog-card__title"><a href="${escapeAttribute(post.path)}">${escapeHtml(post.title)}</a></h2>${excerpt}<a class="blog-card__link" href="${escapeAttribute(post.path)}">Läs artikeln</a></div></article>`;
    })
    .join('');
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

function buildRelatedSectionHtml(currentPost, postsByHub, sortedPosts) {
  const sameHub = (postsByHub.get(currentPost.hubId) || []).filter((post) => post.slug !== currentPost.slug);
  const related = [];

  for (const post of sameHub) {
    if (related.length >= 3) {
      break;
    }
    related.push(post);
  }

  if (related.length < 3) {
    for (const post of sortedPosts) {
      if (post.slug === currentPost.slug || related.some((item) => item.slug === post.slug)) {
        continue;
      }
      related.push(post);
      if (related.length >= 3) {
        break;
      }
    }
  }

  const clusterLinks = HUBS.filter((hub) => hub.id !== currentPost.hubId)
    .slice(0, 3)
    .map(
      (hub) =>
        `<a class="blog-related__cluster-link" href="/artiklar/${hub.slug}/">${escapeHtml(hub.title)}</a>`
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
    `    <a class="blog-related__hub-link" href="/artiklar/${currentPost.hub.slug}/">Till hubben ${escapeHtml(currentPost.hub.title)}</a>`,
    `    <div class="blog-related__clusters">${clusterLinks}</div>`,
    '  </div>',
    '</section>'
  ].join('');
}

function buildHubHtml(templateSource, hub, hubPosts, postsByHub) {
  const metaTitle = `${hub.title} | Artiklar`;
  const metaDescription = `Artikelhubb: ${hub.lead}`;
  const ogImage = hubPosts[0]?.coverImage || '/pics/OG/OG.jpeg';

  return renderTemplate(templateSource, {
    meta_title: escapeHtml(metaTitle),
    meta_description: escapeHtml(metaDescription),
    canonical_url: `https://creatinghomes.se/artiklar/${hub.slug}/`,
    og_title: escapeHtml(metaTitle),
    og_description: escapeHtml(metaDescription),
    og_image: escapeAttribute(absoluteUrl(ogImage)),
    hub_title: escapeHtml(hub.title),
    hub_lead: escapeHtml(hub.lead),
    hub_intro: escapeHtml(hub.intro),
    all_hubs_html: buildHubCardsHtml(postsByHub, { excludeHubId: hub.id }),
    hub_featured_html: hubPosts.length
      ? buildPostCardsHtml(hubPosts.slice(0, 6))
      : '<p class="blog-empty">Inga artiklar publicerade i denna hubb ännu.</p>',
    hub_posts_html: hubPosts.length
      ? buildPostCardsHtml(hubPosts)
      : '<p class="blog-empty">Inga artiklar publicerade i denna hubb ännu.</p>'
  });
}

function renderTemplate(templateSource, data) {
  return templateSource.replace(/{{\s*([a-z0-9_]+)\s*}}/gi, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      return data[key];
    }
    return '';
  });
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

function absoluteUrl(url) {
  if (!url) {
    return '';
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const trimmed = url.startsWith('/') ? url.slice(1) : url;
  return `https://creatinghomes.se/${trimmed}`;
}
