import { defineConfig, type Plugin } from 'vite';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITE, PAGES, INDEXABLE, ANALYTICS, abs, type PageDef } from './site/site.config.ts';

const ROOT = dirname(fileURLToPath(import.meta.url));
const BUILD_DATE = new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------
   Helpers
   ------------------------------------------------------------ */

const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Resolve which PageDef a given HTML file belongs to. */
function pageFor(filename: string): PageDef | undefined {
  const rel = relative(ROOT, filename).split('\\').join('/');
  return PAGES.find((p) => p.file === rel);
}

/** Trailing-slash-aware breadcrumb chain for a page. */
function trail(page: PageDef): PageDef[] {
  const chain: PageDef[] = [];
  let cur: PageDef | undefined = page;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.route)) {
    seen.add(cur.route);
    chain.unshift(cur);
    cur = cur.parent ? PAGES.find((p) => p.route === cur!.parent) : undefined;
  }
  return chain;
}

/* ------------------------------------------------------------
   The shared entity graph
   Organization and WebSite are declared once, with stable @ids, so every
   page's WebPage node can point at the same entity instead of re-declaring
   a slightly different studio on each URL.
   ------------------------------------------------------------ */

function graphFor(page: PageDef): object {
  const url = abs(page.route);
  const orgId = `${SITE.origin}/#organization`;
  const siteId = `${SITE.origin}/#website`;

  const organization: Record<string, unknown> = {
    '@type': 'Organization',
    '@id': orgId,
    name: SITE.name,
    url: `${SITE.origin}/`,
    email: SITE.email,
    description: SITE.blurb,
    foundingDate: SITE.founded,
    slogan: 'A logo is a mark. A brand is a promise. We design both.',
    logo: {
      '@type': 'ImageObject',
      '@id': `${SITE.origin}/#logo`,
      url: abs('/icon-512.png'),
      contentUrl: abs('/icon-512.png'),
      width: 512,
      height: 512,
      caption: `${SITE.name} logo`,
    },
    image: { '@id': `${SITE.origin}/#logo` },
    areaServed: { '@type': 'Place', name: SITE.areaServed },
    knowsAbout: [
      'Logo design',
      'Brand identity design',
      'Visual identity systems',
      'Brand guidelines',
      'Typography',
      'Graphic design',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: SITE.email,
      availableLanguage: ['English'],
      areaServed: SITE.areaServed,
    },
  };
  if (SITE.sameAs.length) organization.sameAs = SITE.sameAs;

  const website = {
    '@type': 'WebSite',
    '@id': siteId,
    url: `${SITE.origin}/`,
    name: SITE.name,
    description: SITE.blurb,
    publisher: { '@id': orgId },
    inLanguage: SITE.lang,
  };

  const chain = trail(page);
  const breadcrumb =
    chain.length > 1
      ? {
          '@type': 'BreadcrumbList',
          '@id': `${url}#breadcrumb`,
          itemListElement: chain.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: p.route === '/' ? 'Home' : p.label,
            item: abs(p.route),
          })),
        }
      : null;

  const webPage: Record<string, unknown> = {
    '@type': page.ogType === 'article' ? 'WebPage' : 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: page.title,
    description: page.description,
    isPartOf: { '@id': siteId },
    about: { '@id': orgId },
    inLanguage: SITE.lang,
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: abs(SITE.ogImage),
    },
    datePublished: page.published ?? `${SITE.founded}-01-01`,
    dateModified: page.modified ?? BUILD_DATE,
  };
  if (breadcrumb) webPage.breadcrumb = { '@id': `${url}#breadcrumb` };

  return {
    '@context': 'https://schema.org',
    '@graph': [organization, website, webPage, ...(breadcrumb ? [breadcrumb] : [])],
  };
}

/* ------------------------------------------------------------
   The generated <head>
   Every invariant tag lives here exactly once. Pages declare nothing
   but their own extras, so 14 documents cannot drift apart.
   ------------------------------------------------------------ */

/* ------------------------------------------------------------
   Measurement head block

   Order is load-bearing. The Consent Mode v2 defaults must execute
   BEFORE gtag.js arrives, otherwise the tag has already decided it may
   store, and a later update does not undo the cookie it wrote. So the
   inline defaults are emitted first and gtag.js is loaded async after.

   Everything defaults to denied. In that state GA4 still runs but writes
   no cookie, sending cookieless pings instead, which is what keeps this
   the right side of PECR while still giving Google modelled conversions.

   Clarity is deliberately NOT here. It only appears after an accept,
   injected by src/lib/consent.ts.
   ------------------------------------------------------------ */

function analyticsHead(): string[] {
  if (!ANALYTICS.enabled || !ANALYTICS.ga4Id) return [];

  const bootstrap = [
    'window.dataLayer=window.dataLayer||[];',
    'function gtag(){dataLayer.push(arguments);}',
    "gtag('consent','default',{",
    "'ad_storage':'denied',",
    "'ad_user_data':'denied',",
    "'ad_personalization':'denied',",
    "'analytics_storage':'denied',",
    "'personalization_storage':'denied',",
    "'functionality_storage':'granted',",
    "'security_storage':'granted',",
    "'wait_for_update':500",
    '});',
    "gtag('js',new Date());",
    `gtag('config','${ANALYTICS.ga4Id}');`,
  ].join('');

  return [
    `<script>${bootstrap}</script>`,
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${ANALYTICS.ga4Id}"></script>`,
  ];
}

function headFor(page: PageDef): string {
  const url = abs(page.route);
  const ogType = page.ogType ?? 'website';
  const robots = page.noindex
    ? 'noindex, follow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  const article = page.published
    ? [
        `<meta property="article:published_time" content="${page.published}" />`,
        `<meta property="article:modified_time" content="${page.modified ?? page.published}" />`,
        `<meta property="article:author" content="${esc(SITE.name)}" />`,
      ]
    : [];

  return [
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<meta name="author" content="${esc(SITE.name)}" />`,
    '<meta name="format-detection" content="telephone=no" />',
    /* Both, now that both exist. This was pinned to dark for a long time
       because declaring light on a page that only had a dark palette made the
       browser render its own UI the wrong way round: light scrollbars and
       form controls on a dark page, and a white flash before the stylesheet
       painted. With a real daylight palette in the tokens the reason is gone,
       and the browser should follow the same preference the CSS does. */
    '<meta name="color-scheme" content="light dark" />',
    `<meta name="theme-color" content="${SITE.themeColor}" />`,

    /* Open Graph */
    `<meta property="og:site_name" content="${esc(SITE.name)}" />`,
    `<meta property="og:locale" content="${SITE.locale}" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${abs(SITE.ogImage)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${esc(SITE.ogImageAlt)}" />`,
    ...article,

    /* Twitter / X */
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${abs(SITE.ogImage)}" />`,
    `<meta name="twitter:image:alt" content="${esc(SITE.ogImageAlt)}" />`,

    /* The theme, resolved before the first paint.

       The CSS already handles this on its own: the daylight palette is behind
       a prefers-color-scheme query, so with scripting off the operating
       system's preference still decides and nothing here is required. What
       this adds is the remembered choice. Without it, someone who picked the
       theme that opposes their OS would watch the page paint in the wrong one
       and swap, on every navigation.

       It is deliberately the smallest thing that can work: one attribute, set
       synchronously in <head> before any stylesheet paints, wrapped in a try
       because a blocked localStorage must not take the document down with it. */
    '<script>try{var t=localStorage.getItem("xz-theme");if(t==="light"||t==="dark")' +
      'document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>',

    /* Icons and manifest */
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
    '<link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png" />',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />',
    '<link rel="manifest" href="/site.webmanifest" />',

    /* Self-hosted type — no third-party origins, so nothing to preconnect to */
    '<link rel="preload" href="/fonts/Outfit-600.woff2" as="font" type="font/woff2" crossorigin />',
    '<link rel="preload" href="/fonts/Manrope-400.woff2" as="font" type="font/woff2" crossorigin />',
    '<link rel="preload" href="/fonts/Satoshi-500.woff2" as="font" type="font/woff2" crossorigin />',

    /* Entity graph */
    `<script type="application/ld+json">${JSON.stringify(graphFor(page))}</script>`,

    /* Measurement. Absent entirely until ANALYTICS.enabled is true. */
    ...analyticsHead(),
  ]
    .map((line) => `  ${line}`)
    .join('\n');
}

/* ------------------------------------------------------------
   Plugin: HTML partials + generated head
   ------------------------------------------------------------ */

const INCLUDE = /<!--\s*@include:([a-z0-9-]+)\s*-->/gi;

function xzHtml(): Plugin {
  const partial = (name: string): string => {
    const file = resolve(ROOT, 'partials', `${name}.html`);
    if (!existsSync(file)) {
      throw new Error(`[xz] missing partial: partials/${name}.html`);
    }
    return readFileSync(file, 'utf8').trimEnd();
  };

  return {
    name: 'xz-html',
    enforce: 'pre',

    configureServer(server) {
      // Editing a partial should reload every page that includes it.
      server.watcher.add(resolve(ROOT, 'partials'));
      server.watcher.on('change', (file) => {
        if (file.includes(`${'partials'}`)) server.ws.send({ type: 'full-reload' });
      });
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const page = pageFor(ctx.filename);
        if (!page) {
          throw new Error(
            `[xz] ${relative(ROOT, ctx.filename)} is not registered in site/site.config.ts — ` +
              `add it there so it gets a canonical, a sitemap entry and an llms.txt line.`
          );
        }

        // Partials first, so an included fragment can itself carry a marker.
        let out = html;
        for (let i = 0; i < 3 && INCLUDE.test(out); i++) {
          INCLUDE.lastIndex = 0;
          out = out.replace(INCLUDE, (_m, name: string) => partial(name));
        }

        if (!out.includes('<!--@head-->')) {
          throw new Error(`[xz] ${page.file} is missing the <!--@head--> marker.`);
        }
        return out.replace('<!--@head-->', headFor(page).trimStart());
      },
    },
  };
}

/* ------------------------------------------------------------
   Plugin: crawler-facing files
   sitemap.xml and llms.txt are generated because they must list every
   page in the manifest and drift the moment one is added by hand.
   robots.txt and .htaccess are static and live in public/ — Vite 8
   copies dotfiles from publicDir verbatim (verified against 8.2.1),
   and shipping them from source means Hostinger re-emits them into
   the docroot on every deploy rather than leaving a hand-placed file
   to be clobbered.
   ------------------------------------------------------------ */

function xzSeoFiles(): Plugin {
  let outDir = 'dist';

  return {
    name: 'xz-seo-files',
    apply: 'build',

    configResolved(cfg) {
      outDir = cfg.build.outDir;
    },

    closeBundle() {
      const out = (name: string, body: string) =>
        writeFileSync(resolve(ROOT, outDir, name), body, 'utf8');

      /* ---- sitemap.xml ---- */
      const urls = INDEXABLE.map((p) => {
        const lastmod = p.modified ?? p.published ?? BUILD_DATE;
        return [
          '  <url>',
          `    <loc>${abs(p.route)}</loc>`,
          `    <lastmod>${lastmod}</lastmod>`,
          `    <changefreq>${p.changefreq}</changefreq>`,
          `    <priority>${p.priority.toFixed(1)}</priority>`,
          '  </url>',
        ].join('\n');
      }).join('\n');

      out(
        'sitemap.xml',
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
      );

      /* ---- llms.txt ----
         Honest note: measured adoption is near zero — a 2026 Ahrefs study of
         137k domains found 97% of llms.txt files received no requests at
         all, and Google states Search does not use the file. It is kept
         because it costs one generated file and is the cheapest possible
         option on a convention that may yet be adopted. It is not doing
         any of the real work; the pages are. */
      out('llms.txt', llmsTxt());
    },
  };
}

function llmsTxt(): string {
  const group = (heading: string, prefix: (p: PageDef) => boolean) => {
    const rows = INDEXABLE.filter(prefix).map(
      (p) => `- [${p.label}](${abs(p.route)}): ${p.summary}`
    );
    return rows.length ? `## ${heading}\n\n${rows.join('\n')}\n` : '';
  };

  const services = ['/logo-design/', '/brand-identity/', '/brand-guidelines/', '/social-media-kits/', '/stationery/'];

  /* Blank lines are load-bearing — llms.txt is Markdown, and without them
     the heading runs into the prose. Built by concatenation rather than
     join-with-filter so dropping an empty group cannot also drop a
     separator. */
  const blocks = [
    `# ${SITE.name}\n`,
    `> ${SITE.blurb}\n`,
    `${SITE.name} is a small, independent brand design agency. Clients work directly with the designers — there are no account managers and no hand-offs. Every engagement runs through four stages: brief, directions, refinement, delivery. Enquiries go to ${SITE.email}.\n`,
    group('Services', (p) => services.includes(p.route)),
    group('Agency', (p) => ['/', '/about/', '/process/', '/faq/'].includes(p.route)),
    group('Journal', (p) => p.route.startsWith('/journal/')),
  ];

  return blocks.filter(Boolean).join('\n');
}

/* ------------------------------------------------------------ */

export default defineConfig({
  appType: 'mpa',
  plugins: [xzHtml(), xzSeoFiles()],

  /* The client gets only the measurement settings it actually needs, inlined
     at build time as a literal. Two reasons this is not a plain import of
     site.config:

     1. Importing that module from client code would ship the entire PAGES
        manifest to every visitor. It cost about 10KB before this was moved.
     2. As a literal, `null` when disabled, every guard in consent.ts and
        analytics.ts folds to a constant and the bundler removes the code and
        the IDs entirely. Disabled then means genuinely absent, not merely
        inert with the measurement IDs still sitting in the bundle. */
  define: {
    __XZ_MEASURE__: JSON.stringify(
      ANALYTICS.enabled
        ? {
            clarityId: ANALYTICS.clarityId,
            privacyPath: ANALYTICS.privacyPath,
            cookiePath: ANALYTICS.cookiePath,
            scrollRoutes: ANALYTICS.scrollRoutes,
          }
        : null
    ),
  },
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        PAGES.map((p) => [p.route === '/' ? 'index' : p.file.replace(/\/index\.html$/, '').replace(/\.html$/, ''), resolve(ROOT, p.file)])
      ),
    },
  },
});
