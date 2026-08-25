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

   WHAT IS LEFT IS THREE THINGS, AND ALL THREE ARE BOOLEANS.

   The rotator resolves one label into another, once, on a timer. The
   arrivals hand a section its ink the first time it comes into view. The
   signature sends the archive plate's pane up the arm, once, on the same
   kind of crossing. None of the three has an intermediate state a reader can
   park at, and none moves anything further than one rung of the ladder.

   The hero mark's half turn was the fourth and it went with the mark it
   turned. What replaces it is the signature, and it is not that gesture made
   smaller: the subject changed from a drawing to a material. The reasoning is
   below at THE SIGNATURE MOMENT.

   Everything else the page does now happens under the pointer, in CSS, and
   is stated in the GLASS and CONTROLS blocks of components.css.
   ============================================================ */

import { prefersReduced } from '../lib/motion';
import { initArrivals } from '../lib/arrive';

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
  if (!host) return;

  const items = Array.from(host.querySelectorAll<HTMLElement>('[data-rotator-item]'));
  if (items.length < 2) return;

  /* Both labels are laid in the same grid cell by the stylesheet, so the
     second can come out of [hidden] without moving the first. The state is
     one attribute on the host and CSS reads it. */
  items.forEach((el) => {
    el.hidden = false;
  });

  /* A MOTION PREFERENCE MAY NOT COST SOMEBODY A LINE OF COPY, and it was
     costing one. This function used to return at its first line under
     reduce, which left the second label carrying [hidden] and base.css's
     `[hidden] { display: none !important }` on top of it, so a reader who
     had asked the operating system for less motion never saw "Taking work
     for 2026" at all. Reduce is a request about movement, not about content.

     The repair is a third state rather than a suppressed one: both labels
     are rendered, stacked in the flow, with no transition and no timer.
     Nothing crosses, nothing is timed, and the same two strings are on the
     page. The copy is frozen, so this presents what is already there and
     writes nothing. */
  if (prefersReduced) {
    host.setAttribute('data-rotator', 'static');
    return;
  }

  host.setAttribute('data-rotator', '0');

  window.setTimeout(() => host.setAttribute('data-rotator', '1'), HANDOVER_MS);
}

/* ------------------------------------------------------------
   ARRIVALS ARE NOT THIS FILE'S ANY MORE.

   What stood here was a copy of the observer in page.ts: same selector, same
   rootMargin, same failsafe, same four seconds, written out twice so that
   the cover and the documents could drift apart, which they duly did. The
   document copy was running over an empty list on all fifteen routes.

   Both callers take src/lib/arrive.ts now. It carries the grouping and the
   stagger, which neither copy had, and it hangs the from-state off a
   keyframe rather than off the resting element, which is the part that
   matters: nothing on this page is invisible while it waits for a crossing.
   ------------------------------------------------------------ */

/* ------------------------------------------------------------
   THE SIGNATURE MOMENT, AND THE THING THAT MOVES IS THE GLASS.

   The version of this block that shipped last said there was no legal gesture
   left, and its geometry was sound: clause 1 fixes every displacement to the
   arm, the band RUNS along the arm, so translating the band along the arm
   maps it onto itself and shows nothing, and every direction in which its own
   edge would visibly move is perpendicular to the arm and illegal.

   That is true of the BAND and it is not true of the composition. The pane
   over the band is a second surface, out of flow, and it may travel the arm
   like anything else here. So the pane moves, the band holds still, and the
   run the pane lands on goes soft while the rest of it stays sharp. Same
   relative displacement, subject swapped, and the swap is the gesture.

   THIS FUNCTION IS THE TRIGGER AND NOTHING ELSE. The travel, the duration and
   the curve are the stylesheet's, at THE SIGNATURE in cover.css, so there is
   nothing in script that can hold the gesture half done. What is here is one
   class added once, on one boolean, which is clause 6: a crossing into view,
   read one time, with no intermediate value to park at.

   IT DECLINES BEFORE IT TOUCHES ANYTHING. Under reduce, ?static or a renderer
   viewport, prefersReduced returns first and the class is never added, so no
   animation is ever created. The pane declares no from-state of its own, so a
   page that never runs this is not a page mid-gesture and not a blank one. It
   is the finished page, standing still.
   ------------------------------------------------------------ */
function initSignature(): void {
  const pane = document.querySelector<HTMLElement>('[data-signature]');
  if (!pane) return;
  if (prefersReduced) return;

  const fire = (): void => {
    pane.classList.add('is-signed');
  };

  /* Read synchronously first, for the same reason arrive.ts does: an
     observer's first callback is asynchronous, so a pane that is already on
     screen would otherwise paint at rest for a frame or two and then jump
     back down the arm to start. Costs one layout at boot. */
  const r = pane.getBoundingClientRect();
  const h = window.innerHeight || document.documentElement.clientHeight;
  if (r.top < h && r.bottom > 0) {
    fire();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        fire();
        observer.disconnect();
        return;
      }
    },
    /* The arrivals' own margin, so the plate signs itself as it clears the
       fold rather than the instant its first pixel appears. */
    { rootMargin: '0px 0px -12% 0px' }
  );

  observer.observe(pane);
}

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
export function initCover(): void {
  /* Under reduced motion all three decline on their own and the stylesheet
     has already composed the page finished, so there is no separate branch
     to keep in step with this one. */
  initRotator();
  initArrivals();
  initSignature();
}
