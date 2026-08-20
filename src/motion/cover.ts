/* ============================================================
   XStudioz: the cover's choreography

   The whole motion vocabulary of this site is four properties: opacity, x,
   one rotation, and one unitless number driving a clip-path. Nothing blurs,
   nothing scales, nothing interpolates a colour, and no text is ever masked
   or split into characters.

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
   SCENE B, CLEARSPACE. The blade.

   The set piece, and the mirror of Scene A: its blade enters from the other
   side, and its room change happens FIRST rather than in the middle.

     0.00 → 0.26   the magenta blade sweeps in from the left
     0.26 → 0.34   the intro leaves sideways, x to 200
     0.34 → 0.48   the body arrives sideways from -220
     0.48 → 0.56   the plate lands on a half turn about the mark's centre
     0.56 → 0.80   the note resolves, word by word, centre outward
     0.80 → 1.00   held.

   Two 300vh circles used to converge here from off screen top and bottom.
   They were the most recognisable borrowed mechanic on the page and they are
   gone. The type in this scene is set in an ink that is legal on both the
   paper it starts on and the magenta it ends on, so the ground changes under
   a statement that never moves and is never hidden.
   ------------------------------------------------------------ */
function sceneClear(): void {
  const track = document.querySelector<HTMLElement>('[data-scene="clearspace"]');
  if (!track) return;

  const blade = track.querySelector<HTMLElement>('[data-blade]');
  const intro = track.querySelector<HTMLElement>('[data-clear-intro]');
  const body = track.querySelector<HTMLElement>('[data-clear-body]');
  const plate = track.querySelector<HTMLElement>('[data-clear-plate]');
  const line = track.querySelector<HTMLElement>('[data-reveal-words]');
  if (!blade || !intro || !body || !plate || !line) return;

  gsap.set(body, { x: -220, opacity: 0 });
  gsap.set(plate, { opacity: 0, transformOrigin: '49.90% 50.71%', rotation: -180 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: track,
      start: 'top top',
      end: 'bottom top',
      scrub: SCRUB,
      id: 'scene-clear',
      invalidateOnRefresh: true,
    },
  });

  wipe(blade, 0, 1, 0, 0.26, tl);

  tl.to(intro, { x: 200, opacity: 0, ease: 'none', duration: 0.08 }, 0.26)
    .to(body, { x: 0, opacity: 1, ease: 'none', duration: 0.14 }, 0.34)
    .to(plate, { opacity: 1, rotation: 0, ease: 'none', duration: 0.08 }, 0.48);

  resolveWords(line, tl, 0.56, 0.24);

  tl.to({}, { duration: 0.2 }, 0.8);
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
   THE REGISTRATION PROBE

   Not motion. A real button, keyboard reachable, with aria-pressed carrying
   the state and a readout whose two figures are both measured.
   ------------------------------------------------------------ */
function initRegistration(): void {
  const reg = document.querySelector<HTMLElement>('.reg');
  const btn = reg?.querySelector<HTMLButtonElement>('[data-reg-break]');
  if (!reg || !btn) return;

  const name = btn.querySelector<HTMLElement>('[data-reg-label]');
  const out = btn.querySelector<HTMLElement>('[data-reg-out]');

  btn.addEventListener('click', () => {
    const broken = reg.classList.toggle('is-broken');
    btn.setAttribute('aria-pressed', String(broken));
    if (name) name.textContent = broken ? 'Restore registration' : 'Break registration';
    if (out) {
      out.textContent = broken
        ? '90° · 29 of 52 · residual visible'
        : '180° · 22 of 22 · residual 0';
    }
  });
}

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
export function initCover(): void {
  initRegistration();

  if (prefersReduced) {
    /* CSS already composes both scenes statically off html.no-motion, which
       main.ts sets before this runs. Nothing here may register a trigger,
       because a document in this state has no scroll choreography at all. */
    return;
  }

  initRotator();
  sceneStudio();
  sceneClear();
  initEnters();

  /* Two of the scenes measure the viewport when they build their tweens, so
     a font landing late or a rotation has to invalidate them. */
  ScrollTrigger.refresh();
}
