/* ============================================================
   XStudioz: the interior documents

   Fifteen of the site's sixteen URLs boot from here, and what this file does
   not do is the point of it.

   It registers no timeline, no ScrollTrigger and no reveal. It imports
   nothing from lib/stage.ts. An interior page has no [data-stage], so
   initMeasure would return at its first line and is not called at all.

   The law is inherited whole and the apparatus is not. Nothing here animates
   its own arrival because nothing here animates anything: every element is
   painted, opaque and final in the first frame, and the only movement these
   pages have is the CSS displacement in doc.css, where a row that claims its
   clearance pushes its neighbours off it. That runs with this bundle blocked.

   What it does own: the unit, so --clearspace is real rather than the
   token's fallback; the shared chrome; consent; and the index highlight,
   which is a state and not an entrance.
   ============================================================ */

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/doc.css';
/* Deliberately not './styles/cover.css'. The hero, the capability rows, the
   construction plate and the dimension line are 31,212 bytes of CSS that no
   URL reachable from this entry can render. */

import { prefersReduced, initNav, revealFailsafe, applyStaticScroll } from './lib/motion';
import { initUnit } from './lib/measure';
import { initConsent } from './lib/consent';
import { initAnalytics } from './lib/analytics';

function boot(): void {
  // Consent first, so nothing measures before a choice exists. This order is
  // load-bearing: initConsent sets the Consent Mode defaults the other two
  // depend on.
  initConsent();
  initAnalytics();

  /* The unit before anything that spends it. One rect off the nav mark,
     published as --w on the root, so --clearspace resolves to four times the
     mark actually drawn in this page's header. It bails on any document that
     has a [data-stage], which is the cover, so the two never fight. */
  initUnit();

  if (prefersReduced) document.documentElement.classList.add('no-motion');

  initNav();
  markCurrentSection();
  initSectionEnters();

  /* Kept, and near enough free: an interior page registers no ScrollTrigger
     at all, so this is one timer over an empty list. It stays because the
     guarantee it encodes, no code path may leave readable content in a
     state a reader cannot get out of, is a property of the site, not of the
     reveals it used to police, and a later section on one of these pages
     must inherit it rather than rediscover it. */
  revealFailsafe();

  applyStaticScroll();
}

/* ------------------------------------------------------------
   Section arrivals

   The one piece of motion an interior document has, and it is deliberately
   not the cover's machinery: no timeline, no ScrollTrigger, no stage. An
   IntersectionObserver adds a class and CSS does the rest, with the
   from-state declared in doc.css behind html.js so a document whose bundle
   never arrives is painted finished in its first frame.

   Same vocabulary as the cover: opacity and y, 20px of travel, half a
   second, once. A reading page is read, so nothing here scrubs, nothing
   pins, and no paragraph is split into characters.
   ------------------------------------------------------------ */
function initSectionEnters(): void {
  if (prefersReduced) return;

  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-enter]'));
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px' }
  );

  targets.forEach((el) => observer.observe(el));

  /* No code path may leave readable text at an opacity a reader cannot get
     out of. If a trigger has not fired within four seconds, everything is
     handed back regardless of where the page is. */
  window.setTimeout(() => targets.forEach((el) => el.classList.add('is-in')), 4000);
}

/* The section index highlights whichever section is in view. Purely a state
   readout: it changes a colour, moves nothing, and the links work regardless.
   IntersectionObserver rather than a ScrollTrigger, so it costs nothing and
   does not put this page in the business of scroll-driven animation. */
function markCurrentSection(): void {
  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('.doc__index a[href^="#"]')
  );
  if (!links.length) return;

  const byId = new Map(links.map((a) => [a.getAttribute('href')!.slice(1), a]));
  const sections = Array.from(byId.keys())
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => Boolean(el));
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.remove('is-current'));
        byId.get(entry.target.id)?.classList.add('is-current');
      });
    },
    { rootMargin: '-20% 0px -70% 0px' }
  );

  sections.forEach((s) => observer.observe(s));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
