/* ============================================================
   XStudioz site manifest
   The single source of truth for routing, <head>, sitemap.xml,
   robots.txt and llms.txt. Add a page here and everything else
   follows; nothing about a page is declared in two places.
   ============================================================ */

export const SITE = {
  origin: 'https://xstudioz.com',
  name: 'XStudioz',
  legalName: 'XStudioz',
  tagline: 'Independent brand design agency',
  /* One sentence, used wherever a neutral description of the agency is needed. */
  blurb:
    'XStudioz is an independent brand design agency creating logos, brand identities and the systems that carry them for founders worldwide.',
  email: 'inquire@xstudioz.com',
  portfolio: 'https://portfolio.xstudioz.com',
  locale: 'en_US',
  lang: 'en',
  /* Chromatic event of the brand, used for theme-color and schema. */
  brandColor: '#e634be',
  themeColor: '#e5e4e0',
  ogImage: '/og.png',
  ogImageAlt: 'XStudioz. A logo is a mark, a brand is a promise.',
  /* Verified external profiles. Every URL here becomes an Organization
     `sameAs` edge, which is how search engines and LLMs resolve the string
     "XStudioz" to a single real entity rather than to one of the several
     similarly named design companies it currently outranks it for its own
     name.

     Both entries below were fetched and confirmed live, and confirmed as
     owned by the agency. Nothing goes in this list on a name match alone:
     several unrelated accounts use the string "xstudioz".

     Not listed on purpose: portfolio.xstudioz.com is our own subdomain
     rather than an external profile, and is already linked from every page. */
  sameAs: [
    'https://www.fiverr.com/x_studioz',
    'https://www.behance.net/xstudioz',
  ] as string[],
  founded: '2024',
  /* Global agency, deliberately no postal address. areaServed is the world. */
  areaServed: 'Worldwide',
};

/* ------------------------------------------------------------
   Measurement

   Nothing here runs until `enabled` is true, and nothing sets a cookie
   until the visitor actively accepts. The interlock is deliberate: the
   agency is UK based, so PECR applies, and PECR wants consent BEFORE
   a non-essential cookie is written rather than after.

   `enabled` stays false until the privacy and cookie policies exist at
   the paths below, because a consent banner that links to a missing
   page is worse than no banner. Flip it in one place when they are live.
   ------------------------------------------------------------ */

export const ANALYTICS = {
  enabled: false,

  /* Google Analytics 4. Loaded with Consent Mode v2 defaulting to denied,
     so the tag is present but writes no cookie until consent is granted. */
  ga4Id: 'G-RTWEXCM20Y',

  /* Microsoft Clarity. Not loaded at all until consent is granted.
     Clarity drops five third-party Microsoft cookies including MUID, which
     Microsoft documents as serving advertising, so it is held back further
     than GA4 rather than merely consent-moded. Microsoft also began
     enforcing consent signals for UK visitors on 31 October 2025. */
  clarityId: 'y3qvzdsn1o',

  /* The banner links here. Both must exist before `enabled` goes true. */
  privacyPath: '/privacy/',
  cookiePath: '/cookies/',

  /* Scroll depth is only measured on these routes. Sending it sitewide
     would multiply event volume for no insight. */
  scrollRoutes: [
    '/logo-design/',
    '/brand-identity/',
    '/brand-guidelines/',
    '/social-media-kits/',
    '/stationery/',
  ] as string[],
};

export type Entry = 'home' | 'page';

export interface PageDef {
  /** Public URL path, always with a trailing slash except the 404. */
  route: string;
  /** Source HTML relative to the project root. Also the rollup input. */
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
  /** og:type. Use 'article' for journal entries. */
  ogType?: 'website' | 'article';
  /** Keep out of the index and the sitemap. */
  noindex?: boolean;
  /** ISO date, journal entries only. */
  published?: string;
  /** ISO date. Falls back to the build date. */
  modified?: string;
  /** Parent route, used to build the BreadcrumbList. */
  parent?: string;
  /** One-line summary for llms.txt. Write it for a machine reader. */
  summary: string;
}

/* ------------------------------------------------------------
   Pages
   ------------------------------------------------------------ */

export const PAGES: PageDef[] = [
  {
    route: '/',
    file: 'index.html',
    title: 'XStudioz | Brand and Logo Design Agency',
    description:
      'Independent brand design agency. We draw custom logos, build brand identities, and write the guidelines that hold them together, for founders worldwide.',
    label: 'Home',
    entry: 'home',
    priority: 1.0,
    changefreq: 'monthly',
    summary:
      'Agency homepage. Who XStudioz is, the five capabilities, the four stage process, and how to start a project.',
  },

  /* ---- Services ---- */
  {
    route: '/logo-design/',
    file: 'logo-design/index.html',
    title: 'Custom Logo Design for Founders | XStudioz',
    description:
      'Custom logo design for founders. One mark, drawn until it holds, delivered with full vector masters, every file format and written usage rules.',
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
    title: 'Brand Identity Design Services | XStudioz',
    description:
      'Brand identity design covering colour, typography, layout and voice, plus the rules that keep them consistent everywhere your company shows up.',
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
    title: 'Brand Guidelines Design | XStudioz',
    description:
      'Brand guidelines your team will actually open. Clear rules for logo, colour, type and tone, written in plain language so the brand survives real work.',
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
    title: 'Social Media Kit Design | XStudioz',
    description:
      'Social media kits built as a system. Editable templates, profile assets and post layouts sized for every platform, so everything you publish stays yours.',
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
    title: 'Stationery and Collateral Design | XStudioz',
    description:
      'Business cards, letterheads, invoices, decks and signage. Print ready stationery designed as part of the identity, with specs any supplier can work from.',
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
    title: 'About XStudioz | Independent Brand Design Agency',
    description:
      'XStudioz is a small independent brand design agency. You work directly with the people who draw, with no account managers and nobody to pass your work to.',
    label: 'The Studio',
    entry: 'page',
    priority: 0.7,
    changefreq: 'yearly',
    parent: '/',
    summary:
      'About the agency. Who XStudioz is, how it is structured, what it believes about brand design, and who it works with.',
  },
  {
    route: '/process/',
    file: 'process/index.html',
    title: 'How We Design a Brand | XStudioz',
    description:
      'Brief, directions, refinement, delivery. The four stages every XStudioz project runs through, what happens inside each one, and how long the whole thing takes.',
    label: 'The Process',
    entry: 'page',
    priority: 0.75,
    changefreq: 'yearly',
    parent: '/',
    summary:
      'The four stage design process (brief, directions, refinement, delivery) with timelines and what the client receives at each stage.',
  },
  {
    route: '/faq/',
    file: 'faq/index.html',
    title: 'Logo and Branding FAQ | XStudioz',
    description:
      'Straight answers about hiring a brand designer. What a logo costs and why, how long branding takes, which files you should get, and who owns the copyright.',
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
    title: 'Brand Design Journal | XStudioz',
    description:
      'Working notes from an independent brand design agency. What logos cost and why, the difference between a logo and an identity, and which files you should own.',
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
      'Logo prices run from $5 to $50,000 for what looks like the same deliverable. Here is what actually changes between those numbers.',
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
    title: 'Logo vs Brand Identity Explained | XStudioz',
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
      'SVG, EPS, PDF, PNG and ICO. What each logo file format is for, which ones you must own, and the red flags that mean you were handed the wrong thing.',
    label: 'Which logo files you need',
    entry: 'page',
    priority: 0.6,
    changefreq: 'yearly',
    ogType: 'article',
    published: '2026-08-17',
    parent: '/journal/',
    summary:
      'Reference for logo deliverable file formats (SVG, EPS, AI, PDF, PNG, WebP, ICO) with the correct use for each and a delivery checklist.',
  },

  /* ---- Utility ---- */
  {
    route: '/404.html',
    file: '404.html',
    title: 'Page not found | XStudioz',
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
