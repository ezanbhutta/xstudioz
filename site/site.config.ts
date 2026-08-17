/* ============================================================
   XStudioz — Site manifest
   The single source of truth for routing, <head>, sitemap.xml,
   robots.txt and llms.txt. Add a page here and everything else
   follows; nothing about a page is declared in two places.
   ============================================================ */

export const SITE = {
  origin: 'https://xstudioz.com',
  name: 'XStudioz',
  legalName: 'XStudioz',
  tagline: 'Independent brand design studio',
  /* One sentence, used wherever a neutral description of the studio is needed. */
  blurb:
    'XStudioz is an independent brand design studio creating logos, brand identities and the systems that carry them for founders worldwide.',
  email: 'inquire@xstudioz.com',
  portfolio: 'https://portfolio.xstudioz.com',
  locale: 'en_US',
  lang: 'en',
  /* Chromatic event of the brand — used for theme-color and schema. */
  brandColor: '#e634be',
  themeColor: '#e5e4e0',
  ogImage: '/og.png',
  ogImageAlt: 'XStudioz — a logo is a mark, a brand is a promise.',
  /* Verified external profiles. Every URL here becomes an Organization
     `sameAs` edge, which is how search engines and LLMs resolve the string
     "XStudioz" to a single real entity rather than to noise.
     ⚠ TODO(owner): fill this in. An empty list is the single biggest
     remaining gap in this site's entity graph — see SEO-CHECKLIST.md.
     e.g. 'https://www.linkedin.com/company/xstudioz',
          'https://www.behance.net/xstudioz',
          'https://dribbble.com/xstudioz',
          'https://www.instagram.com/xstudioz' */
  sameAs: [] as string[],
  founded: '2024',
  /* Global studio — deliberately no postal address. areaServed is the world. */
  areaServed: 'Worldwide',
};

export type Entry = 'home' | 'page';

export interface PageDef {
  /** Public URL path, always with a trailing slash except the 404. */
  route: string;
  /** Source HTML relative to the project root — also the rollup input. */
  file: string;
  /** Full <title>. Aim for <= 60 characters. */
  title: string;
  /** Meta description. Aim for 140-160 characters. */
  description: string;
  /** Short label used in breadcrumbs and internal nav. */
  label: string;
  /** Which client entry the page boots. */
  entry: Entry;
  /** Sitemap priority, 0-1. */
  priority: number;
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** og:type — 'article' for journal entries. */
  ogType?: 'website' | 'article';
  /** Keep out of the index and the sitemap. */
  noindex?: boolean;
  /** ISO date, journal entries only. */
  published?: string;
  /** ISO date. Falls back to the build date. */
  modified?: string;
  /** Parent route, used to build the BreadcrumbList. */
  parent?: string;
  /** One-line summary for llms.txt — write it for a machine reader. */
  summary: string;
}

/* ------------------------------------------------------------
   Pages
   ------------------------------------------------------------ */

export const PAGES: PageDef[] = [
  {
    route: '/',
    file: 'index.html',
    title: 'XStudioz — Independent Brand & Logo Design Studio',
    description:
      'XStudioz is an independent brand design studio. Custom logos, brand identities, and the guidelines that hold them together — designed properly, for founders worldwide.',
    label: 'Home',
    entry: 'home',
    priority: 1.0,
    changefreq: 'monthly',
    summary:
      'Studio homepage. Who XStudioz is, the five capabilities, the four-stage process, and how to start a project.',
  },

  /* ---- Services ---- */
  {
    route: '/logo-design/',
    file: 'logo-design/index.html',
    title: 'Logo Design — Custom Marks for Founders | XStudioz',
    description:
      'Custom logo design for founders and growing companies. One mark, drawn until it holds — with full vector masters, every file format, and usage rules included.',
    label: 'Logo Design',
    entry: 'page',
    priority: 0.9,
    changefreq: 'monthly',
    parent: '/',
    summary:
      'Logo design service. Covers what a custom logo includes, what it costs, how long it takes, deliverable file formats, and how it differs from a logo generator or contest.',
  },
  {
    route: '/brand-identity/',
    file: 'brand-identity/index.html',
    title: 'Brand Identity Design — Complete Systems | XStudioz',
    description:
      'Brand identity design: colour, typography, layout, voice, and the rules that keep them consistent everywhere your company shows up. Built as one system, not a folder of files.',
    label: 'Brand Identity',
    entry: 'page',
    priority: 0.9,
    changefreq: 'monthly',
    parent: '/',
    summary:
      'Brand identity design service. Explains what a full identity system contains beyond a logo, who needs one, and what is delivered.',
  },
  {
    route: '/brand-guidelines/',
    file: 'brand-guidelines/index.html',
    title: 'Brand Guidelines Design — Usable Manuals | XStudioz',
    description:
      'Brand guidelines your team will actually open. Clear rules for logo, colour, type, and tone — written in plain language so the brand survives contact with real work.',
    label: 'Brand Guidelines',
    entry: 'page',
    priority: 0.85,
    changefreq: 'monthly',
    parent: '/',
    summary:
      'Brand guidelines service. What a brand manual should contain, how long it should be, and how XStudioz writes documents teams actually use.',
  },
  {
    route: '/social-media-kits/',
    file: 'social-media-kits/index.html',
    title: 'Social Media Kit Design — Branded Templates | XStudioz',
    description:
      'Social media kits built as a system: editable templates, profile assets, and post layouts sized for every platform, so everything you publish stays unmistakably yours.',
    label: 'Social Media Kits',
    entry: 'page',
    priority: 0.8,
    changefreq: 'monthly',
    parent: '/',
    summary:
      'Social media kit service. Template systems, platform sizing, profile assets, and how a kit keeps a brand consistent across channels.',
  },
  {
    route: '/stationery/',
    file: 'stationery/index.html',
    title: 'Stationery & Collateral Design | XStudioz',
    description:
      'Business cards, letterheads, invoices, decks, and signage — print-ready stationery and collateral designed as part of the identity, with production specs suppliers can use.',
    label: 'Stationery & Collateral',
    entry: 'page',
    priority: 0.8,
    changefreq: 'monthly',
    parent: '/',
    summary:
      'Stationery and collateral service. Print-ready business cards, letterheads, decks and signage, including production specifications.',
  },

  /* ---- Studio ---- */
  {
    route: '/about/',
    file: 'about/index.html',
    title: 'About XStudioz — An Independent Design Studio',
    description:
      'XStudioz is small on purpose. You work directly with the people who draw — no account managers, no hand-offs, no templates dressed up as design. Here is how the studio works.',
    label: 'The Studio',
    entry: 'page',
    priority: 0.7,
    changefreq: 'yearly',
    parent: '/',
    summary:
      'About the studio: who XStudioz is, how it is structured, what it believes about brand design, and who it works with.',
  },
  {
    route: '/process/',
    file: 'process/index.html',
    title: 'Our Process — How a Brand Gets Made | XStudioz',
    description:
      'Brief, directions, refinement, delivery. The four stages every XStudioz project runs through — what happens at each, what you receive, and how long it takes.',
    label: 'The Process',
    entry: 'page',
    priority: 0.75,
    changefreq: 'yearly',
    parent: '/',
    summary:
      'The four-stage design process — brief, directions, refinement, delivery — with timelines and what the client receives at each stage.',
  },
  {
    route: '/faq/',
    file: 'faq/index.html',
    title: 'Logo & Branding FAQ — Cost, Time, Files | XStudioz',
    description:
      'Straight answers about hiring a brand designer: what a logo costs and why, how long branding takes, which files you should receive, who owns the copyright, and more.',
    label: 'FAQ',
    entry: 'page',
    priority: 0.85,
    changefreq: 'monthly',
    parent: '/',
    summary:
      'Frequently asked questions about logo and brand design: pricing, timelines, revisions, file formats, copyright ownership, and trademark.',
  },

  /* ---- Journal ---- */
  {
    route: '/journal/',
    file: 'journal/index.html',
    title: 'Journal — Notes on Logos & Brand Design | XStudioz',
    description:
      'Working notes from an independent brand studio: what logos cost and why, the difference between a logo and an identity, and which files you should walk away with.',
    label: 'Journal',
    entry: 'page',
    priority: 0.7,
    changefreq: 'weekly',
    parent: '/',
    summary: 'Index of journal articles about logo design, brand identity, and hiring a designer.',
  },
  {
    route: '/journal/what-a-logo-costs/',
    file: 'journal/what-a-logo-costs/index.html',
    title: 'What a Logo Actually Costs, and Why | XStudioz',
    description:
      'Logo prices run from $5 to $50,000 for what looks like the same deliverable. Here is what actually changes between those numbers, and what you are really paying for.',
    label: 'What a logo actually costs',
    entry: 'page',
    priority: 0.6,
    changefreq: 'yearly',
    ogType: 'article',
    published: '2026-08-17',
    parent: '/journal/',
    summary:
      'Explains logo design pricing tiers from marketplace gigs to studio engagements, what drives cost, and how to judge value.',
  },
  {
    route: '/journal/logo-vs-brand-identity/',
    file: 'journal/logo-vs-brand-identity/index.html',
    title: 'Logo vs Brand Identity: The Difference | XStudioz',
    description:
      'A logo is one asset. A brand identity is the system that tells you what to do with it. Here is where the line sits, and how to know which one you actually need.',
    label: 'Logo vs brand identity',
    entry: 'page',
    priority: 0.6,
    changefreq: 'yearly',
    ogType: 'article',
    published: '2026-08-17',
    parent: '/journal/',
    summary:
      'Defines logo, brand identity, and brand; explains what each includes and how to decide which scope a company needs.',
  },
  {
    route: '/journal/logo-file-formats/',
    file: 'journal/logo-file-formats/index.html',
    title: 'Which Logo Files You Should Receive | XStudioz',
    description:
      'SVG, EPS, PDF, PNG, ICO — what each logo file format is for, which ones you must own, and the red flags that mean you were handed the wrong thing.',
    label: 'Which logo files you need',
    entry: 'page',
    priority: 0.6,
    changefreq: 'yearly',
    ogType: 'article',
    published: '2026-08-17',
    parent: '/journal/',
    summary:
      'Reference for logo deliverable file formats — SVG, EPS, AI, PDF, PNG, WebP, ICO — with the correct use for each and a delivery checklist.',
  },

  /* ---- Utility ---- */
  {
    route: '/404.html',
    file: '404.html',
    title: 'Page not found — XStudioz',
    description: 'That page is not part of this document.',
    label: 'Not found',
    entry: 'page',
    priority: 0,
    changefreq: 'yearly',
    noindex: true,
    summary: '404 page.',
  },
];

/* Pages that belong in sitemap.xml and llms.txt. */
export const INDEXABLE = PAGES.filter((p) => !p.noindex);

export const byRoute = (route: string): PageDef | undefined =>
  PAGES.find((p) => p.route === route);

export const abs = (path: string): string =>
  path.startsWith('http') ? path : `${SITE.origin}${path}`;
