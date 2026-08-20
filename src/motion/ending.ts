/* ============================================================
   THE ENDING — steps 06 and 07

   06 · THE ARCHIVE
   The construction figure climbs the document. Nothing it passes animates
   its own arrival: the statement and the note are already in place, and they
   move only because the figure's clearance reaches them and they will not
   sit inside it. Every push is measured. A row is displaced until the gap
   between it and the ring equals exactly one mark width, capped at the
   container's real gutter, because the page can only give the room it
   actually has. When it cannot give the full clearance the figure prints
   short, and that is the truth rather than a bug.

   At the top of the climb is the plate reserved for the work. There is no
   work on this page, so there is nothing in the plate to displace, and the
   clearance cannot be allocated. gap() in lib/measure.ts is signed, so the
   dimension line simply prints a negative number. The failure state is read
   from two live rects on the frame it becomes true, so the page can never
   claim a failure that did not happen.

   07 · CLEARSPACE, OCCUPIED
   The clearance every section above has been protecting is filled by the one
   thing that can occupy it without breaking the rule.

   WHY THIS FILE READS GEOMETRY ON SCROLL, WHICH measure.ts SAYS NEVER TO DO
   The module's rule is that scrolling does not change the distance between
   two elements. On these two stages it does: the section is pinned and the
   figure is travelling inside it, so the gaps genuinely move. Reading them
   is the only way the drawing and the number can stay the same statement.
   The cost is bounded and known: writes first, then one batched read pass
   for every dim on the page, and only while a stage's trigger is active.
   ============================================================ */

import { gsap } from '../lib/motion';
import { stage, ScrollTrigger, STAGE_EASE } from '../lib/stage';
import { measure, settle } from '../lib/measure';

/** One mark width in px, as lib/measure.ts published it on this stage. */
function unit(el: HTMLElement): number {
  return parseFloat(getComputedStyle(el).getPropertyValue('--w')) || 0;
}

/* ------------------------------------------------------------
   06 · The archive
   ------------------------------------------------------------ */

export function initArchive(): void {
  const sec = document.querySelector<HTMLElement>('.work');
  if (!sec) return;

  const climb = sec.querySelector<HTMLElement>('.work__climb');
  const ring = sec.querySelector<HTMLElement>('.work__ring');
  const plate = sec.querySelector<HTMLElement>('.work__void');
  const grid = sec.querySelector<HTMLElement>('.work__grid');
  const box = sec.querySelector<HTMLElement>('.container');
  if (!climb || !ring || !plate || !grid || !box) return;

  /* The two things the climber displaces, and the direction each is free to
     move. The portal is deliberately not in this list: a link that moves
     under the cursor is a link you cannot press. */
  const rows: Array<{ el: HTMLElement; dir: -1 | 1 }> = [];
  const st = sec.querySelector<HTMLElement>('.work__statement');
  const note = sec.querySelector<HTMLElement>('.work__note');
  if (st) rows.push({ el: st, dir: -1 });
  if (note) rows.push({ el: note, dir: 1 });

  /* Rest geometry, cached with every displacement zeroed. Reading these live
     would feed each frame's own push back into the next frame's measurement
     and the two columns would walk off the page. */
  const edge = new Map<HTMLElement, number>();
  let ringL = 0;
  let ringR = 0;
  let travel = 0;
  let room = 0;

  const cache = (): void => {
    gsap.set(rows.map((r) => r.el), { x: 0 });
    gsap.set(climb, { y: 0 });

    const r = ring.getBoundingClientRect();
    ringL = r.left;
    ringR = r.right;

    rows.forEach(({ el, dir }) => {
      const b = el.getBoundingClientRect();
      edge.set(el, dir < 0 ? b.right : b.left);
    });

    /* The climb ends when the clearance ring's own centre reaches the middle
       of the plate that has nothing in it. Derived from the document, so it
       is right at every viewport and after every refresh rather than being a
       number that was once correct at 1440. */
    const p = plate.getBoundingClientRect();
    travel = Math.max(0, r.top + r.height / 2 - (p.top + p.height / 2));

    /* All the sideways room the page has: the container's own gutter. */
    room = parseFloat(getComputedStyle(box).paddingLeft) || 0;
  };

  let breached: boolean | null = null;

  const react = (): void => {
    const w = unit(sec);
    const c = climb.getBoundingClientRect();
    const g = grid.getBoundingClientRect();

    /* Proximity, 1 when the figure is level with the row and 0 once it is a
       full clearance away. The falloff is the clearance itself, so the
       reaction reaches exactly as far as the rule that causes it. */
    const reach = 4 * w || 1;
    const near = gsap.utils.clamp(
      0,
      1,
      1 - Math.abs(c.top + c.height / 2 - (g.top + g.height / 2)) / reach
    );

    rows.forEach(({ el, dir }) => {
      const e = edge.get(el) ?? 0;
      const have = dir < 0 ? ringL - e : e - ringR;
      const push = Math.min(Math.max(0, w - have), room);
      gsap.set(el, { x: dir * push * near });
    });
    sec.style.setProperty('--near', String(near));

    /* Read after the displacement, never before, so every figure on the page
       describes the page as it now stands. */
    measure();

    const short =
      ring.getBoundingClientRect().top < plate.getBoundingClientRect().bottom;
    if (short !== breached) {
      breached = short;
      sec.toggleAttribute('data-breach', short);
    }
  };

  /* refreshInit is the moment ScrollTrigger has reverted every pin and the
     document is back in its untransformed state, which is the only moment
     rest geometry can honestly be taken. */
  ScrollTrigger.addEventListener('refreshInit', cache);
  cache();

  const tl = stage(sec, { length: 4, scrub: 0.85 });

  if (!tl) {
    /* Motion off. The argument still has to land, so the figure is placed at
       the breach and the page states it once, statically. */
    gsap.set(climb, { y: -travel });
    react();
    return;
  }

  /* Function value plus the stage's invalidateOnRefresh, so the distance is
     re-derived rather than remembered. */
  tl.to(climb, { y: () => -travel, ease: 'none', duration: 1 }, 0);

  tl.eventCallback('onUpdate', react);
  tl.eventCallback('onComplete', settle);
  tl.eventCallback('onReverseComplete', settle);
}

/* ------------------------------------------------------------
   07 · Clearspace, occupied
   ------------------------------------------------------------ */

export function initInversion(): void {
  const sec = document.querySelector<HTMLElement>('.inv');
  if (!sec) return;

  const foot = sec.querySelector<HTMLElement>('.inv__foot');
  const light = sec.querySelector<HTMLElement>('.inv__light');
  const rule = sec.querySelector<HTMLElement>('.inv__rule');
  const mark = sec.querySelector<HTMLElement>('.inv__mark');

  const tl = stage(sec, { length: 3.2, scrub: 0.9 });

  if (!tl) {
    sec.setAttribute('data-lit', '');
    measure();
    return;
  }

  /* Light, not an arrival. This is the one element on the site allowed to
     fade, because a lamp coming up is a level rather than an entrance, and
     the rig it samples has been on since the top of the page. What changes
     is the aperture, not the light. */
  if (light) tl.to(light, { opacity: 1, ease: 'none', duration: 0.62 }, 0.14);

  /* The drawn keep-out steps back once the thing it was describing is
     visible. It does not leave: the boundary is still the boundary. */
  if (rule) tl.to(rule, { opacity: 0.2, ease: 'none', duration: 0.4 }, 0.22);

  /* 180, about the centre the mark actually turns on. transform-origin is
     set in CSS from --x-origin-*; GSAP reads the computed value and keeps
     it, so the measured origin survives. */
  if (mark) tl.to(mark, { rotate: 180, ease: STAGE_EASE, duration: 0.8 }, 0.1);

  /* The only movement in the section, and it is second-hand: the aperture
     took one mark width, so what sits under it is one mark width lower.
     unit() is the live published W, not a number chosen to look right. */
  if (foot) tl.to(foot, { y: () => unit(sec), ease: 'none', duration: 0.62 }, 0.14);

  /* Nothing on this stage changes the distance the dimension line describes,
     so there is nothing to read per frame. One correction at each end. */
  tl.eventCallback('onComplete', settle);
  tl.eventCallback('onReverseComplete', settle);
}
