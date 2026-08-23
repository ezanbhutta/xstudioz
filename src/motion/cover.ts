/* ============================================================
   XStudioz: the cover's motion

   THIS FILE OBEYS THE LAW OF THE SHORT ANSWER, stated in full at the top of
   src/lib/law.ts. In one line: every displacement lies on the mark's arm so
   dy / dx is 0.863786 and travels 5.4, 10.8 or 21.5px; the one rotation is
   180 degrees about 49.90% / 50.71% on a click; every duration is 0.2041s or
   0.4082s; every curve is the one curve; and NOTHING is driven by the scroll
   wheel.

   WHAT THIS FILE USED TO BE, AND WHAT WENT.

   794 lines and a timeline engine. Five things were deleted outright and
   none of them is coming back as a smaller version of itself:

     THE TRAVELLING MARK. A fixed lens carrying the studio's mark, scrubbed
     across the whole document, scaling from nothing and rotating a half turn
     as it went, appearing through clip-path apertures cut into the flow. It
     was the largest single object on the page and its job was to move. At
     0.15 of the document it sat over the studio panel at 380px wide and
     translucent, with the headline reading through it. An object that
     travels a page is the thing the reference sites do not do.

     THE INDEX DIAL. A 900px arc swinging beside the capabilities list with
     five numerals stood on its rim, scrubbed so the focused row changed with
     scroll position. It put the five numbers on five different baselines and
     read as a layout fault rather than as an index.

     THE PINNED STUDIO SCENE. A 200vh track, a sticky 100vh stage, a blade
     wiping the room over, a panel arriving on a scrubbed clip-path and a
     headline resolving word by word out of the middle of the line. Two
     viewports of wheel for one screen of copy.

     THE WORD SPLITTER. Every display line broken into per-word spans so a
     lit edge could travel along it. Text is text.

     THE SCRUB ITSELF. There is no ScrollTrigger on this page, no timeline,
     and no GSAP: the dependency is gone from the bundle rather than merely
     unused, because a law that says nothing is scrubbed is worth more when
     there is no engine present that could scrub something.

   WHAT IS LEFT IS TWO THINGS, AND BOTH ARE BOOLEANS.

   The rotator resolves one label into another, once, on a timer. The
   arrivals hand a section its ink the first time it comes into view. Neither
   has an intermediate state a reader can park at, and neither moves anything
   further than one rung of the ladder.

   Everything else the page does now happens under the pointer, in CSS, and
   is stated in the GLASS and CONTROLS blocks of components.css.
   ============================================================ */

import { prefersReduced } from '../lib/motion';

/* ------------------------------------------------------------
   THE HERO ROTATOR

   One label resolves into the other, once, and then the page is still. A
   label that re-animates for as long as somebody is on the page is the
   opposite of the rest of this build.

   It is a cross-resolve on opacity with no travel and no splitting. The
   timing and the curve are the stylesheet's, taken from --dur and --curve on
   .hero__state-item, so this function's whole job is to move one attribute
   and let the material do the rest. The one number it needs in script is how
   long to wait before handing over, which is not a duration in the law's
   sense because nothing is moving during it.
   ------------------------------------------------------------ */
const HANDOVER_MS = 4200;

function initRotator(): void {
  const host = document.querySelector<HTMLElement>('[data-rotator]');
  if (!host || prefersReduced) return;

  const items = Array.from(host.querySelectorAll<HTMLElement>('[data-rotator-item]'));
  if (items.length < 2) return;

  /* Both labels are laid in the same grid cell by the stylesheet, so the
     second can come out of [hidden] without moving the first. The state is
     one attribute on the host and CSS reads it. */
  items.forEach((el) => {
    el.hidden = false;
  });
  host.setAttribute('data-rotator', '0');

  window.setTimeout(() => host.setAttribute('data-rotator', '1'), HANDOVER_MS);
}

/* ------------------------------------------------------------
   ARRIVALS

   The same mechanism the interior documents have used all along, which is
   the point: one vocabulary, not a cover vocabulary and a document
   vocabulary. An IntersectionObserver adds a class and CSS does the rest,
   with the from-state declared behind html.js so a document whose bundle
   never arrives is painted finished in its first frame.

   A crossing into view is a BOOLEAN, which is the only thing clause 6 of the
   law lets scroll decide. The element travels the first rung of the ladder,
   5.4px, up the arm to its resting place, over the long duration, once. It
   is not a scrub: the reader cannot hold it half done, because there is no
   half.
   ------------------------------------------------------------ */
function initEnters(): void {
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
     out of. If a crossing has not fired within four seconds, everything is
     handed back regardless of where the page is. */
  window.setTimeout(() => targets.forEach((el) => el.classList.add('is-in')), 4000);
}

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
export function initCover(): void {
  /* Under reduced motion both functions decline on their own and the
     stylesheet has already composed the page finished, so there is no
     separate branch to keep in step with this one. */
  initRotator();
  initEnters();
}
