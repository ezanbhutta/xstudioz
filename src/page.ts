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

import { prefersReduced, initNav, applyStaticScroll } from './lib/motion';
import { initArrivals } from './lib/arrive';
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
  initArrivals();

  applyStaticScroll();
}

/* ------------------------------------------------------------
   THE WORD RESOLVE IS DELETED.

   Every display line on a document, the masthead title and the closing call,
   was broken into per-word spans and lit from the centre of the line outward
   in both directions on a 0.055s stagger, from a floor of 0.62.

   Two reasons, and the second is why it could not simply be shortened.

   It is the wrong vocabulary. A heading that assembles itself one word at a
   time is an animation being played at the reader, and any frame caught part
   way through shows a title with holes in it. The law now asks for material
   answering a pointer, and a heading is not a control.

   And it rewrote text. splitWords read textContent, cleared the element and
   rebuilt it out of spans, on fifteen routes whose copy is frozen. A reveal
   worth 0.2s is not worth a function that can damage a sentence.

   Display lines now arrive with the section they belong to, on [data-enter],
   which is one mechanism for the whole site instead of two.
   ------------------------------------------------------------ */

/* ------------------------------------------------------------
   SECTION ARRIVALS MOVED TO src/lib/arrive.ts, and the function that used to
   be here was doing nothing at all.

   It queried `[data-enter]`, and `grep -c data-enter` over the fifteen
   interior routes returned zero on every one of them. It then registered an
   IntersectionObserver over that empty list and a four-second failsafe over
   the same empty list, on every document, on every load. The CSS it was
   written against, in doc.css, was gated on `html.js`, and no interior page
   has ever carried the inline script that adds that class. Three layers of a
   mechanism, none of which could reach the other two.

   Both of those are repaired: the sections below now carry the attribute,
   and the shared module hangs the from-state off a keyframe instead of off
   the resting element, so a document whose bundle never boots is still the
   finished document rather than a blank one.
   ------------------------------------------------------------ */

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
