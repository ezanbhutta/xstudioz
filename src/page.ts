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
  initWordResolve();
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
   THE WORD RESOLVE, ON A PAGE WITH NO TIMELINE

   The cover's reveal signature, brought across: words rather than characters,
   lit from the CENTRE of the line outward in both directions, from a floor of
   0.62. All three of those are stated in base.css and none of them changes
   here. What changes is the driver. The cover scrubs the opacity of each word
   against a pinned track; a document has no track, no pin and no timeline, so
   the stagger is a per-word transition delay and the trigger is an
   IntersectionObserver.

   DISPLAY LINES ONLY. Two per document at most, both of them display type at a
   display step: the masthead title and the closing call. Nothing in the
   reading column is split. A reader who came to find out what a logo costs is
   reading a document, and a paragraph that resolves under them is a slideshow.

   Everything is additive and reversible by doing nothing: the words only
   exist once this function has run, so a document whose bundle never arrives
   paints every line at full strength in its first frame.
   ------------------------------------------------------------ */

/* The masthead title, the closing call, and the 404's one line. The two
   policy pages match the first of these through the shared class, which is
   the point of selecting on class rather than adding an attribute to markup
   this session does not own. */
const DISPLAY_LINES = '.doc__head .doc__title, .doc__cta h2, .lost .doc__title';

/* One word's worth of stagger. The line resolves over roughly a fifth of a
   second either side of its centre and then holds, which is the same shape as
   the cover's reveal without the scroll distance it has to spend it over. */
const WORD_STEP = 0.055;

/* Each word becomes its own inline-block span with real whitespace between
   them, so the line still wraps, the accessible name is still the sentence,
   and no glyph is addressed on its own. */
function splitWords(host: HTMLElement): HTMLElement[] {
  const source = (host.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (!source) return [];

  const words: HTMLElement[] = [];
  const frag = document.createDocumentFragment();

  source.split(' ').forEach((word, i) => {
    if (i > 0) frag.appendChild(document.createTextNode(' '));
    const w = document.createElement('span');
    w.className = 'scrub-word';
    w.textContent = word;
    frag.appendChild(w);
    words.push(w);
  });

  host.textContent = '';
  host.appendChild(frag);

  return words;
}

function initWordResolve(): void {
  if (prefersReduced) return;

  const lines = Array.from(document.querySelectorAll<HTMLElement>(DISPLAY_LINES));
  if (!lines.length) return;

  const hosts: HTMLElement[] = [];

  lines.forEach((line) => {
    /* These titles are set as two <span class="line"> rows on purpose and the
       rows are load bearing: they are what stops a display line from
       rewrapping under its own leading. So each row is split in place and the
       words are collected ACROSS the rows, which is what makes the centre the
       centre of the whole title rather than of one row of it. */
    const rows = Array.from(line.querySelectorAll<HTMLElement>('.line__in'));
    const words = (rows.length ? rows : [line]).flatMap(splitWords);
    if (!words.length) return;

    const mid = (words.length - 1) / 2;
    words.forEach((w, i) => {
      w.style.transitionDelay = `${(Math.abs(i - mid) * WORD_STEP).toFixed(3)}s`;
    });

    line.setAttribute('data-words', '');
    hosts.push(line);
  });

  if (!hosts.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-lit');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px' }
  );

  hosts.forEach((el) => observer.observe(el));

  /* Same guarantee as the section arrivals: no code path may leave readable
     text below full strength because a trigger never fired. */
  window.setTimeout(() => hosts.forEach((el) => el.classList.add('is-lit')), 4000);
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
