import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
/* The cover shares the interior pages' skip link, footer index and
   question blocks, so it needs their styles too. */
import './styles/doc.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { initConsent } from './lib/consent';
import { initAnalytics } from './lib/analytics';

gsap.registerPlugin(ScrollTrigger);

const staticMode = new URLSearchParams(window.location.search).has('static');

/* A viewport this shape belongs to a rendering engine, not a person.
   Google's web rendering service and most social-card renderers either
   expand the viewport to an enormous height instead of scrolling, or report
   no height at all. Either way a scroll-triggered reveal may never fire and
   the content would sit at opacity 0 forever. Serving them the static page
   is deterministic where waiting on a ScrollTrigger is not. Both bounds sit
   far outside any real display, and a false positive costs nothing but the
   animation. */
const viewportH = window.innerHeight;
const rendererViewport = viewportH < 240 || viewportH > 3500;

const prefersReduced =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  staticMode ||
  rendererViewport;
const EASE = 'expo.out';
const EASE_INOUT = 'power4.inOut';

/* ------------------------------------------------------------
   Smooth scroll
   ------------------------------------------------------------ */
let lenis: Lenis | null = null;

function initLenis(): void {
  if (prefersReduced) return;
  lenis = new Lenis({ lerp: 0.115, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ------------------------------------------------------------
   Nav — solid after scroll, hides going down, returns going up
   ------------------------------------------------------------ */
let navScrollSuppressed = false;

function initNav(): void {
  const nav = document.getElementById('nav');
  if (!nav) return;

  let lastY = window.scrollY;
  const onScroll = (y: number) => {
    nav.classList.toggle('nav--scrolled', y > 24);
    if (navScrollSuppressed) {
      lastY = y;
      return;
    }
    if (y > 480 && y > lastY + 4) nav.classList.add('nav--hidden');
    else if (y < lastY - 4) nav.classList.remove('nav--hidden');
    lastY = y;
  };
  onScroll(window.scrollY);

  if (lenis) lenis.on('scroll', (e: { scroll: number }) => onScroll(e.scroll));
  else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });

  // Keyboard focus inside the header must always bring it back on screen
  nav.addEventListener('focusin', () => nav.classList.remove('nav--hidden'));

  // In-page anchors go through Lenis so easing stays consistent,
  // keep the URL hash honest, and hand focus to the target section.
  //
  // The shared nav links to /#capabilities rather than #capabilities, because
  // that anchor has to resolve from the interior pages too. So match on any
  // link carrying a hash and keep only the ones pointing at this very
  // document — everywhere else the browser should just navigate.
  document.querySelectorAll<HTMLAnchorElement>('a[href*="#"]').forEach((a) => {
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname !== window.location.pathname) return;
    if (!url.hash || url.hash === '#') return;

    a.addEventListener('click', (ev) => {
      const id = url.hash;
      const target = document.querySelector<HTMLElement>(id);
      if (!target) return;
      ev.preventDefault();
      history.pushState(null, '', id);
      const finish = () => {
        navScrollSuppressed = false;
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      };
      navScrollSuppressed = true;
      nav.classList.remove('nav--hidden');
      if (lenis) {
        lenis.scrollTo(target, { offset: 0, duration: 1.4, onComplete: finish });
      } else {
        target.scrollIntoView();
        finish();
      }
    });
  });
}

/* ------------------------------------------------------------
   Scroll-driven reveals
   ------------------------------------------------------------ */
function initReveals(): void {
  if (prefersReduced) return;

  // Headline line reveals (outside the hero, which runs on load)
  document.querySelectorAll<HTMLElement>('.line__in').forEach((el) => {
    if (el.closest('.hero')) return;
    gsap.set(el, { yPercent: 112 });
  });

  document.querySelectorAll<HTMLElement>('h2, .footer__title').forEach((block) => {
    const lines = block.querySelectorAll<HTMLElement>('.line__in');
    if (!lines.length) return;
    gsap.to(lines, {
      yPercent: 0,
      duration: 1.1,
      ease: EASE,
      stagger: 0.09,
      scrollTrigger: { trigger: block, start: 'top 85%', once: true },
    });
  });

  // Soft fades — opacity only, so content never leaves the accessibility tree
  document.querySelectorAll<HTMLElement>('[data-reveal="fade"]').forEach((el) => {
    if (el.closest('.hero')) return;
    gsap.fromTo(
      el,
      { y: 22, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.9,
        ease: EASE,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      }
    );
  });

  // Hairlines draw from the left
  document.querySelectorAll<HTMLElement>('[data-rule]').forEach((el) => {
    if (el.closest('.hero')) return;
    gsap.fromTo(
      el,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 1.2,
        ease: EASE_INOUT,
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      }
    );
  });

  // Notched rules — three segments draw in sequence
  document.querySelectorAll<HTMLElement>('[data-rule-notch]').forEach((el) => {
    const segs = el.querySelectorAll('i');
    gsap.fromTo(
      segs,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 0.8,
        ease: EASE_INOUT,
        stagger: 0.12,
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      }
    );
  });

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

  // Hero X — slow parallax drift on the inner svg; the wrapper stays free
  // for the entrance tween so the two never fight over one transform.
  const heroXInner = document.querySelector<HTMLElement>('.hero__x-svg');
  if (heroXInner) {
    gsap.to(heroXInner, {
      yPercent: -16,
      rotation: 8,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.6,
      },
    });
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
   Hero X — answers the pointer with a few quiet degrees
   ------------------------------------------------------------ */
function initHeroPointer(): void {
  if (prefersReduced || !window.matchMedia('(pointer: fine)').matches) return;

  const hero = document.querySelector<HTMLElement>('.hero');
  const x = document.querySelector<HTMLElement>('[data-hero-x]');
  if (!hero || !x) return;

  const rotTo = gsap.quickTo(x, 'rotation', { duration: 1.1, ease: 'power3.out' });
  const yTo = gsap.quickTo(x, 'y', { duration: 1.1, ease: 'power3.out' });

  hero.addEventListener('pointermove', (e) => {
    if (!heroReady) return;
    const nx = e.clientX / window.innerWidth - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    rotTo(nx * 6);
    yTo(ny * 14);
  });

  hero.addEventListener('pointerleave', () => {
    if (!heroReady) return;
    rotTo(0);
    yTo(0);
  });
}

/* ------------------------------------------------------------
   Running folio — the fixed page indicator follows the chapter
   ------------------------------------------------------------ */
function initFolio(): void {
  const folio = document.getElementById('folio');
  if (!folio) return;

  // The furniture is display:none below 1024px — don't observe for nothing
  if (!window.matchMedia('(min-width: 1024px)').matches) return;

  const sections = document.querySelectorAll<HTMLElement>('[data-folio]');
  if (!sections.length) return;

  let pending = folio.textContent || '';
  let running: gsap.core.Timeline | null = null;

  const swap = (text: string) => {
    if (pending === text) return;
    pending = text;
    if (prefersReduced) {
      folio.textContent = text;
      return;
    }
    running?.kill();
    running = gsap
      .timeline()
      .to(folio, { yPercent: -110, duration: 0.28, ease: 'power2.in' })
      .add(() => (folio.textContent = text))
      .set(folio, { yPercent: 110 })
      .to(folio, { yPercent: 0, duration: 0.34, ease: 'power2.out' });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) swap(entry.target.getAttribute('data-folio') || '');
      });
    },
    { rootMargin: '-45% 0px -45% 0px' }
  );

  sections.forEach((s) => observer.observe(s));

  // The running labels only appear between the cover and the colophon,
  // so they never collide with either frame's own meta rows.
  const furniture = document.querySelector<HTMLElement>('.furniture');
  const hero = document.querySelector<HTMLElement>('.hero');
  const footer = document.querySelector<HTMLElement>('.footer');
  if (furniture && hero && footer) {
    let heroVisible = true;
    let footerVisible = false;
    const apply = () =>
      furniture.classList.toggle('furniture--on', !heroVisible && !footerVisible);
    const edges = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === hero) heroVisible = entry.isIntersecting;
        if (entry.target === footer) footerVisible = entry.isIntersecting;
      });
      apply();
    });
    edges.observe(hero);
    edges.observe(footer);
  }
}

/* ------------------------------------------------------------
   Hero entrance — runs once the loader clears
   ------------------------------------------------------------ */
let heroReady = false;

function heroIntro(): void {
  if (prefersReduced) {
    heroReady = true;
    return;
  }

  gsap
    .timeline({ defaults: { ease: EASE }, onComplete: () => (heroReady = true) })
    .fromTo(
      '.hero__rule-top, .hero__rule-bot',
      { scaleX: 0 },
      { scaleX: 1, duration: 1.4, ease: EASE_INOUT },
      0
    )
    .fromTo(
      '.hero__title .line__in',
      { yPercent: 112 },
      { yPercent: 0, duration: 1.2, stagger: 0.1 },
      0.15
    )
    .fromTo(
      '[data-hero-x]',
      { opacity: 0, scale: 0.9, rotation: -10 },
      { opacity: 1, scale: 1, rotation: 0, duration: 1.5, ease: EASE },
      0.35
    )
    .fromTo(
      '.hero [data-reveal="fade"]',
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, stagger: 0.06 },
      0.55
    );
}

/* ------------------------------------------------------------
   Loader — gradient fills the mark, then the frame lifts away.
   The overlay is hidden by default in CSS; a tiny inline script in
   <head> opts in to it for first visits, so a JS failure can never
   leave the page covered.
   ------------------------------------------------------------ */
function initLoader(onDone: () => void): void {
  const loader = document.getElementById('loader');
  const wanted = document.documentElement.classList.contains('show-loader');

  if (!loader || !wanted || prefersReduced) {
    loader?.remove();
    document.documentElement.classList.remove('show-loader');
    onDone();
    return;
  }

  document.body.classList.add('is-loading');

  gsap
    .timeline({
      onComplete: () => {
        loader.remove();
        document.documentElement.classList.remove('show-loader');
      },
    })
    .fromTo(
      '.loader__x--grad',
      { clipPath: 'inset(100% 0 0 0)' },
      { clipPath: 'inset(0% 0 0 0)', duration: 0.9, ease: EASE_INOUT, delay: 0.15 }
    )
    .fromTo('.loader__word', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.3)
    .add(() => {
      document.body.classList.remove('is-loading');
      onDone();
    }, '-=0.1')
    .to(loader, { yPercent: -101, duration: 0.85, ease: EASE_INOUT }, '+=0.15');
}

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
function boot(): void {
  // Consent first, so nothing measures before a choice exists.
  initConsent();
  initAnalytics();

  initLenis();
  initNav();
  initReveals();
  initFolio();
  initAnatomyLink();
  initHeroPointer();
  initLoader(() => {
    heroIntro();
    // Trigger positions were measured while the loader froze the scrollbar
    requestAnimationFrame(() => ScrollTrigger.refresh());
  });

  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  // No code path may leave readable text sitting at opacity 0. Only
  // elements already at or above the fold are forced — those should have
  // played on load, so if they are still hidden seconds later their trigger
  // mismeasured. Anything genuinely below the fold is left alone, so a
  // reader who lingers before scrolling still gets the animation.
  if (!prefersReduced) {
    window.setTimeout(() => {
      const fold = window.innerHeight;
      ScrollTrigger.getAll().forEach((st) => {
        if (st.progress > 0) return;
        const el = st.trigger as HTMLElement | null;
        if (!el) return;
        if (fold === 0 || el.getBoundingClientRect().top < fold) {
          st.animation?.progress(1);
        }
      });
    }, 4000);
  }

  // QA helper: /?static&scroll=1200 shifts the page up by a fixed offset
  // (headless screenshots can't scroll reliably, so we translate instead)
  if (staticMode) {
    const target = Number(new URLSearchParams(window.location.search).get('scroll') || 0);
    if (target > 0) {
      document.body.style.transform = `translateY(-${target}px)`;
      document.getElementById('nav')?.style.setProperty('display', 'none');
      document.querySelector<HTMLElement>('.furniture')?.style.setProperty('display', 'none');
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
