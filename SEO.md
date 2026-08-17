# How this site is put together

The site is a static multi-page Vite build. There is no framework and no SSR — every
page is a real HTML file, so everything a crawler needs is in the initial response
without running any JavaScript.

Almost all of the SEO surface is **generated from one file**. Read this before editing
pages, or you will duplicate something that is meant to exist exactly once.

## The manifest is the source of truth

`site/site.config.ts` holds every page: its route, source file, `<title>`, meta
description, breadcrumb parent, sitemap priority, and a one-line summary.

That single list drives:

| Output | Where it comes from |
| --- | --- |
| Rollup inputs (which pages get built) | `PAGES[].file` |
| Every `<head>` tag on every page | `headFor()` in `vite.config.ts` |
| `dist/sitemap.xml` | `INDEXABLE` |
| `dist/llms.txt` | `PAGES[].summary` |
| JSON-LD `Organization` / `WebSite` / `WebPage` / `BreadcrumbList` | `graphFor()` |

**To add a page:** add an entry to `PAGES`, create the HTML file at that path, done.
The build fails loudly if a page file is not registered, so the two cannot drift.

## What a page file may and may not contain

A page's `<head>` contains **only** this:

```html
<head>
  <!--@head-->
  <!-- optional: one <script type="application/ld+json"> for page-specific schema -->
</head>
```

Do **not** write `<title>`, `<meta name="description">`, `<link rel="canonical">`, or any
`og:` / `twitter:` tag in a page. They are injected. A hand-written duplicate is a real
bug — two canonicals on a page is worse than none.

The body uses three partials from `partials/`:

```html
<!--@include:svg-defs-->   <!-- the X mark, gradient and arrow glyphs -->
<!--@include:nav-->        <!-- header; must come before <main> -->
<!--@include:footer-->     <!-- colophon; must come AFTER </main> -->
```

Interior pages boot `/src/page.ts`; the cover boots `/src/main.ts`.

## Structured data

One shared `@graph` is injected into every page: `Organization` (stable `@id`
`https://xstudioz.com/#organization`), `WebSite`, a per-page `WebPage`, and a
`BreadcrumbList` on any page with a parent.

Page-specific nodes go in the page's own `ld+json` block and reference the studio as a
**stub** — `{"@id": "https://xstudioz.com/#organization"}` — never as a second full
definition. Re-declaring an entity is how one studio becomes three in a knowledge graph.

Deliberate choices worth not undoing:

- **`Organization`, not `LocalBusiness` or `ProfessionalService`.** `LocalBusiness`
  requires a postal address, which this studio does not publish; `ProfessionalService`
  is deprecated by schema.org. `Organization` has no required properties.
- **No `SearchAction`.** Google removed the sitelinks searchbox in 2024, and there is
  no search endpoint to point at.
- **`FAQPage` is present but earns no rich result.** Google retired FAQ rich results.
  It is kept only because the questions are genuinely visible on the page and it costs
  nothing; do not expect it to show in search.

## Crawler-facing files

- `public/robots.txt` and `public/.htaccess` are **static** and copied verbatim.
  Vite copies dotfiles from `publicDir`, so `.htaccess` reaches `dist/` and Hostinger
  re-emits it into the docroot on every deploy — which means it self-heals if the host
  ever overwrites it.
- `dist/sitemap.xml` and `dist/llms.txt` are **generated** at build time.

`.htaccess` is written unguarded because Hostinger runs LiteSpeed, which honours
`.htaccess` but ignores `<IfModule>` guards and handles compression itself. LiteSpeed
also ignores directives it does not understand rather than erroring, so a rule that
looks fine can silently do nothing — verify with `curl -I` after deploying.

## The three canonical rules that matter most

1. **Trailing slashes.** Every route ends in `/`. Canonical, `og:url`, sitemap entries
   and schema `@id` bases must all agree byte for byte, or the entity splits in two.
2. **`/index.html` 301s to `/`.** It used to serve a duplicate `200`, and that duplicate
   was the only URL Google had indexed.
3. **A missing page must return 404.** If `curl -I https://xstudioz.com/no-such-page`
   ever returns `200`, the host has injected an SPA fallback ahead of our rules and
   every dead URL is now a soft 404.
