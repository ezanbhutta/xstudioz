/* ============================================================
   XStudioz: Shared motion + chrome
   Everything both the cover (main.ts) and the interior pages
   (page.ts) need. Section-specific choreography stays in its
   own entry; this file owns only what must behave identically
   on every document.
   ============================================================ */

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

/* THE ONE CURVE, and it is not named here. Two GSAP eases used to be
   exported from this file, expo.out and power4.inOut, and between them and
   the four CSS curves the stylesheets carried there were six easing shapes on
   a site that claims to have one law. Everything now takes `curve` from
   src/lib/law.ts, which is the same cubic-bezier the stylesheets take from
   --curve, evaluated in script rather than approximated by a named preset. */

/* ------------------------------------------------------------
   Scroll

   There is no smooth-scroll library on this site and there is no animation
   engine either. Both absences are the same decision.

   Lenis was lerping the wheel at 0.115 to make long scrubbed scenes feel
   luxurious. There are no scrubbed scenes now, so there is nothing for a
   lerp to smooth: native wheel scroll tracks one to one, which is what a
   page that holds still is supposed to do. GSAP went with them. The cover
   was its only caller, and what the cover does now is two class changes and
   a set of CSS transitions, so a 70KB timeline engine was being shipped to
   toggle an attribute.

   CSS `scroll-behavior: smooth` is kept. It only affects programmatic jumps,
   so anchor links still ease and the wheel still does not.
   ------------------------------------------------------------ */

/* ------------------------------------------------------------
   Nav, solid after scroll, hides going down, returns going up
   ------------------------------------------------------------ */

export function initNav(): void {
  const nav = document.getElementById('nav');
  if (!nav) return;

  let suppressed = false;
  let lastY = window.scrollY;

  /* The scroll handler runs on every scroll event, so it holds the two class
     states itself and only touches the DOM when one actually flips.
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

  window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });

  // Keyboard focus inside the header must always bring it back on screen
  // Through setHidden, not the DOM directly: writing the class behind the
  // cache's back would leave it believing the header is still hidden, and the
  // next scroll frame would decline to show it again.
  nav.addEventListener('focusin', () => setHidden(false));

  /* Same-document hash links keep the URL hash honest and hand focus to the
     target section. The scroll itself is the browser's, eased by CSS
     scroll-behavior, because a programmatic jump is the one place easing
     helps. Links such as /#capabilities are same-document only on the cover;
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
      target.scrollIntoView();
      window.setTimeout(finish, 600);
    });
  });
}

/* The shared reveal system used to live here: initCommonReveals, its
   options interface, and five branches that each set their own from-state in
   script (the .line__in mask, the heading stagger, [data-reveal="fade"], the
   rule draw and the notch segments).

   All of it is gone and nothing replaces it. That is the step rather than a
   regression: a site whose law is "nothing animates its own arrival" cannot
   also ship a generic fade-and-rise, and the correct substitute for a reveal
   is the element already being there. Every deleted branch set its from-state
   in JS rather than CSS, which is why there is nothing left to clean up and
   why these documents have always been readable with the bundle blocked.

   Nothing replaced them and nothing exports an ease from here any more: the
   one curve lives in src/lib/law.ts and in --curve, and every transition on
   the site reads it from one of those two places. */

/* ------------------------------------------------------------
   Reveal failsafe

   No code path may leave readable text sitting at opacity 0. Arrivals are an
   IntersectionObserver adding a class, so the failsafe is the same class
   added unconditionally: after the delay, every [data-enter] on the document
   is handed its ink whether it was ever seen or not.

   This used to walk ScrollTrigger.getAll() and carried two guards, one for
   pinned stages and one for scrubbed scenes, because forcing either to
   progress 1 would throw the page to the end of a choreography nobody had
   asked for. Neither exists now, so neither guard does, and the failsafe is
   the one line it should always have been.
   ------------------------------------------------------------ */

export function revealFailsafe(delay = 4000): void {
  if (prefersReduced) return;

  window.setTimeout(() => {
    document
      .querySelectorAll<HTMLElement>('[data-enter]')
      .forEach((el) => el.classList.add('is-in'));
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

