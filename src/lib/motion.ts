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

/* ------------------------------------------------------------
   THE BAR'S BOX, PUBLISHED

   --nav-h is a token and the bar has never been that tall. The token
   resolves to 63px at a 15px root and the rendered bar is 74, because its
   height is three 44px touch targets plus two --sp-3 of padding: a
   consequence of the touch floor and the spacing rhythm rather than a figure
   the ladder can produce. The full accounting is at the token in tokens.css.

   THREE THINGS READ THE WRONG NUMBER AND ALL THREE ARE FIXED BY WRITING THE
   RIGHT ONE ONCE. The hide travels --nav-h up and --nav-h through --cut-k
   across, so it stopped 11px short at 1500 and the leftover strip was blinked
   out by the visibility change at the end of the same 408ms; hit tests at y =
   0, 3, 6 and 9 still landed on .nav__row afterwards. The top clearance on
   the cover and the top padding on all fifteen documents were short by the
   same amount. The shortfall is fluid, 6px at 390 up to 13.59 at 1024, so
   there was no constant to add anywhere.

   SHRINKING THE BAR TO MATCH THE TOKEN WOULD HAVE BEEN THE WRONG REPAIR: it
   compresses three controls that are already sitting exactly on the 44px
   touch floor. The measurement is the truth and the token is the guess, so
   the measurement wins, the same way --w is read off the drawn mark rather
   than typed into a stylesheet.

   THE GUARD IS AGAINST A LOOP, not against churn. --nav-h feeds page
   clearances, a taller page can add or remove a scrollbar, a scrollbar
   changes the viewport width and the bar's box is width-dependent. Writing
   only on a real change breaks that chain at its first link. A zero is never
   written either: ?static sets the bar to display: none, and a zero would
   collapse the top clearance on every route that reads it.
   ------------------------------------------------------------ */
function publishNavBox(nav: HTMLElement): void {
  let last = 0;
  const write = (): void => {
    const h = nav.getBoundingClientRect().height;
    if (h <= 0 || Math.abs(h - last) < 0.5) return;
    last = h;
    document.documentElement.style.setProperty('--nav-h', `${h}px`);
  };

  /* ResizeObserver rather than the resize event, for the reason set out in
     lib/measure.ts: the resize event does not fire for an element whose box
     changed because an ancestor did, and does not fire at all in an embedded
     pane resized by its host. */
  new ResizeObserver(write).observe(nav);
  write();
  /* Type metrics set the height of the label inside two of the three
     controls, so the first pass is provisional until the real face lands. */
  void document.fonts?.ready.then(write);
}

export function initNav(): void {
  const nav = document.getElementById('nav');
  if (!nav) return;

  publishNavBox(nav);

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
   THE REVEAL FAILSAFE IS DELETED, AND THE GUARANTEE IT CARRIED IS KEPT.

   What was here:

     export function revealFailsafe(delay = 4000) {
       if (prefersReduced) return;
       window.setTimeout(() => document.querySelectorAll('[data-enter]')
         .forEach((el) => el.classList.add('is-in')), delay);
     }

   and the rule it enforced is still the rule: no code path may leave readable
   text at an opacity a reader cannot get out of. What changed is that the
   rule is now true by construction rather than by callback.

   THE OLD SHAPE NEEDED IT. The from-state was a resting style written onto
   the element, `[data-enter] { opacity: 0 }`, so anything the observer never
   crossed sat invisible forever and something had to come and hand it back.

   THE NEW SHAPE MAKES IT HARMFUL. The from-state lives inside a @keyframes in
   base.css and exists only while that animation runs, so an element nobody
   ever reveals is not stuck, it is finished. Meanwhile this timer was doing
   real damage: measured on /privacy/, four of sixteen arrivals were in at
   2.5s and all sixteen were in at 7s WITH NO SCROLLING, because the timer had
   released every below-the-fold section while it was off screen. A reader who
   spent four seconds on the masthead, which is most readers of a document,
   then scrolled into a page where nothing arrived. The failsafe was silently
   cancelling the feature it existed to protect, on all sixteen routes.

   Both callers dropped it with this deletion. The three conditions that could
   stop arrivals running at all, reduce, ?static and a renderer viewport, are
   caught by prefersReduced in src/lib/arrive.ts, which returns before a class
   is written, leaving the page complete and still.
   ------------------------------------------------------------ */

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

