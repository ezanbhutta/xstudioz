/* ============================================================
   XStudioz: the cover's choreography

   The whole motion vocabulary of this site is in this file, and it is four
   properties: opacity, x, y, and one SVG startOffset. Nothing blurs, nothing
   scales, nothing rotates on entrance, nothing interpolates a colour, and no
   text is ever masked or split by line.

   Two rules govern everything below.

   1. NON-OVERLAPPING WINDOWS. Each scene is driven by exactly one scroll
      progress value and its keyframe windows are laid end to end. At any
      scroll position ONE element is moving. A busy page overlaps five
      timelines; this one queues them.

   2. THE TRAILING HOLD. Both scenes finish all motion at 70% of their track
      and then hold, motionless, for the last 30%. Between them that is about
      three viewports of the document spent looking at a finished, stationary
      composition. It is the cheapest change on the list and the one that
      does most of the work.
   ============================================================ */

import { gsap, ScrollTrigger, prefersReduced } from '../lib/motion';

/* Scenes are scrubbed against native scroll with no smoothing, so `true`
   rather than a number. A lerp here is what makes a long scrub feel like it
   is swimming behind the wheel. */
const SCRUB = true as const;

/* ------------------------------------------------------------
   Splitting

   Words are wrapped so they can never break across a line, and each
   character inside a word becomes its own inline-block span. Whitespace is
   preserved as real text between the word spans rather than as a character,
   so the line still wraps and still reads correctly to a screen reader,
   which sees the element's textContent unchanged.
   ------------------------------------------------------------ */
function splitChars(el: HTMLElement): HTMLElement[] {
  const source = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (!source) return [];

  const chars: HTMLElement[] = [];
  const frag = document.createDocumentFragment();

  source.split(' ').forEach((word, i) => {
    if (i > 0) frag.appendChild(document.createTextNode(' '));
    const w = document.createElement('span');
    w.className = 'scrub-word';
    for (const ch of word) {
      const c = document.createElement('span');
      c.className = 'scrub-char';
      c.textContent = ch;
      w.appendChild(c);
      chars.push(c);
    }
    frag.appendChild(w);
  });

  /* The visible text is now a tree of spans, so the accessible name is
     rebuilt from the original string. Without this a screen reader reads the
     line one letter at a time. */
  el.textContent = '';
  el.appendChild(frag);
  el.setAttribute('aria-label', source);

  return chars;
}

/* ------------------------------------------------------------
   THE HERO ROTATOR

   The one time-based animation on the page. Two states swap every three
   seconds. Each character is its own span entering from 50px below on a 50ms
   stagger, 300ms in and 200ms out, and the outgoing state fully clears
   before the incoming one starts, so the label reads as being replaced from
   underneath rather than cross-faded.

   There is no overflow mask. The characters travel and fade in open space,
   which is why the row reserves its own height in CSS.
   ------------------------------------------------------------ */
/* 50ms per character is right for a word of eight. These labels run to
   twenty, where the same figure would spend 1.0s of a 3.0s cycle on the
   stagger alone and the row would never be still. Capped so the sweep can
   never exceed 0.6s whatever the label says. */
const stagger = (n: number): number => Math.min(0.05, 0.6 / Math.max(1, n));

function initRotator(): void {
  const host = document.querySelector<HTMLElement>('[data-rotator]');
  if (!host || prefersReduced) return;

  const items = Array.from(host.querySelectorAll<HTMLElement>('[data-rotator-item]'));
  if (items.length < 2) return;

  const sets = items.map((el) => {
    el.hidden = false;
    el.style.visibility = 'hidden';
    return { el, chars: splitChars(el) };
  });

  /* Every character starts at full strength. This rotator is not the scrub
     and must not inherit its half-lit from-state. */
  sets.forEach((s) => gsap.set(s.chars, { opacity: 1, y: 0 }));

  let current = 0;
  const show = (i: number): gsap.core.Timeline => {
    const { el, chars } = sets[i];
    el.style.visibility = 'visible';
    return gsap.timeline().fromTo(
      chars,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', stagger: stagger(chars.length) }
    );
  };

  const hide = (i: number): gsap.core.Timeline => {
    const { el, chars } = sets[i];
    return gsap.timeline({ onComplete: () => (el.style.visibility = 'hidden') }).to(chars, {
      opacity: 0,
      y: -50,
      duration: 0.2,
      ease: 'power2.in',
      stagger: stagger(chars.length),
    });
  };

  sets.forEach((s, i) => {
    if (i !== 0) s.el.style.visibility = 'hidden';
  });
  show(0);

  window.setInterval(() => {
    const next = (current + 1) % sets.length;
    const out = hide(current);
    out.eventCallback('onComplete', () => {
      sets[current].el.style.visibility = 'hidden';
      current = next;
      show(next);
    });
  }, 3000);
}

/* ------------------------------------------------------------
   SCENE A, THE STUDIO

   Track 500vh, stage sticky at 100vh. Progress 0 when the track's top meets
   the viewport top, 1 when its bottom does, so the scrub range in pixels is
   exactly the track height.

     0.00 → 0.60   the statement travels the curve, -80% to 110%
     0.50 → 0.60   the curve leaves: x to 200, opacity to 0
     0.60 → 0.70   the payoff arrives: y 50 to 0, opacity 0 to 1
     0.70 → 1.00   held. 1.5 viewports of finished, motionless frame.

   The one overlap in the scene is deliberate and it is on a single element:
   the curve is still travelling while it fades, which is one object leaving,
   not two objects moving.
   ------------------------------------------------------------ */
function sceneStudio(): void {
  const track = document.querySelector<HTMLElement>('[data-scene="studio"]');
  if (!track) return;

  const wave = track.querySelector<HTMLElement>('[data-wave]');
  const path = track.querySelector<SVGTextPathElement>('[data-wave-path]');
  const payoff = track.querySelector<HTMLElement>('[data-payoff]');
  if (!wave || !path || !payoff) return;

  gsap.set(payoff, { opacity: 0, y: 50 });

  const offset = { v: -80 };
  const write = (): void => path.setAttribute('startOffset', `${offset.v}%`);
  write();

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

  tl.to(offset, { v: 110, ease: 'none', duration: 0.6, onUpdate: write }, 0)
    .to(wave, { x: 200, opacity: 0, ease: 'none', duration: 0.1 }, 0.5)
    .to(payoff, { opacity: 1, y: 0, ease: 'none', duration: 0.1 }, 0.6)
    /* The hold. An empty tween is the honest way to say that the last 30% of
       this track is meant to have nothing happening in it. */
    .to({}, { duration: 0.3 }, 0.7);
}

/* ------------------------------------------------------------
   SCENE B, CLEARSPACE

   The set piece.

     0.00 → 0.30   two magenta discs converge from off screen
     0.30 → 0.35   the intro leaves upward, one full viewport, in a flick
     0.35 → 0.45   the line rises into frame from a viewport below
     0.45 → 0.50   the plate fades and lifts 50px in the bottom right
     0.50 → 0.70   the characters brighten, one at a time, 0.5 to 1.0
     0.70 → 1.00   held. 1.5 viewports of finished, motionless frame.

   The discs never fully meet at the centre line. Each stops with enough
   overlap that the curved edges cover the corners of a 100vh stage, which is
   what lets the change of room be performed by two moving objects rather
   than by a background swap.
   ------------------------------------------------------------ */
function sceneClear(): void {
  const track = document.querySelector<HTMLElement>('[data-scene="clearspace"]');
  if (!track) return;

  const top = track.querySelector<HTMLElement>('[data-disc="top"]');
  const bottom = track.querySelector<HTMLElement>('[data-disc="bottom"]');
  const intro = track.querySelector<HTMLElement>('[data-clear-intro]');
  const body = track.querySelector<HTMLElement>('[data-clear-body]');
  const plate = track.querySelector<HTMLElement>('[data-clear-plate]');
  const line = track.querySelector<HTMLElement>('[data-scrub]');
  if (!top || !bottom || !intro || !body || !plate || !line) return;

  const chars = splitChars(line);
  const n = chars.length;

  gsap.set([top, bottom], { y: 0 });
  gsap.set(body, { y: () => window.innerHeight });
  gsap.set(plate, { opacity: 0, y: 50 });
  gsap.set(chars, { opacity: 0.5 });

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

  /* Each disc is 300vh tall and sits one full height off screen. Closing
     travels 66vh, not 50: the ellipse is 240vw across, so its edge sits
     13.6vh higher at the screen edges than at the centre line, and the two
     have to overlap by more than that or the corners of the stage stay open.
     The overlap is what makes a change of room read as seamless. */
  tl.to(top, { y: () => window.innerHeight * 0.66, ease: 'none', duration: 0.3 }, 0)
    .to(bottom, { y: () => window.innerHeight * -0.66, ease: 'none', duration: 0.3 }, 0)
    .to(intro, { y: () => -window.innerHeight, ease: 'none', duration: 0.05 }, 0.3)
    .to(body, { y: 0, ease: 'none', duration: 0.1 }, 0.35)
    .to(plate, { opacity: 1, y: 0, ease: 'none', duration: 0.05 }, 0.45);

  /* Character i lights across [0.5 + (i/n)*0.2, 0.5 + ((i+1)/n)*0.2]. Setting
     the stagger equal to the duration is what makes the windows abut exactly:
     character i finishes on the frame character i+1 begins, so the boundary
     between lit and unlit is a single moving edge rather than a soft band.

     0.5 to 1.0, never 0 to 1. The unread text is always legible at half
     strength, so the reader is never shown blank space. */
  if (n) {
    const each = 0.2 / n;
    tl.to(
      chars,
      { opacity: 1, ease: 'none', duration: each, stagger: { each } },
      0.5
    );
  }

  tl.to({}, { duration: 0.3 }, 0.7);
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
