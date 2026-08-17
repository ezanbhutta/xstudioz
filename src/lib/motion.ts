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

  /* The scroll handler runs on every frame Lenis produces, so it holds the two
     class states itself and only touches the DOM when one actually flips.
     Calling classList.toggle/add/remove unconditionally meant a style
     invalidation on the header sixty times a second to re-assert values that
     were already correct. */
  let scrolled: boolean | null = null;
  let hidden: boolean | null = null;

  const setScrolled = (next: boolean) => {
    if (scrolled === next) return;
    scrolled = next;
    nav.classList.toggle('nav--scrolled', next);
  };

  const setHidden = (next: boolean) => {
    if (hidden === next) return;
    hidden = next;
    nav.classList.toggle('nav--hidden', next);
  };

  const onScroll = (y: number) => {
    setScrolled(y > 24);
    if (suppressed) {
      lastY = y;
      return;
    }
    if (y > 480 && y > lastY + 4) setHidden(true);
    else if (y < lastY - 4) setHidden(false);
    lastY = y;
  };
  onScroll(window.scrollY);

  if (lenis) lenis.on('scroll', (e: { scroll: number }) => onScroll(e.scroll));
  else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });

  // Keyboard focus inside the header must always bring it back on screen
  // Through setHidden, not the DOM directly: writing the class behind the
  // cache's back would leave it believing the header is still hidden, and the
  // next scroll frame would decline to show it again.
  nav.addEventListener('focusin', () => setHidden(false));

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
      setHidden(false);
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

export interface CommonRevealOptions {
  /* The cover fires its headline reveals five percent earlier than the
     interior pages do. That difference predates this file: the cover carried
     its own forked copy of these reveals and the two drifted. It is preserved
     rather than quietly normalised, because collapsing the fork was supposed
     to change no behaviour. Pass nothing and you get the interior timing. */
  headlineStart?: string;
}

export function initCommonReveals(
  scope: ParentNode = document,
  { headlineStart = 'top 90%' }: CommonRevealOptions = {}
): void {
  if (prefersReduced) return;

  scope.querySelectorAll<HTMLElement>('.line__in').forEach((el) => {
    if (el.closest('.hero')) return;
    gsap.set(el, { yPercent: 112 });
  });

  scope.querySelectorAll<HTMLElement>('h1, h2, .footer__title').forEach((block) => {
    /* The hero's own h1 is choreographed by the cover's entrance timeline, so
       it must not also pick up a scroll trigger here. Without this the two
       would both own the same .line__in transform and fight over it on load:
       the trigger fires immediately, because the hero is at the top of the
       page, at the same moment the entrance is tweening the same elements. */
    if (block.closest('.hero')) return;

    const lines = block.querySelectorAll<HTMLElement>('.line__in');
    if (!lines.length) return;
    gsap.to(lines, {
      yPercent: 0,
      duration: 1.1,
      ease: EASE,
      stagger: 0.09,
      scrollTrigger: { trigger: block, start: headlineStart, once: true },
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
}

export { gsap, ScrollTrigger };
