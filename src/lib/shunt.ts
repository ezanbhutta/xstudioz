/* ============================================================
   XStudioz — the shunt

   THE LAW
   Nothing on this site animates its own arrival. An element never fades in,
   rises, or reveals itself. It moves because a neighbour claimed clearance
   and displaced it. The verb comes from a deliverable the studio actually
   sells, and this module is where the law stops being art direction and
   becomes a constraint on how the code may be written.

   HOW IT IS AUTHORED
   In claims, never in entrances. A claim names one body and the bodies
   standing below it. The tween belongs to the ones being displaced; the
   claimant is never in it, does not move, and does not arrive. Read the loop
   at the bottom of this file as the sentence it is.

   TWO PROPERTIES FOLLOW, AND THEY ARE THE WHOLE DIFFERENCE
     - ZERO STAGGER. Everything below a claim moves in the same frame by the
       same distance. A stagger would say each row has its own entrance,
       which is the one thing forbidden here.
     - CUMULATIVE AMPLITUDE. Body n receives claims 0..n-1, so it travels n
       times as far as the first. Simultaneous in time, accumulating in
       distance. That is what a physical shunt looks like and it is the part
       a staggered list cannot imitate, because a stagger accumulates delay
       and a shunt accumulates displacement.

   WHY THE TWEENS CAN BE ABSOLUTE
   At claim k every body below it has received exactly the claims 0..k-1, so
   every one of them sits at the same displacement k * C. One fromTo over the
   whole set is therefore exact. That is what lets these be absolute rather
   than relative tweens, which is what lets them survive being scrubbed
   backwards without drifting.

   THE DISTANCE IS NOT CHOSEN
   C is --clearspace resolved on the stage, which is 4W, and W is the real
   drawn width of the element wearing [data-unit-w], published by
   lib/measure.ts. Resize the mark and every claim on the page follows it.
   ============================================================ */

import { gsap, ScrollTrigger, prefersReduced } from './motion';
import { measure, settle, probe, anchor, span } from './measure';
import { hold, frameMode } from './frame';

export interface ShuntSpec {
  /** The section that reserves the room the claims will consume. */
  section: HTMLElement;
  /**
   * The chain, top to bottom. Body n receives claims 0..n-1.
   * Members must be independent: no body may be an ancestor of another, or
   * the transforms compound and the arithmetic above stops holding.
   */
  bodies: HTMLElement[];
  /** Where the track opens, in ScrollTrigger terms. */
  start?: string;
  /**
   * Scroll distance per claim, as a multiple of the claim itself. Above 1
   * the chain still travels up the page while being shunted down, so the
   * motion never reverses against the reader. 1.6 reads as heavy resistance.
   */
  travel?: number;
  scrub?: number;
}

interface Line {
  el: HTMLElement;
  /** Which claim opens the gap this line spans. */
  k: number;
  /** The line's length in the packed state, re-read on every refresh. */
  from: number;
}

export function shunt({
  section,
  bodies,
  start = 'top 72%',
  travel = 1.6,
  scrub = 0.7,
}: ShuntSpec): void {
  if (bodies.length < 2) return;
  /* Reduced motion never gets the packed class, so it never gets the
     reserved band either: it reads the page as written, fully cleared. */
  if (prefersReduced && !frameMode) return;

  const claims = bodies.length - 1;
  const stageEl = section.matches('[data-stage]')
    ? section
    : section.querySelector<HTMLElement>('[data-stage]') ?? section;

  section.classList.add('is-shunt');

  const lines: Line[] = [];
  section.querySelectorAll<HTMLElement>('[data-dim-claim]').forEach((el) => {
    const k = Number(el.getAttribute('data-dim-claim'));
    if (Number.isFinite(k) && k >= 0 && k < claims) lines.push({ el, k, from: 0 });
  });

  let C = 0;
  let base: number[][] = [];
  let targets: number[][] = [];

  /* Everything that depends on layout, in one place, so a resize or a font
     swap rebuilds all of it together instead of leaving the distance correct
     and the figures stale. */
  const rebuild = (): void => {
    C = parseFloat(getComputedStyle(stageEl).getPropertyValue('--clearspace')) || 0;
    measure();
    base = anchor();
    lines.forEach((l) => {
      l.from = parseFloat(getComputedStyle(l.el).getPropertyValue('--dim-len')) || 0;
    });
    /* The end state, measured rather than predicted: apply the final
       transforms, read every figure, put them back before anything paints. */
    targets = probe(
      () => bodies.forEach((el, n) => gsap.set(el, { y: n * C })),
      () => bodies.forEach((el) => gsap.set(el, { y: 0 }))
    );
  };

  rebuild();
  /* Registered before the timeline so C is current by the time ScrollTrigger
     re-evaluates the function-based values below. */
  ScrollTrigger.addEventListener('refreshInit', rebuild);

  const tl = hold(
    gsap.timeline({
      scrollTrigger: {
        trigger: bodies[0],
        start,
        /* The track is stated in the mark's own unit, like everything else
           here: six claims of 4W each, at travel times that distance. */
        end: () => `+=${Math.round(claims * C * travel)}`,
        scrub,
        invalidateOnRefresh: true,
        /* The correction back to truth. Every figure printed during the
           displacement was an interpolation of two really-measured states;
           this is the read that turns the estimate back into a measurement. */
        onScrubComplete: settle,
      },
      onUpdate(this: gsap.core.Timeline) {
        span(base, targets, this.progress());
      },
    })
  );
  if (!tl) return;

  for (let k = 0; k < claims; k++) {
    /* Body k claims its clearance. Everything standing below body k is
       displaced by exactly that clearance. Body k is not in this tween: it
       does not move and it does not arrive. No stagger, because a stagger
       would give each of them a separate entrance. */
    const displaced = bodies.slice(k + 1);
    tl.fromTo(
      displaced,
      { y: () => k * C },
      { y: () => (k + 1) * C, ease: 'none', duration: 1 },
      k
    );
  }

  /* The drawing follows the same claim the element does, so the dimension
     line and the figure printed beside it describe the same distance on
     every frame rather than only at rest. */
  lines.forEach((l) => {
    tl.fromTo(
      l.el,
      { '--dim-len': () => `${l.from}px` },
      { '--dim-len': () => `${l.from + C}px`, ease: 'none', duration: 1 },
      l.k
    );
  });
}
