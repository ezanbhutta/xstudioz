/* ============================================================
   XStudioz: the cover's choreography

   EVERYTHING BELOW OBEYS THE LAW OF THE HALF TURN, which is stated in full
   at the top of src/lib/law.ts and which nothing on this site is exempt
   from. In one line: every displacement lies on the mark's arm, so dy / dx
   is 0.863786; every rotation is 180 degrees about 49.90% / 50.71%; every
   timed duration is 0.2041s, 0.4082s or 0.8164s; every curve is the one
   curve; and a scrub has no curve at all, because the wheel is its clock.

   The motion vocabulary is four properties: opacity, translate, rotate and
   scale, plus the one registered number driving the sweep. Nothing blurs,
   nothing interpolates a colour, and no text is ever masked or split into
   characters. Scale belongs to exactly one thing, the travelling mark, which
   uses it in place of an opacity fade: an object that leaves by shrinking to
   zero reads as departure, where the same object fading reads as a rendering
   fault.

   Two things about the shape of the scenes rather than about the law.

   WINDOWS ARE LAID END TO END, WITH ONE DELIBERATE OVERLAP. Each scene is
   driven by exactly one scroll progress value. The single overlap is the
   blade and the turn in Scene A, and they overlap because they are one
   event: the room going over.

   THE TRAILING HOLD. Scene A holds for the last 26% of its 320vh track,
   which is about a third of a viewport of stillness rather than the viewport
   and a half a 500vh track with a 30% hold would spend on it.
   ============================================================ */

import { gsap, ScrollTrigger, prefersReduced } from '../lib/motion';
import {
  ARM_X,
  ARM_Y,
  DUR,
  CUT_K,
  DUR_DOUBLE,
  HALF_TURN,
  RUNG,
  TURN_ORIGIN,
  curve,
} from '../lib/law';

/* One rung of the law's ladder, in pixels, resolved against the live root so
   a displacement is the same fraction of the page at 375 as it is at 2200.
   Positive travels UP the arm, which is right and up, so y comes back
   negative. Every gsap tween below that moves anything uses this and nothing
   else. */
function rung(n: number): { x: number; y: number } {
  const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 15;
  const d = RUNG[n] * root;
  return { x: d * ARM_X, y: -d * ARM_Y };
}

/* Scenes are scrubbed against native scroll with no smoothing, so `true`
   rather than a number. A lerp here is what makes a long scrub feel like it
   is swimming behind the wheel. */
const SCRUB = true as const;

/* ------------------------------------------------------------
   Splitting, at the word

   Each word becomes its own inline-block span. Whitespace is preserved as
   real text between the spans rather than as part of one, so the line still
   wraps and still reads correctly: the accessible name is rebuilt from the
   original string so a screen reader is handed the sentence and not a list.

   The reference splits to the character. This does not, and that is the
   point rather than an economy: a word is the smallest unit a reader takes
   in, so a line that resolves word by word resolves as language.
   ------------------------------------------------------------ */
function splitWords(el: HTMLElement): HTMLElement[] {
  const source = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (!source) return [];

  const words: HTMLElement[] = [];
  const frag = document.createDocumentFragment();

  source.split(' ').forEach((word, i) => {
    if (i > 0) frag.appendChild(document.createTextNode(' '));
    const w = document.createElement('span');
    w.className = 'scrub-word';
    w.textContent = word;
    frag.appendChild(w);
    words.push(w);
  });

  el.textContent = '';
  el.appendChild(frag);
  el.setAttribute('aria-label', source);

  return words;
}

/* THE SWEEP, driven. One number, written straight onto the element. GSAP
   cannot interpolate a polygon() with per-point calc in it, and it does not
   have to: the whole shape is a function of --wipe, so the timeline tweens a
   plain object and the browser recomputes the clip. It is the same --wipe and
   the same polygon a pill's fill sweeps on, at stage scale rather than at
   control scale. */
function wipe(el: HTMLElement, from: number, to: number, at: number, dur: number, tl: gsap.core.Timeline): void {
  const v = { n: from };
  el.style.setProperty('--wipe', String(from));
  tl.to(
    v,
    {
      n: to,
      ease: 'none',
      duration: dur,
      onUpdate: () => el.style.setProperty('--wipe', v.n.toFixed(4)),
    },
    at
  );
}

/* The reveal. Words light from the centre of the line outward, both ways at
   once, so the lit edge opens rather than sweeps. Setting the stagger equal
   to the duration makes the windows abut exactly, which is what keeps the
   boundary a moving edge rather than a soft band. */
function resolveWords(
  el: HTMLElement,
  tl: gsap.core.Timeline,
  at: number,
  span: number
): void {
  const words = splitWords(el);
  if (!words.length) return;
  gsap.set(words, { opacity: 0.62 });
  const each = span / words.length;
  tl.to(words, { opacity: 1, ease: 'none', duration: each, stagger: { each, from: 'center' } }, at);
}

/* ------------------------------------------------------------
   THE HERO ROTATOR

   The one time-based animation on the page, and it resolves once.

   It used to split each label to the character and fly them in from 50px
   below on a stagger, which is the reference's rotating-word move almost
   exactly and which reads as broken type in any frame caught mid-flight:
   the last glyph of a twenty character label sits lower and fainter than its
   neighbours for a third of the cycle. It is now a cross-resolve of two
   whole lines on opacity, with no travel and no splitting, which is what
   stillness actually looks like at this size.
   ------------------------------------------------------------ */
function initRotator(): void {
  const host = document.querySelector<HTMLElement>('[data-rotator]');
  if (!host || prefersReduced) return;

  const items = Array.from(host.querySelectorAll<HTMLElement>('[data-rotator-item]'));
  if (items.length < 2) return;

  items.forEach((el, i) => {
    el.hidden = false;
    gsap.set(el, { opacity: i === 0 ? 1 : 0 });
  });

  /* Once, then still. A label that re-animates for the whole time somebody
     is on the page is the opposite of the rest of this build.

     The law: both halves take the base duration and the one curve, and they
     overlap by half of it, so the crossing is one event on one clock rather
     than two fades with a gap between them. */
  window.setTimeout(() => {
    gsap
      .timeline()
      .to(items[0], { opacity: 0, duration: DUR, ease: curve })
      .to(items[1], { opacity: 1, duration: DUR, ease: curve }, `>-${DUR / 2}`);
  }, 4200);
}

/* ------------------------------------------------------------
   SCENE A, THE STUDIO. The half turn.

   Track 320vh, stage sticky at 100vh. Progress 0 when the track's top meets
   the viewport top, 1 when its bottom does, so the scrub range in pixels is
   exactly the track height.

     0.00 → 0.18   the statement resolves, word by word, centre outward
     0.18 → 0.28   the statement leaves DOWN THE ARM, one rung 5, and fades
     0.28 → 0.54   the plane sweeps in, its leading edge cut on the arm
     0.36 → 0.44   the mark takes its ink, once the plane is under it
     0.44          THE HALF TURN FIRES, on a clock, 0.8164s, one curve
     0.54 → 0.64   the payoff's sheet sweeps in, edge cut on the arm, and the
                   mark clears out from under it
     0.64 → 0.74   the copy on the sheet takes its ink
     0.74 → 1.00   held.

   THE TURN IS NOT ON THE WHEEL, and that is the law's second clause rather
   than a preference. It used to be a scrubbed 0 to 180 across the same window
   as the plane, which meant a reader could stop anywhere in it, and stopping
   at the middle held the drawing at a quarter turn: 29 of its 52 vertices
   land there, so the frame showed a figure that is not this mark. It is now
   one tween on one clock, fired when the plane is under the mark, and the two
   states a reader can hold are the only two states the drawing has.

   The mark takes its ink LATE for the same reason. It is set in the one ink a
   ramp takes, so on paper it is white on white: it used to fade up at 0.28,
   which is before the plane arrives, and spent a third of the scene as a
   ghost the reader could not read.
   ------------------------------------------------------------ */
function sceneStudio(): void {
  const track = document.querySelector<HTMLElement>('[data-scene="studio"]');
  if (!track) return;

  const blade = track.querySelector<HTMLElement>('[data-blade]');
  const mark = track.querySelector<HTMLElement>('[data-turn-mark]');
  const line = track.querySelector<HTMLElement>('[data-reveal-words]');
  const payoff = track.querySelector<HTMLElement>('[data-payoff]');
  if (!blade || !mark || !line || !payoff) return;

  /* The sheet under the copy is a plane and it sweeps; the copy on it takes
     its ink afterwards, so no character is ever standing on a translucent
     ground with the ramp showing through. The children are addressed rather
     than the block, because an opacity on the block would take its sheet down
     with them. */
  const sheet = payoff as HTMLElement;
  const copy = Array.from(payoff.children) as HTMLElement[];
  gsap.set(copy, { opacity: 0 });

  /* The run is the rise through --cut-k, and only a measurement knows what
     this block's rise is. Re-read on every refresh, so a font landing late or
     a rotation cannot leave the edge at the wrong angle. */
  const setRun = (): void =>
    sheet.style.setProperty('--sweep-run', `${(sheet.offsetHeight * CUT_K).toFixed(1)}px`);
  setRun();
  /* The measured centre, stated to the transform system explicitly. GSAP
     defaults transformOrigin to the box centre the first time it writes a
     transform, and the whole claim this site makes about its mark is that
     the box centre is the wrong point. */
  gsap.set(mark, { transformOrigin: TURN_ORIGIN, rotation: 0 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: track,
      start: 'top top',
      end: 'bottom top',
      scrub: SCRUB,
      id: 'scene-studio',
      invalidateOnRefresh: true,
      onRefresh: setRun,
    },
  });

  resolveWords(line, tl, 0, 0.18);

  /* It leaves DOWN the arm, at the law's fifth rung: 172.3px on the 1500px
     sheet, which is 130.4 across and 112.6 down. It used to travel a flat
     -180px sideways, which is nearly the same distance with no angle in it
     and therefore nothing in the drawing to account for it. */
  const exit = rung(5);
  tl.to(
    line,
    { x: -exit.x, y: -exit.y, opacity: 0, ease: 'none', duration: 0.1 },
    0.18
  );

  wipe(blade, 0, 1, 0.28, 0.26, tl);

  /* The half turn, on a clock. Built paused and driven by its own trigger so
     the wheel decides WHEN it starts and never WHERE it stops. Reversed on
     the way back up, so a reader scrolling out of the scene and into it again
     sees the turn made rather than finds it already over. */
  const turn = gsap.to(mark, {
    rotation: HALF_TURN,
    duration: DUR_DOUBLE,
    ease: curve,
    paused: true,
  });

  ScrollTrigger.create({
    id: 'scene-studio-turn',
    trigger: track,
    start: () => `top top-=${track.offsetHeight * 0.44}`,
    invalidateOnRefresh: true,
    onEnter: () => turn.play(),
    onLeaveBack: () => turn.reverse(),
  });

  tl.to(mark, { opacity: 1, ease: 'none', duration: 0.08 }, 0.36)
    /* It goes when the payoff arrives. Held at even a tenth of its strength
       it still cut edges through the running text underneath it, and a mark
       that damages the legibility of the sentence beside it is not being
       used properly. The turn has been made; nothing is served by leaving
       the evidence on the wall. */
    .to(mark, { opacity: 0, ease: 'none', duration: 0.1 }, 0.54);

  wipe(payoff, 0, 1, 0.54, 0.1, tl);

  tl.to(copy, { opacity: 1, ease: 'none', duration: 0.1 }, 0.64)
    /* The hold. An empty tween is the honest way to say that the last quarter
       of this track is meant to have nothing happening in it. */
    .to({}, { duration: 0.26 }, 0.74);
}

/* ------------------------------------------------------------
   THE TRAVELLING MARK

   One chromatic body for the whole document, scrubbed against document
   progress. It replaced two static ramps, one behind the hero headline and
   one behind the archive statement, and both are deleted rather than left
   standing beside it.

   THREE NUMBERS ON THE WHEEL, ONE ON A CLOCK. Scale and travel in x and y
   are scrubbed against document progress; the turn is not, and cannot be.
   The apertures in cover.css read all four, so however many holes the page is
   given they are all showing the same object at the same instant. Nothing
   else in the system writes them.

   THE ENVELOPE IS DERIVED, NOT COPIED. The reference runs 1.0 -> 2.0 -> 0 ->
   1.0 -> 0 against its own section boundaries. These keyframes are measured
   off this document's boundaries at run time, so they hold at any width and
   survive a font landing late:

     0                 scale 0     nothing on screen yet
     hero aperture out scale 0
     capabilities in   scale 0
     capabilities out  scale 0
     archive in        scale 1.60  arriving, readable as a drawing
     archive centred   scale 0.76  the whole mark
     archive out       scale 0.50  leaving before the portal
     end of document   scale 0     gone

   THE HANDOVER LIVES BETWEEN KEYFRAMES 2 AND 3, the two zeros either side of
   #capabilities. That window is deliberately empty: a rotating index dial is
   the likely next addition to that section, and two large gradient objects on
   screen at once would read as patchwork. There is one chromatic body on this
   page at any moment and it changes job rather than multiplying, so a dial
   dropped into Capabilities needs no change here at all. Widen the window by
   moving those two keyframes, never by adding a third object.

   THE TURN IS ON A CLOCK, AND IT IS SEEN. This used to be a scrubbed 0 to
   180 spent entirely inside the handover, where the scale is already 0: the
   object turned where nobody could watch it, which is a rotation the page
   does not actually have. The law says a half turn is never scrubbed, and it
   does not say a half turn is never seen. So the whole turn is one tween on
   one clock, 0.8164s on the one curve, fired the first time the archive
   aperture comes into view, and it is the one rotation on this page a reader
   watches the object make. Both states it can be held in are drawings this
   mark has. Nothing in between can be held, because nothing on the wheel
   drives it.
   ------------------------------------------------------------ */

type MarkKey = { y: number; scale: number; x: number; yOff: number };

/* A smoothstep, t * t * (3 - 2t), used to round the corner where two
   keyframes meet. It is deleted, and its absence is the law rather than a
   regression: a scrubbed scene has no curve, because the wheel is its clock.
   Rounding the joins put a second, unrelated easing shape on the site whose
   only job was to hide a direction change, and the mark's own drawing is
   made of hard cut corners rather than of rounded ones. Every segment below
   is linear and every join is a corner. */

function travellingMark(): void {
  const objects = Array.from(document.querySelectorAll<SVGElement>('.xwin__x'));
  const heroWin = document.querySelector<HTMLElement>('.xwin--hero');
  const workWin = document.querySelector<HTMLElement>('.xwin--work');
  const caps = document.querySelector<HTMLElement>('#capabilities');
  /* heroWin is gone with the hero aperture; the archive window is the
     only one left, so only it is required. */
  if (!objects.length || !workWin || !caps) return;

  const root = document.documentElement;
  let keys: MarkKey[] = [];

  const docTop = (el: HTMLElement): number =>
    el.getBoundingClientRect().top + window.scrollY;

  const build = (): void => {
    const vh = window.innerHeight;
    const heroH = heroWin ? heroWin.offsetHeight : 0;
    const workH = workWin.offsetHeight;
    const heroTop = heroWin ? docTop(heroWin) : 0;
    const workTop = docTop(workWin);
    const heroOut = heroTop + heroH;
    const capsIn = docTop(caps) - vh;
    const capsOut = docTop(caps) + caps.offsetHeight;
    const workIn = workTop - vh;
    const workMid = workTop + workH / 2 - vh / 2;
    const workOut = workTop + workH;
    const end = Math.max(root.scrollHeight - vh, 1);

    /* The lens starts below the header, so its middle is not the viewport's
       middle. Every vertical figure below is stated against the lens rather
       than against the window, which is what keeps the object landing where
       the aperture actually is at any header height. */
    /* The archive window is the only aperture left, so the lens geometry
       is read from it rather than from the deleted hero one. */
    const lens = workWin.querySelector<HTMLElement>('.xwin__lens');
    const lr = lens ? lens.getBoundingClientRect() : { top: 0, height: vh };
    const lensMid = lr.top + lr.height / 2;

    /* Where the object has to sit for each aperture to be looking at
       something. In the hero the band is a 180px slot across a 1600px object,
       so it is aimed just under the counter, where both arms are in frame and
       leave the sheet at the mark's own 40.82 degrees. In the archive the band
       is tall enough to hold the whole drawing, so it is aimed at the middle. */
    const heroAim = (heroTop + heroH / 2 - lensMid) / vh - 0.06;
    const workAim = (vh / 2 - lensMid) / vh;

    /* The phone gets its own ladder, the way the type does. A 4x object on a
       1500px sheet puts two arms across the band and the rest off both edges,
       which is the composition. The same 4x on a 390px sheet puts the whole
       drawing off both edges and leaves two tips, which is not. Below the
       desktop band the object is held near its own size and the aperture
       shows the drawing rather than a section through it. */
    const narrow = window.innerWidth < 900;
    const S = narrow
      ? { a: 0.55, b: 0.82, c: 0.9, d: 0.55, e: 0.42 }
      : { a: 3.2, b: 4.4, c: 1.6, d: 0.76, e: 0.5 };

    keys = [
      /* The object no longer opens the page. The hero's full-bleed ramp is
         back behind the headline, which is where the site's colour belongs:
         a travelling mark cannot carry type (an X large enough to cover a
         1116 by 420 headline box would be roughly 14,600px), so keeping it
         there cost the opening frame its colour, 55.9 percent down to 5.1.
         It now stays at zero until the archive, where nothing competes with
         it and it is the only chromatic object on screen. */
      { y: 0, scale: 0, x: -0.02, yOff: heroAim },
      { y: heroOut, scale: 0, x: 0.06, yOff: heroAim - 0.05 },
      { y: capsIn, scale: 0, x: 0.12, yOff: 0 },
      { y: capsOut, scale: 0, x: -0.12, yOff: 0 },
      { y: workIn, scale: S.c, x: -0.06, yOff: workAim + 0.06 },
      { y: workMid, scale: S.d, x: 0, yOff: workAim },
      { y: workOut, scale: S.e, x: 0.03, yOff: workAim },
      { y: end, scale: 0, x: 0, yOff: workAim },
    ];

    /* A short document, a tall window or a resize can put two boundaries in
       the same place. Keyframes have to stay strictly increasing or the
       segment lookup divides by zero. */
    for (let i = 1; i < keys.length; i++) {
      if (keys[i].y <= keys[i - 1].y) keys[i].y = keys[i - 1].y + 1;
    }
  };

  const write = (y: number): void => {
    let i = 0;
    while (i < keys.length - 2 && y > keys[i + 1].y) i++;
    const a = keys[i];
    const b = keys[i + 1];
    const t = Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y)));
    const at = (k: 'scale' | 'x' | 'yOff'): number => a[k] + (b[k] - a[k]) * t;

    root.style.setProperty('--mb-scale', at('scale').toFixed(4));
    root.style.setProperty('--mb-x', `${(at('x') * window.innerWidth).toFixed(1)}px`);
    root.style.setProperty('--mb-y', `${(at('yOff') * window.innerHeight).toFixed(1)}px`);
  };

  build();
  write(window.scrollY);

  /* THE HALF TURN, on a clock rather than on the wheel. One tween of the same
     root property the apertures already read, so the object turns wherever it
     is being looked at, and it is fired once by the archive aperture arriving
     rather than interpolated across a scroll range a reader can stop inside. */
  const turned = { deg: 0 };
  const turn = gsap.to(turned, {
    deg: HALF_TURN,
    duration: DUR_DOUBLE,
    ease: curve,
    paused: true,
    onUpdate: () => root.style.setProperty('--mb-rot', `${turned.deg.toFixed(2)}deg`),
  });

  ScrollTrigger.create({
    id: 'travelling-mark-turn',
    trigger: workWin,
    /* Fired when the aperture is genuinely in view rather than the instant
       its top edge touches the bottom of the frame, so the turn is watched
       rather than half missed under the fold. */
    start: 'top center',
    onEnter: () => turn.play(),
    onLeaveBack: () => turn.reverse(),
  });

  ScrollTrigger.create({
    id: 'travelling-mark',
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => write(self.scroll()),
    onRefresh: () => {
      build();
      write(window.scrollY);
    },
  });
}

/* ------------------------------------------------------------
   ENTRANCES

   Everything that is not a scene, and it is the same arrival the interior
   documents make: up the arm by the law's third rung, opacity with it, the
   base duration, the one curve, once, and never again on the way back up.

   WHAT WAS DELETED HERE. The process rules used to draw themselves in from
   scaleX 0 on a 0.08s stagger, which was the only sequenced entrance and the
   only stagger anywhere on the page. A rule growing out of its left end is a
   growth: it has no direction, so the mark cannot account for it, and the
   law has nothing to say about it. It is gone rather than exempted, and the
   rules are simply drawn. The steps still arrive, on [data-enter], with
   everything else.
   ------------------------------------------------------------ */
function initEnters(): void {
  const d = rung(2);
  document.querySelectorAll<HTMLElement>('[data-enter]').forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, x: -d.x, y: -d.y },
      {
        opacity: 1,
        x: 0,
        y: 0,
        duration: DUR,
        ease: curve,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      }
    );
  });
}

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
export function initCover(): void {
  if (prefersReduced) {
    /* CSS already composes both scenes statically off html.no-motion, which
       main.ts sets before this runs. Nothing here may register a trigger,
       because a document in this state has no scroll choreography at all. */
    return;
  }

  initRotator();
  travellingMark();
  sceneStudio();
  initEnters();

  /* The scene measures the viewport when it builds its tweens, so a font
     landing late or a rotation has to invalidate them. */
  ScrollTrigger.refresh();
}
