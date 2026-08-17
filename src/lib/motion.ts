/* ============================================================
   XStudioz — Shared motion + chrome
   Everything both the cover (main.ts) and the interior pages
   (page.ts) need. Section-specific choreography stays in its
   own entry; this file owns only what must behave identically
   on every document.
   ============================================================ */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export const staticMode = new URLSearchParams(window.location.search).has('static');

/* A viewport this shape belongs to a rendering engine, not a person.
   Google's web rendering service and most social-card renderers either
   expand the viewport to an enormous height instead of scrolling, or report
   no height at all. Either way a scroll-triggered reveal may never fire and
   the content would sit at opacity 0 forever. Serving them the static page
   is deterministic where waiting on a ScrollTrigger is not.

   Both bounds sit far outside any real display, and the only cost of a false
   positive is that someone sees the page without its animation. */
const h = window.innerHeight;
const rendererViewport = h < 240 || h > 3500;

export const prefersReduced =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  staticMode ||
  rendererViewport;

export const EASE = 'expo.out';
export const EASE_INOUT = 'power4.inOut';

/* ------------------------------------------------------------
   Smooth scroll
   ------------------------------------------------------------ */

export function initLenis(): Lenis | null {
  if (prefersReduced) return null;
  const lenis = new Lenis({ lerp: 0.115, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

/* ------------------------------------------------------------
   Nav — solid after scroll, hides going down, returns going up
   ------------------------------------------------------------ */

export function initNav(lenis: Lenis | null): void {
  const nav = document.getElementById('nav');
  if (!nav) return;

  let suppressed = false;
  let lastY = window.scrollY;

  const onScroll = (y: number) => {
    nav.classList.toggle('nav--scrolled', y > 24);
    if (suppressed) {
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

  /* Same-document hash links go through Lenis so easing stays consistent,
     keep the URL hash honest, and hand focus to the target section.
     Links such as /#capabilities are same-document only on the cover —
     everywhere else they must navigate normally. */
  document.querySelectorAll<HTMLAnchorElement>('a[href*="#"]').forEach((a) => {
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname !== window.location.pathname) return;
    if (!url.hash || url.hash === '#') return;

    a.addEventListener('click', (ev) => {
      const target = document.querySelector<HTMLElement>(url.hash);
      if (!target) return;
      ev.preventDefault();
      history.pushState(null, '', url.hash);

      const finish = () => {
        suppressed = false;
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      };

      suppressed = true;
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
   Reveals shared by every document
   Opacity and transform only — text never leaves the DOM or the
   accessibility tree, so a crawler that does not run JS still
   reads the full document.
   ------------------------------------------------------------ */

export function initCommonReveals(scope: ParentNode = document): void {
  if (prefersReduced) return;

  scope.querySelectorAll<HTMLElement>('.line__in').forEach((el) => {
    if (el.closest('.hero')) return;
    gsap.set(el, { yPercent: 112 });
  });

  scope.querySelectorAll<HTMLElement>('h1, h2, .footer__title').forEach((block) => {
    const lines = block.querySelectorAll<HTMLElement>('.line__in');
    if (!lines.length) return;
    gsap.to(lines, {
      yPercent: 0,
      duration: 1.1,
      ease: EASE,
      stagger: 0.09,
      scrollTrigger: { trigger: block, start: 'top 90%', once: true },
    });
  });

  scope.querySelectorAll<HTMLElement>('[data-reveal="fade"]').forEach((el) => {
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

  scope.querySelectorAll<HTMLElement>('[data-rule]').forEach((el) => {
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

  scope.querySelectorAll<HTMLElement>('[data-rule-notch]').forEach((el) => {
    gsap.fromTo(
      el.querySelectorAll('i'),
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
}

/* ------------------------------------------------------------
   Reveal failsafe
   No code path may leave readable text sitting at opacity 0.

   Only elements that are already at or above the fold are forced —
   those should have played on load, so if they are still hidden
   seconds later their trigger mismeasured and the page is broken.
   Anything genuinely below the fold is left alone, because a reader
   who lingers before scrolling should still get the animation.
   ------------------------------------------------------------ */

export function revealFailsafe(delay = 4000): void {
  if (prefersReduced) return;

  window.setTimeout(() => {
    const fold = window.innerHeight;
    ScrollTrigger.getAll().forEach((st) => {
      if (st.progress > 0) return;
      const el = st.trigger as HTMLElement | null;
      if (!el) return;
      // A zero-height viewport means nothing can ever come into view.
      if (fold === 0 || el.getBoundingClientRect().top < fold) {
        st.animation?.progress(1);
      }
    });
  }, delay);
}

/* ------------------------------------------------------------
   QA helper: /?static&scroll=1200 shifts the page up by a fixed
   offset (headless screenshots can't scroll reliably).
   ------------------------------------------------------------ */

export function applyStaticScroll(): void {
  if (!staticMode) return;
  const target = Number(new URLSearchParams(window.location.search).get('scroll') || 0);
  if (target <= 0) return;
  document.body.style.transform = `translateY(-${target}px)`;
  document.getElementById('nav')?.style.setProperty('display', 'none');
  document.querySelector<HTMLElement>('.furniture')?.style.setProperty('display', 'none');
}

export { gsap, ScrollTrigger };
