/* ============================================================
   XStudioz: the cover's choreography

   The whole motion vocabulary of this site is five properties: opacity, x,
   rotation, scale, and one unitless number driving a clip-path. Nothing
   blurs, nothing interpolates a colour, and no text is ever masked or split
   into characters. Scale is new and it belongs to exactly one thing, the
   travelling mark, which uses it in place of an opacity fade: an object that
   leaves by shrinking to zero reads as departure, where the same object
   fading reads as a rendering fault.

   Three rules govern everything below.

   1. THE MOVE IS HORIZONTAL, AND THE TURN IS HALF. Every entrance and exit
      in both scenes travels sideways, and the one rotation on the site is a
      180 degree turn about 49.90% / 50.71% of the mark's box. That figure is
      measured off the artwork: the counter maps onto itself 22 of 22
      vertices at a half turn, 29 of 52 at a quarter and 32 of 52 mirrored,
      so a half turn is the only rotation this drawing can make honestly and
      nothing here is ever turned 90 degrees.

   2. WINDOWS ARE LAID END TO END, WITH ONE DELIBERATE OVERLAP. Each scene is
      driven by exactly one scroll progress value. The single overlap is the
      blade and the turn in Scene A, and they overlap because they are one
      event: the room going over.

   3. THE TRAILING HOLD, SHORTER. Scene A holds for the last 26% of its
      320vh track and Scene B for the last 20% of its 400vh. That is about
      1.6 viewports of stillness across the document rather than the 3.3 a
      500vh and a 600vh track with 30% holds would spend on it.
   ============================================================ */

import { gsap, ScrollTrigger, prefersReduced } from '../lib/motion';

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

/* One number, written straight onto the element. GSAP cannot interpolate a
   polygon() with per-point calc in it, and it does not have to: the whole
   shape is a function of --wipe, so the timeline tweens a plain object and
   the browser recomputes the clip. */
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
     is on the page is the opposite of the rest of this build. */
  window.setTimeout(() => {
    gsap
      .timeline()
      .to(items[0], { opacity: 0, duration: 0.45, ease: 'power2.inOut' })
      .to(items[1], { opacity: 1, duration: 0.45, ease: 'power2.inOut' }, '>-0.15');
  }, 4200);
}

/* ------------------------------------------------------------
   SCENE A, THE STUDIO. The half turn.

   Track 320vh, stage sticky at 100vh. Progress 0 when the track's top meets
   the viewport top, 1 when its bottom does, so the scrub range in pixels is
   exactly the track height.

     0.00 → 0.18   the statement resolves, word by word, centre outward
     0.18 → 0.28   the statement leaves sideways, x to -180 and opacity to 0
     0.28 → 0.54   the violet blade sweeps in from the right AND the mark
                   turns a half turn about 49.90% / 50.71% of its box
     0.54 → 0.74   the payoff arrives on opacity alone, no travel, and the
                   mark clears out from under it.
     0.74 → 1.00   held.

   The room change and the turn share their window on purpose: they are one
   event, and separating them would read as two things happening in a row
   rather than as a page going over. The mark is alone on the stage while it
   turns, because a half turn that a reader has to pick out from behind a
   headline is not a claim about registration, it is a texture.
   ------------------------------------------------------------ */
function sceneStudio(): void {
  const track = document.querySelector<HTMLElement>('[data-scene="studio"]');
  if (!track) return;

  const blade = track.querySelector<HTMLElement>('[data-blade]');
  const mark = track.querySelector<HTMLElement>('[data-turn-mark]');
  const line = track.querySelector<HTMLElement>('[data-reveal-words]');
  const payoff = track.querySelector<HTMLElement>('[data-payoff]');
  if (!blade || !mark || !line || !payoff) return;

  gsap.set(payoff, { opacity: 0 });
  /* The measured centre, stated to the transform system explicitly. GSAP
     defaults transformOrigin to the box centre the first time it writes a
     transform, and the whole claim this site makes about its mark is that
     the box centre is the wrong point. */
  gsap.set(mark, { transformOrigin: '49.90% 50.71%', rotation: 0 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: track,
      start: 'top top',
      end: 'bottom top',
      scrub: SCRUB,
      id: 'scene-studio',
      invalidateOnRefresh: true,
    },
  });

  resolveWords(line, tl, 0, 0.18);

  tl.to(line, { x: -180, opacity: 0, ease: 'none', duration: 0.1 }, 0.18);

  wipe(blade, 0, 1, 0.28, 0.26, tl);

  tl.to(mark, { opacity: 1, ease: 'none', duration: 0.08 }, 0.28)
    .to(mark, { rotation: 180, ease: 'none', duration: 0.26 }, 0.28)
    /* It goes when the payoff arrives. Held at even a tenth of its strength
       it still cut edges through the running text underneath it, and a mark
       that damages the legibility of the sentence beside it is not being
       used properly. The turn has been made; nothing is served by leaving
       the evidence on the wall. */
    .to(mark, { opacity: 0, ease: 'none', duration: 0.1 }, 0.54)
    .to(payoff, { opacity: 1, ease: 'none', duration: 0.2 }, 0.54)
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

   FOUR NUMBERS, WRITTEN ON THE ROOT. Scale, turn, and travel in x and y. The
   apertures in cover.css read them, so however many holes the page is given
   they are all showing the same object at the same instant. Nothing else in
   the system writes them.

   THE ENVELOPE IS DERIVED, NOT COPIED. The reference runs 1.0 -> 2.0 -> 0 ->
   1.0 -> 0 against its own section boundaries. These keyframes are measured
   off this document's boundaries at run time, so they hold at any width and
   survive a font landing late:

     0                 scale 3.20  rot   0   two arms crossing the slot
     hero aperture out scale 4.40  rot   0   grown through the opening frame
     capabilities in   scale 0     rot   0   HANDOVER OPENS
     capabilities out  scale 0     rot 180   HANDOVER CLOSES, and the turn
     archive in        scale 1.60  rot 180   returning, readable as a drawing
     archive centred   scale 0.76  rot 180   the whole mark, half turned
     archive out       scale 0.50  rot 180   leaving before the portal
     end of document   scale 0     rot 180   gone

   THE HANDOVER LIVES BETWEEN KEYFRAMES 2 AND 3, the two zeros either side of
   #capabilities. That window is deliberately empty: a rotating index dial is
   the likely next addition to that section, and two large gradient objects on
   screen at once would read as patchwork. There is one chromatic body on this
   page at any moment and it changes job rather than multiplying, so a dial
   dropped into Capabilities needs no change here at all. Widen the window by
   moving those two keyframes, never by adding a third object.

   TURN IN HALVES ONLY, AND NEVER IN VIEW. The drawing maps onto itself 22
   vertices out of 22 at a half turn about 49.90% / 50.71%, and 29 of 52 at a
   quarter, so a half turn is the only rotation it can make honestly. A scrub
   interpolates, and an interpolated 0 to 180 spends most of its range showing
   the mark at angles the drawing does not have. So the whole turn is spent
   inside the handover, where the scale is already 0: the object is seen at 0
   degrees and at 180 degrees and at nothing in between. That is the claim the
   mark makes about itself made literally, rather than shown as a spin.
   ------------------------------------------------------------ */

type MarkKey = { y: number; scale: number; rot: number; x: number; yOff: number };

/* Smoothstep across one segment. The scrub itself is one to one with the
   wheel; this only rounds the corner where two keyframes meet, so the object
   does not visibly change direction on a single frame. */
function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

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
      { y: 0, scale: 0, rot: 0, x: -0.02, yOff: heroAim },
      { y: heroOut, scale: 0, rot: 0, x: 0.06, yOff: heroAim - 0.05 },
      { y: capsIn, scale: 0, rot: 0, x: 0.12, yOff: 0 },
      { y: capsOut, scale: 0, rot: 180, x: -0.12, yOff: 0 },
      { y: workIn, scale: S.c, rot: 180, x: -0.06, yOff: workAim + 0.06 },
      { y: workMid, scale: S.d, rot: 180, x: 0, yOff: workAim },
      { y: workOut, scale: S.e, rot: 180, x: 0.03, yOff: workAim },
      { y: end, scale: 0, rot: 180, x: 0, yOff: workAim },
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
    const t = smooth(Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y))));
    const at = (k: 'scale' | 'rot' | 'x' | 'yOff'): number => a[k] + (b[k] - a[k]) * t;

    root.style.setProperty('--mb-scale', at('scale').toFixed(4));
    root.style.setProperty('--mb-rot', `${at('rot').toFixed(2)}deg`);
    root.style.setProperty('--mb-x', `${(at('x') * window.innerWidth).toFixed(1)}px`);
    root.style.setProperty('--mb-y', `${(at('yOff') * window.innerHeight).toFixed(1)}px`);
  };

  build();
  write(window.scrollY);

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

   Everything that is not a scene. One pattern, applied once, never repeated:
   20px of travel, half a second, opacity and y together, and it does not
   play again on the way back up.
   ------------------------------------------------------------ */
function initEnters(): void {
  document.querySelectorAll<HTMLElement>('[data-enter]').forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      }
    );
  });

  /* The process rules draw before the steps read, which is the one sequenced
     entrance on the page and the only stagger anywhere in it. */
  const rules = document.querySelectorAll<HTMLElement>('.process__rule');
  if (rules.length) {
    gsap.fromTo(
      rules,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 0.8,
        ease: 'power2.out',
        stagger: 0.08,
        scrollTrigger: { trigger: '.process__steps', start: 'top 85%', once: true },
      }
    );
  }
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
