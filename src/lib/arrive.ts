/* ============================================================
   XStudioz: ARRIVALS

   One mechanism, one vocabulary, sixteen routes. The cover and the fifteen
   documents used to carry two near-identical copies of an observer, and the
   documents carried theirs against markup that did not exist: `grep -c
   data-enter` returned 9 on index.html and 0 on every other page, so the
   fifteen interiors ran an IntersectionObserver over an empty list and the
   `html.js:not(.no-motion) [data-enter]` block in doc.css never matched a
   single element, because nothing on an interior page ever added `js` to the
   root in the first place. Both halves of that are repaired here.

   THE FAILURE THIS FILE IS DESIGNED AGAINST, and it has bitten this project
   before: an arrival whose from-state is a RESTING style leaves content
   invisible the moment its trigger does not fire. A blocked bundle, a
   renderer with no viewport, an observer that never crosses, a thrown
   exception three lines earlier: any of them and the reader is looking at a
   blank page with the text technically present.

   SO THE FROM-STATE IS NOT A RESTING STYLE. It exists only inside a running
   @keyframes. Read the rule in base.css: `[data-enter]` on its own declares
   NOTHING. No opacity, no translate, no transition. It is painted final in
   its first frame, always, on every route, with or without this file. The
   arrival is `[data-enter].is-in`, which starts an animation whose `from` is
   down the arm at opacity 0 and whose `to` is exactly where the element was
   already sitting. If this file never runs, `.is-in` is never added, no
   animation is ever created, and the page is complete and still. That is a
   guarantee that comes from the shape of the mechanism rather than from a
   timer remembering to fire.

   AND THE FOUR-SECOND FAILSAFE IS GONE WITH IT, which is not a relaxation of
   the guarantee but a consequence of it. Both old copies ran a blanket timer
   that added .is-in to every target after four seconds. With a resting
   from-state that was the only thing standing between a reader and an
   invisible page. With a keyframe from-state it is pure damage: measured on
   /privacy/, four of sixteen arrivals were in at 2.5s and all sixteen were in
   at 7s WITH NO SCROLLING AT ALL, because the timer had already released
   every section below the fold while it was off screen. The reasoning is
   written out where the function used to live, in src/lib/motion.ts.

   THE LAW. Every arrival travels one rung, --d2, which is 21.5px resolved
   into 16.3px across and 14.1px up so |dy/dx| reads 0.863786 like everything
   else on the site. It travels UP the arm to rest, because clause 1 says a
   surface arriving comes up it. The duration is --dur, 408ms, the long rung
   of the two. The curve is the one curve. Nothing here is scrubbed: a
   crossing into view is a boolean and it is read once.

   THE STAGGER. A group is one object, so its members arrive together and are
   only separated in time enough to read as a sequence rather than as a
   flash. The step is --enter-step, half the answer rung, 102ms, and the
   number of steps is capped at four so the whole group closes 816ms after
   the first member starts. Past about 900ms a group stops reading as one
   thing arriving and starts reading as a page loading slowly. A group longer
   than five members does not get a longer stagger, it gets a finer one: the
   last member always lands in the fourth slot and the ones between are
   spread across it.
   ============================================================ */

import { prefersReduced } from './motion';

/* The stagger runs across this many steps of --enter-step and no more. Four
   steps at 102ms plus the 408ms the last member itself takes is 816ms, which
   is the whole group inside the 900ms ceiling. */
const SLOTS = 4;

/* A unit is the thing that gets OBSERVED. Either one element that arrives
   alone, or a group whose members arrive together on the group's own
   crossing. Observing the members of a group separately is what makes a
   stagger fall apart: on a tall list the last row crosses seconds after the
   first and the sequence the delays describe never happens. */
type Unit = { watch: Element; members: HTMLElement[] };

function collect(): Unit[] {
  const groups = Array.from(document.querySelectorAll<HTMLElement>('[data-enter-group]'));
  const units: Unit[] = [];

  for (const group of groups) {
    const members = Array.from(group.querySelectorAll<HTMLElement>('[data-enter]')).filter(
      /* A member belongs to the nearest group above it, so groups may nest
         without the outer one claiming the inner one's rows. */
      (el) => el.closest('[data-enter-group]') === group
    );
    if (!members.length) continue;

    const last = members.length - 1;
    members.forEach((el, i) => {
      /* Up to five members take one slot each. Past that the same four slots
         are divided more finely, so the group still closes on time and the
         rows still arrive in order. */
      const slot = last === 0 ? 0 : members.length <= SLOTS + 1 ? i : (i * SLOTS) / last;
      el.style.setProperty('--enter-i', slot.toFixed(3));
    });

    units.push({ watch: group, members });
  }

  /* Everything carrying [data-enter] that is not inside a group arrives on
     its own crossing, with no delay. */
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-enter]'))) {
    if (el.closest('[data-enter-group]')) continue;
    units.push({ watch: el, members: [el] });
  }

  return units;
}

function reveal(unit: Unit): void {
  for (const el of unit.members) el.classList.add('is-in');
}

export function initArrivals(): void {
  /* Under reduce, ?static, or a renderer viewport, nothing is added and
     therefore nothing animates. The page is already the finished page. */
  if (prefersReduced) return;

  const units = collect();
  if (!units.length) return;

  /* WHAT IS ALREADY ON SCREEN IS RELEASED IN THIS TICK, NOT ON THE NEXT
     FRAME. An IntersectionObserver's first callback is asynchronous, so
     anything above the fold would otherwise paint at rest for a frame or two
     and then jump back down the arm to start its arrival. Reading the rect
     synchronously here costs one layout at boot and removes that entirely. */
  const h = window.innerHeight || document.documentElement.clientHeight;
  const pending: Unit[] = [];
  for (const unit of units) {
    const r = unit.watch.getBoundingClientRect();
    if (r.top < h && r.bottom > 0) reveal(unit);
    else pending.push(unit);
  }
  if (!pending.length) return;

  const byNode = new Map<Element, Unit>(pending.map((u) => [u.watch, u]));

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const unit = byNode.get(entry.target);
        if (unit) reveal(unit);
        observer.unobserve(entry.target);
      }
    },
    /* A shallow bottom margin so a section starts as it clears the fold
       rather than the instant its first pixel appears. Nothing else about
       scroll position is read, ever: this is the boolean of clause 6 and it
       has no intermediate value to park at. */
    { rootMargin: '0px 0px -12% 0px' }
  );

  for (const unit of pending) observer.observe(unit.watch);

  /* THERE IS NO TIMER HERE, AND ITS ABSENCE IS THE POINT.

     Both the cover and the documents used to run `setTimeout(() =>
     targets.forEach(el => el.classList.add('is-in')), 4000)` under the
     heading "no code path may leave readable text at an opacity a reader
     cannot get out of". That guarantee was real and it was necessary, because
     the from-state was a resting style: an element that was never crossed sat
     at opacity 0 forever, so something had to come along and hand it back.

     It is not necessary now and it is actively destructive. Measured on
     /privacy/, sixteen arrivals, four of them above the fold: at 2.5s four
     were in, and at 7s with no scrolling at all, sixteen were. Every section
     below the first screen had been released on the timer while it was off
     screen, so a reader who spent four seconds on the masthead before
     scrolling, which is most readers of a document, scrolled into a page
     where nothing arrived, forever. The failsafe was quietly cancelling the
     feature it was written to protect.

     What replaces it is the shape of the mechanism rather than another
     callback. `[data-enter]` on its own declares nothing, so an element that
     is never revealed is not stuck at opacity 0, it is simply finished. There
     is no state left for a timer to rescue anybody from. The three cases that
     could stop the observer running at all, which are reduce, ?static and a
     renderer reporting a viewport no scroll can satisfy, are all caught by
     prefersReduced at the top of this function, which returns before a single
     class is added. */
}
