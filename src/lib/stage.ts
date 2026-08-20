/* ============================================================
   Stages

   The motion language of the references, in one place.

   What those sites do that this one did not: a section does not scroll
   past you. It PINS, holds the viewport, and choreographs its own contents
   while you scroll through a track several viewports tall. Then the next
   section wipes up over the top of it. Copula runs two of these on tracks
   of 400vh and 600vh with nothing but position: sticky; Orionix does the
   same thing through Framer Motion over Lenis.

   The difference in feel is the whole point. Reveal-on-enter, which is what
   this site had, makes things appear. Scrubbed motion makes them move WITH
   you, and that is what reads as alive.

   Everything here is transform and opacity on the compositor, driven by one
   ScrollTrigger per stage. No layout is animated, so pinning does not cost a
   reflow per frame.
   ============================================================ */

import { gsap, ScrollTrigger, prefersReduced } from './motion';
import { hold, frameMode } from './frame';

/* One curve for the whole site, so every stage feels like the same hand.
   Matches the references' 0.3s/1s cubic-bezier(0.4, 0, 0.2, 1) family. */
export const STAGE_EASE = 'power2.inOut';

interface StageOptions {
  /** How many viewport heights the stage holds for. The references run 4 to 6. */
  length?: number;
  /** How much lag between the scroll and the motion. 1 is one second of catch-up. */
  scrub?: number | boolean;
}

/**
 * Pin a section and return a timeline scrubbed to its scroll track.
 * Build the choreography onto the returned timeline.
 */
export function stage(
  el: HTMLElement,
  { length = 3, scrub = 1 }: StageOptions = {}
): gsap.core.Timeline | null {
  /* Frame mode needs the choreography to exist so it can be seeked, even
     though it is otherwise a motion-off context. */
  if (prefersReduced && !frameMode) return null;

  return hold(gsap.timeline({
    scrollTrigger: {
      trigger: el,
      start: 'top top',
      end: `+=${length * 100}%`,
      pin: true,
      id: 'stage',
      /* The pin spacer is what holds the track open. Without it the next
         section would start immediately and there would be nothing to
         scrub through. */
      pinSpacing: true,
      scrub,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  }));
}

/* wipeOver lived here: the next section rode up over the pinned one on a
   scrub, from yPercent 12 and autoAlpha 0.55. It was the second motion
   language, and a section sliding up and fading in as you reach it is the
   plainest case there is of a thing animating its own arrival. Deleted with
   initCommonReveals rather than left for a caller to rediscover. */


/* The replacement is not another arrival. A section starts displaced by
   exactly the clearance it owes, and travels to rest as the reader arrives:
   it is being pushed into place by the space above it, not introducing
   itself. Same one rule for every section, which is what keeps the page
   reading as a single piece. */

export function clear(el: HTMLElement): void {
  if (prefersReduced) return;

  gsap.fromTo(
    el,
    { y: () => clearspaceOf(el) },
    {
      y: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        /* Released well before the section reaches the top, so a reader is
           never scrolling a page that is still catching up with itself. */
        end: 'top 62%',
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    }
  );
}

/* The clearance in pixels, from the cascade rather than from a constant, so
   a stage that publishes its own --w gives its own answer. The fallback is
   the token's, and it only applies if the property resolves to nothing. */
function clearspaceOf(el: Element): number {
  const v = getComputedStyle(el).getPropertyValue('--clearspace').trim();
  return parseFloat(v) || 88;
}

/**
 * Parallax at scroll speed. Small numbers only: this is depth, not travel.
 */
export function drift(el: HTMLElement, distance = -12): void {
  if (prefersReduced) return;

  gsap.fromTo(
    el,
    { yPercent: -distance },
    {
      yPercent: distance,
      ease: 'none',
      scrollTrigger: {
        trigger: el.closest('section') ?? el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    }
  );
}

export { ScrollTrigger };
