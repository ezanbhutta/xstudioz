/* ============================================================
   XStudioz: the cover

   This file boots the homepage and owns nothing else. Everything that has to
   behave identically on every document, the header, the reveal failsafe and
   the static QA mode, lives in lib/motion.ts. The cover's own choreography
   lives in motion/cover.ts.

   What used to be here and is gone: the hero's measurement pass, the
   parse-time clearspace violation, the scrubbed dimension-line track, the
   pointer caliper, and the two shunt chains. That machinery drew a technical
   sheet in a near-black room. The page is a set of flat coloured rooms now
   and none of it applies.
   ============================================================ */

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
/* The cover shares the interior pages' consent banner and skip link. */
import './styles/doc.css';
import './styles/cover.css';

import {
  gsap,
  EASE_INOUT,
  prefersReduced,
  initNav,
  revealFailsafe,
  applyStaticScroll,
} from './lib/motion';
import { initUnit } from './lib/measure';
import { initCover } from './motion/cover';
import { initConsent } from './lib/consent';
import { initAnalytics } from './lib/analytics';

declare global {
  interface Window {
    __xzHero?: number;
  }
}

/* ------------------------------------------------------------
   Preloader

   Shown once per session: an inline script in <head> sets .show-loader on
   the first visit only, so a reload or a move between pages goes straight to
   the page. The overlay is display:none by default and that script is what
   opts in, so it can never appear on a document whose scripts failed early.

   The veil lifts on a clip and a translate and nothing else. It is the one
   full-screen animation on the site and it plays at most once a session.
   ------------------------------------------------------------ */
function initLoader(onReveal: () => void): void {
  const loader = document.getElementById('loader');
  const wanted = document.documentElement.classList.contains('show-loader');

  const done = (): void => {
    loader?.remove();
    document.documentElement.classList.remove('show-loader');
    document.body.classList.remove('is-loading');
  };

  if (!loader || !wanted || prefersReduced) {
    done();
    onReveal();
    return;
  }

  document.body.classList.add('is-loading');

  gsap
    .timeline({ onComplete: done })
    .fromTo(
      '.loader__x--fill',
      { clipPath: 'inset(100% 0 0 0)' },
      { clipPath: 'inset(0% 0 0 0)', duration: 0.7, ease: EASE_INOUT }
    )
    .fromTo('.loader__word', { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' }, 0.2)
    /* The scroll lock comes off, the cover starts, and the veil starts
       moving, all on the same frame. */
    .add(() => {
      document.body.classList.remove('is-loading');
      onReveal();
    }, '+=0.1')
    .to(loader, { yPercent: -100, duration: 0.8, ease: EASE_INOUT }, '<');
}

function boot(): void {
  /* Cancels the head watchdog, which strips html.js after 2.5s if nothing
     has claimed the page. That class is what selects the live layout for
     both sticky scenes, so the bundle has to claim it early. */
  window.__xzHero = 1;

  /* prefers-reduced-motion, ?static and the renderer-viewport heuristic are
     all decided in script and none of them trips a media query the
     stylesheet can see. This class is how CSS finds out, and it is what
     composes both scenes statically. */
  if (prefersReduced) document.documentElement.classList.add('no-motion');

  // Consent first, so nothing measures before a choice exists. This order is
  // load-bearing: initConsent sets the Consent Mode defaults the other two
  // depend on.
  initConsent();
  initAnalytics();

  /* One rect off the header's mark, published as --w, so --clearspace is
     four times something actually drawn rather than the token's fallback. */
  initUnit();

  initNav();

  initLoader(() => initCover());

  revealFailsafe();
  applyStaticScroll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
