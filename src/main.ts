/* ============================================================
   XStudioz — the cover

   This file owns the cover's own choreography and nothing else. Everything
   that has to behave identically on every document (smooth scroll, the
   header, the shared reveals, the reveal failsafe, the static QA mode) lives
   in lib/motion.ts and is imported from there.

   It used to own a second copy of all of that, forked from lib/motion.ts and
   drifted from it. See the note above initCommonReveals for the one
   behavioural difference the fork had accumulated, which is preserved.
   ============================================================ */

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
/* The cover shares the interior pages' skip link, footer index and
   question blocks, so it needs their styles too. */
import './styles/doc.css';

import {
  gsap,
  ScrollTrigger,
  EASE,
  EASE_INOUT,
  prefersReduced,
  initLenis,
  initNav,
  initCommonReveals,
  revealFailsafe,
  applyStaticScroll,
} from './lib/motion';
import { initConsent } from './lib/consent';
import { initAnalytics } from './lib/analytics';

/* ------------------------------------------------------------
   Reveals belonging to the cover alone
   ------------------------------------------------------------ */
function initCoverReveals(): void {
  if (prefersReduced) return;

  // Plates — unmask upward as they enter
  document.querySelectorAll<HTMLElement>('[data-clip]').forEach((el) => {
    const lines = el.querySelectorAll<HTMLElement>('.line__in');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: 'top 80%', once: true },
    });
    tl.fromTo(
      el,
      { clipPath: 'inset(0 0 100% 0)' },
      { clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: EASE_INOUT }
    );
    if (lines.length) {
      tl.fromTo(
        lines,
        { yPercent: 112 },
        { yPercent: 0, duration: 1.1, ease: EASE, stagger: 0.09 },
        '-=0.45'
      );
    }
  });

  // Capability rows rise in as a group
  const capRows = document.querySelectorAll<HTMLElement>('[data-cap]');
  if (capRows.length) {
    gsap.fromTo(
      capRows,
      { y: 34, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.9,
        ease: EASE,
        stagger: 0.08,
        scrollTrigger: { trigger: capRows[0], start: 'top 85%', once: true },
      }
    );
  }

  // Anatomy plate — the mark appears, then its construction guides draw in
  const anatomy = document.querySelector<HTMLElement>('[data-anatomy]');
  if (anatomy) {
    const guides = anatomy.querySelectorAll<SVGElement>('.guide');
    const mark = anatomy.querySelector<SVGElement>('.anatomy__x');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: anatomy, start: 'top 72%', once: true },
    });
    if (mark) {
      tl.fromTo(
        mark,
        { autoAlpha: 0, scale: 0.94, transformOrigin: '50% 50%' },
        { autoAlpha: 1, scale: 1, duration: 1, ease: EASE }
      );
    }
    tl.fromTo(
      guides,
      { strokeDasharray: '1', strokeDashoffset: 1, autoAlpha: 0 },
      {
        strokeDashoffset: 0,
        autoAlpha: 1,
        duration: 1.3,
        ease: EASE_INOUT,
        stagger: 0.1,
      },
      '-=0.5'
    );
  }

  // Process — the step rules draw in sequence before the steps rise
  const processRules = document.querySelectorAll<HTMLElement>('.process__rule');
  if (processRules.length) {
    gsap.fromTo(
      processRules,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 1,
        ease: EASE_INOUT,
        stagger: 0.14,
        scrollTrigger: { trigger: '.process__steps', start: 'top 85%', once: true },
      }
    );
  }

  // The scroll cue has done its job once the reader moves
  const cue = document.querySelector<HTMLElement>('.hero__scroll');
  if (cue) {
    gsap.to(cue, {
      opacity: 0,
      duration: 0.4,
      ease: 'power2.out',
      scrollTrigger: { trigger: '.hero', start: '4% top', toggleActions: 'play none none reverse' },
    });
  }
}

/* ------------------------------------------------------------
   The Mark — spec rows light up their construction guides
   ------------------------------------------------------------ */
function initAnatomyLink(): void {
  const grid = document.querySelector<HTMLElement>('.anatomy__grid');
  if (!grid || !window.matchMedia('(hover: hover)').matches) return;

  grid.querySelectorAll<HTMLElement>('[data-spec]').forEach((row) => {
    row.addEventListener('mouseenter', () =>
      grid.setAttribute('data-active-spec', row.getAttribute('data-spec') || '')
    );
    row.addEventListener('mouseleave', () => grid.removeAttribute('data-active-spec'));
  });
}

/* ------------------------------------------------------------
   Hero entrance — the strongest moment on the site, and the only
   one that runs on load rather than on scroll.
   ------------------------------------------------------------ */
function heroIntro(): void {
  if (prefersReduced) return;

  /* The three lines rise in sequence, timed so the strike crossing behind them
     arrives with the payoff line rather than ahead of it. The strike itself is
     CSS, so it plays whether or not this runs. */
  gsap
    .timeline({ defaults: { ease: EASE } })
    .fromTo(
      '.hero__title .line__in',
      { yPercent: 112 },
      { yPercent: 0, duration: 1.15, stagger: 0.11 },
      0.1
    )
    .fromTo(
      '.hero [data-reveal="fade"]',
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, stagger: 0.07 },
      0.45
    );
}

/* ------------------------------------------------------------
   Preloader

   Shown once per session: an inline script in <head> sets .show-loader on
   the first visit only, so a reload or a move between pages goes straight to
   the page. The overlay is display:none by default and that script is what
   opts in, so it can never appear on a document whose scripts failed early.

   The handoff. The veil begins to lift and the hero entrance begins in the
   same frame, so the hero is already moving while it is being revealed
   rather than sitting finished behind a screen or, worse, starting over
   once the screen has gone. Nothing is animated twice and there is no
   moment where the hero exists but cannot be seen.

   The mark's fill is a clip rather than a transform, which is the one place
   in this file that ignores the transform/opacity rule. A rising fill cannot
   be expressed as a transform without counter-scaling the artwork inside it,
   and this is a single 110px element animated once per session. Everything
   else here, including the veil itself, is transform and opacity.
   ------------------------------------------------------------ */
function initLoader(onReveal: () => void): void {
  const loader = document.getElementById('loader');
  const wanted = document.documentElement.classList.contains('show-loader');

  const clear = (): void => {
    loader?.remove();
    document.documentElement.classList.remove('show-loader');
    document.body.classList.remove('is-loading');
  };

  if (!loader || !wanted || prefersReduced) {
    clear();
    onReveal();
    return;
  }

  document.body.classList.add('is-loading');

  gsap
    .timeline({ onComplete: clear })
    .fromTo(
      '.loader__x--fill',
      { clipPath: 'inset(100% 0 0 0)' },
      { clipPath: 'inset(0% 0 0 0)', duration: 0.7, ease: EASE_INOUT }
    )
    .fromTo('.loader__word', { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' }, 0.2)
    // The scroll lock comes off, the hero starts, and the veil starts moving,
    // all on the same frame.
    .add(() => {
      document.body.classList.remove('is-loading');
      onReveal();
    }, '+=0.1')
    .to(loader, { yPercent: -100, duration: 0.8, ease: EASE_INOUT }, '<');
}

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
function boot(): void {
  // Consent first, so nothing measures before a choice exists. This order is
  // load-bearing: initConsent sets the Consent Mode defaults that the other
  // two depend on.
  initConsent();
  initAnalytics();

  const lenis = initLenis();
  initNav(lenis);
  initCommonReveals(document, { headlineStart: 'top 85%' });
  initCoverReveals();
  initAnatomyLink();

  initLoader(() => {
    heroIntro();
    // Trigger positions were measured while the loader held the scrollbar
    requestAnimationFrame(() => ScrollTrigger.refresh());
  });

  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  revealFailsafe();
  applyStaticScroll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
