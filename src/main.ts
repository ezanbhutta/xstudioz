/* ============================================================
   XStudioz — the cover

   This file owns the cover's own choreography and nothing else. Everything
   that has to behave identically on every document (smooth scroll, the
   header, the shared reveals, the reveal failsafe, the static QA mode) lives
   in lib/motion.ts and is imported from there.

   Both files used to carry forked copies of a generic reveal-on-enter pass.
   That language is gone from the site entirely; nothing here stages an
   arrival.
   ============================================================ */

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
/* The cover shares the interior pages' skip link, footer index and
   question blocks, so it needs their styles too. */
import './styles/doc.css';

import {
  gsap,
  ScrollTrigger,
  EASE,
  EASE_INOUT,
  prefersReduced,
  initLenis,
  initNav,
  revealFailsafe,
  applyStaticScroll,
} from './lib/motion';
import { stage, clear, drift, STAGE_EASE } from './lib/stage';
import { shunt } from './lib/shunt';
import { initArchive, initInversion } from './motion/ending';
import { applyFrame, frameMode, hold } from './lib/frame';
import { initMeasure, settle, probe, projectBetween, suspend } from './lib/measure';
import { initConsent } from './lib/consent';
import { initAnalytics } from './lib/analytics';

/* ------------------------------------------------------------
   Reveals belonging to the cover alone
   ------------------------------------------------------------ */
function initCoverReveals(): void {
  if (prefersReduced) return;

  // Plates — unmask upward as they enter
  document.querySelectorAll<HTMLElement>('[data-clip]').forEach((el) => {
    const lines = el.querySelectorAll<HTMLElement>('.line__in');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: 'top 80%', once: true },
    });
    tl.fromTo(
      el,
      { clipPath: 'inset(0 0 100% 0)' },
      { clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: EASE_INOUT }
    );
    if (lines.length) {
      tl.fromTo(
        lines,
        { yPercent: 112 },
        { yPercent: 0, duration: 1.1, ease: EASE, stagger: 0.09 },
        '-=0.45'
      );
    }
  });

  // Process — the step rules draw in sequence before the steps rise
  const processRules = document.querySelectorAll<HTMLElement>('.process__rule');
  if (processRules.length) {
    gsap.fromTo(
      processRules,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 1,
        ease: EASE_INOUT,
        stagger: 0.14,
        scrollTrigger: { trigger: '.process__steps', start: 'top 85%', once: true },
      }
    );
  }
}

/* ------------------------------------------------------------
   The cover as a set of stages

   Each of these pins and performs rather than scrolling past, which is the
   motion language taken from the references. The hero holds while the
   statement drives apart and the light sweeps through it; the capabilities
   wipe up over the top of it; the archive plate holds while its own contents
   travel. Everything is transform and opacity, scrubbed to the scroll.
   ------------------------------------------------------------ */
function initStages(): void {
  if (prefersReduced && !frameMode) return;

  /* ---- The next section rides up over the pinned hero ---- */
  const caps = document.querySelector<HTMLElement>('.caps');
  if (caps) clear(caps);

  /* ---- Every section after the first wipes the same way ----
     One rule for the whole page is what makes it feel like a single piece
     rather than a sequence of separately animated ideas. */
  document
    .querySelectorAll<HTMLElement>('.studio, .anatomy, .process, .qa, .brief')
    .forEach((section) => clear(section));
}

/* ------------------------------------------------------------
   Preloader

   Shown once per session: an inline script in <head> sets .show-loader on
   the first visit only, so a reload or a move between pages goes straight to
   the page. The overlay is display:none by default and that script is what
   opts in, so it can never appear on a document whose scripts failed early.

   The handoff. The veil begins to lift and the hero entrance begins in the
   same frame, so the hero is already moving while it is being revealed
   rather than sitting finished behind a screen or, worse, starting over
   once the screen has gone. Nothing is animated twice and there is no
   moment where the hero exists but cannot be seen.

   The mark's fill is a clip rather than a transform, which is the one place
   in this file that ignores the transform/opacity rule. A rising fill cannot
   be expressed as a transform without counter-scaling the artwork inside it,
   and this is a single 110px element animated once per session. Everything
   else here, including the veil itself, is transform and opacity.
   ------------------------------------------------------------ */
function initLoader(onReveal: () => void): void {
  const loader = document.getElementById('loader');
  const wanted = document.documentElement.classList.contains('show-loader');

  const clear = (): void => {
    loader?.remove();
    document.documentElement.classList.remove('show-loader');
    document.body.classList.remove('is-loading');
  };

  if (!loader || !wanted || prefersReduced) {
    clear();
    onReveal();
    return;
  }

  document.body.classList.add('is-loading');

  gsap
    .timeline({ onComplete: clear })
    .fromTo(
      '.loader__x--fill',
      { clipPath: 'inset(100% 0 0 0)' },
      { clipPath: 'inset(0% 0 0 0)', duration: 0.7, ease: EASE_INOUT }
    )
    .fromTo('.loader__word', { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' }, 0.2)
    // The scroll lock comes off, the hero starts, and the veil starts moving,
    // all on the same frame.
    .add(() => {
      document.body.classList.remove('is-loading');
      onReveal();
    }, '+=0.1')
    .to(loader, { yPercent: -100, duration: 0.8, ease: EASE_INOUT }, '<');
}

/* ============================================================
   2. src/main.ts — heroIntro() and the hero block of initStages() are
   DELETED and replaced by everything below. So is the .hero__scroll fade in
   initCoverReveals(): the cue is inside .hero__foot and is carried by the
   foot's displacement, so fading it as well would be a second, causeless
   motion on the same element.

   DIVISION OF LABOUR, and mixing these is the classic bug:
     CSS owns every layout-scale transform, through three registered numbers.
     GSAP owns those three numbers, --dim-k / --dim-ka, and the figures.
     GSAP never writes transform on a displaced element.
   ============================================================ */


declare global { interface Window { __xzHero?: number } }

const hero = document.querySelector<HTMLElement>('.hero');

/* Resolved from the DOM rather than assumed, so inserting a dimension cannot
   silently transpose two figures. measure.ts walks [data-dim] in document
   order, which is the order probe() returns. */
let DIMS: HTMLElement[] = [];
let iA = -1, iAY = -1, iB = -1, iC = -1;

/* Cached at rest, never during motion. Nothing below this line reads a rect. */
let base: number[] = [];
let W0 = 22;
let GUT = 0;
let jam: number[][] = [];
let spec: number[][] = [];
let mobile = false;

const drive = { open: 1, push: 0, take: 0 };

const setDrive = (): void => {
  hero!.style.setProperty('--hero-open', String(drive.open));
  hero!.style.setProperty('--hero-push', String(drive.push));
  hero!.style.setProperty('--hero-take', String(drive.take));
};

/* Inline styles only. getComputedStyle on --markw would return the literal
   string "clamp(72px, 6.2vw, 124px)" and parseFloat would give NaN, which is
   what silently disabled an entire earlier draft. --w is written by measure.ts
   as a bare number, so it parses, and it is the MEASURED width rather than the
   authored one. Reading element.style costs no layout. */
const readW = (): number => parseFloat(hero!.style.getPropertyValue('--w')) || 22;
const lenOf = (el: HTMLElement): number => parseFloat(el.style.getPropertyValue('--dim-len')) || 0;

/* Mirrors print() in measure.ts exactly, so a figure this file writes and a
   figure settle() writes can never be formatted differently. */
const fmtW = (n: number): string =>
  (Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1)) + 'W';

const setK = (el: HTMLElement | undefined, k: number): void => {
  if (!el) return;
  el.style.setProperty('--dim-k', String(k));
  el.style.setProperty('--dim-ka', String(Math.max(0.02, Math.abs(k))));
};
const clearK = (): void => DIMS.forEach((el) => setK(el, 1));

/* Capture the rest state. Zeroes the drivers, measures, caches, restores, all
   synchronously so nothing paints in between. Same idiom as probe(). */
function capture(): void {
  const keep = { ...drive };
  drive.open = 1; drive.push = 0; drive.take = 0;
  setDrive();
  clearK();
  suspend(false);
  settle();
  W0 = readW();
  GUT = parseFloat(getComputedStyle(hero!.querySelector('.container')!).paddingLeft) || 0;
  base = DIMS.map(lenOf);
  mobile = window.matchMedia('(max-width: 860px)').matches;
  Object.assign(drive, keep);
  setDrive();
}

/* ---------- THE CLAIM, on load ----------
   The mark claims its 1W on the right and the type claims its 1W below.
   Nothing arrives: two blocks are simply in the wrong place at first paint,
   put there by CSS before any script ran, and the rule takes the room back.

   Because every transform is LINEAR in --hero-open, every gap is linear in it
   too, so interpolating the probed endpoints at t = open is exact at every
   frame under any ease. The line's scale comes from the same interpolated
   pixel value the figure prints, so the drawing and the number are one
   quantity by construction. */
function heroClaim(): void {
  if (!hero) return;
  if (prefersReduced && !frameMode) {
    drive.open = 1; setDrive();
    settle();
    hero.classList.add('is-spec');
    return;
  }

  drive.open = 1; setDrive();
  capture();
  spec = probe(() => {}, () => {});                    // truth, at rest
  jam = probe(
    () => { drive.open = 0; setDrive(); },             // the violation,
    () => { drive.open = 1; setDrive(); }              // measured, not guessed
  );

  writeClaim(0);

  const p = { v: 0 };
  hold(
    gsap.timeline({
      onUpdate: () => writeClaim(p.v),
      onComplete: () => {
        suspend(false);
        clearK();
        settle();
        hero.classList.remove('is-over');
        hero.classList.add('is-spec');
        capture();
      },
    })
  )?.to(p, { v: 1, duration: 1.25, ease: EASE });      // 'expo.out'
}

function writeClaim(t: number): void {
  drive.open = t;
  setDrive();
  const a = jam[0] || [];
  const b = spec[0] || [];
  DIMS.forEach((el, i) => {
    const from = a[i] ?? 0;
    const px = from + ((b[i] ?? 0) - from) * t;
    setK(el, base[i] ? px / base[i] : 1);
    el.classList.toggle('is-over', px < 0);
  });
  projectBetween(jam, spec, t);                        // the same px, printed
  hero!.classList.toggle('is-over', t < 0.999);
}

/* ---------- THE CLAIM, on scroll ----------
   One cause: the mark's clearance opens from 1W to 4W. Five displacements
   follow from it, and one of them is the sheet giving back what it can.

   Contact. Past 0.42 the type has run out of gutter, so the remainder of the
   claim is transmitted back through it into the mark, which is shoved left by
   up to 1.2W. The type's own travel is reduced by exactly that, which is why
   DIM-A still reads exactly 4W at the end: its gap is (type - mark) and the
   shove cancels out of it. The mark takes the hit so the sheet does not have
   to lose the type. It is the only moment on this site where the logo is not
   where it belongs.

   Two ramps on two schedules means no single scalar keeps the gaps linear, so
   probe/projectBetween would be wrong here. The figures and the scales are
   instead one shared delta expression over cached rest lengths. No rect is
   read on scroll, by anything. */
function heroTrack(): void {
  if (!hero) return;
  const tl = stage(hero, { length: 1.8, scrub: 0.8 });   // 180svh of track
  if (!tl) return;

  const p = { push: 0, take: 0 };

  const write = (): void => {
    drive.push = p.push; drive.take = p.take;
    setDrive();

    const claim = (mobile ? 2 : 3) * W0 * p.push;
    const shove = mobile ? 0 : Math.min(1.2 * W0, GUT - 8) * p.take;
    const tx = claim - shove;                    // the type's real travel
    const dy = 1.6 * W0 * p.push;                // the stack's

    const d: number[] = new Array(DIMS.length).fill(0);
    if (mobile) {
      if (iAY >= 0) d[iAY] = claim;
    } else {
      if (iA >= 0) d[iA] = claim;                // shove cancels: (type - mark)
      if (iB >= 0) d[iB] = -tx;
      if (iC >= 0) d[iC] = dy;
    }

    suspend(true);                               // the RO must not fight this
    DIMS.forEach((el, i) => {
      if (!base[i]) return;
      const px = base[i] + d[i];
      setK(el, px / base[i]);
      const out = el.querySelector<HTMLElement>('[data-dim-out]');
      if (out) out.textContent = el.id === 'dim-d' ? String(Math.round(px)) : fmtW(px / W0);
      el.classList.toggle('is-over', px < 0);
    });
    hero.classList.toggle('is-over', iB >= 0 && !!base[iB] && base[iB] - tx < 0);

    if (p.push <= 0.002 && p.take <= 0.002) {    // back at rest: hand it back
      suspend(false);
      clearK();
      settle();
      hero.classList.remove('is-over');
    }
  };

  tl.to(p, { push: 1, ease: 'none', duration: 0.8, onUpdate: write }, 0)
    .to(p, { take: 1, ease: 'power2.in', duration: 0.2, onUpdate: write }, 0.42);

  /* A resize mid-track changes every rest length. Re-cache and re-apply in one
     synchronous pass so the drawing and the figures never run on stale bases. */
  ScrollTrigger.addEventListener('refresh', () => { capture(); write(); });
}

/* ---------- THE CALIPER ----------
   The only thing on the page that responds to the reader before they have
   decided whether to care. It has no arrival and no exit; it tracks a
   neighbour. Walk it into the 1W protected band and it goes magenta: the
   reader can violate the clearspace with their own hand and the sheet says so.
   Two reads then one write, once per frame, on the pointer and never on
   scroll. */
function heroCaliper(): void {
  if (!hero || prefersReduced) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const cal = document.getElementById('hero-caliper');
  const out = document.getElementById('hero-caliper-out');
  const mark = document.getElementById('hero-mark');
  if (!cal || !out || !mark) return;

  let cx = 0;
  let raf = 0;
  hero.addEventListener('pointermove', (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    cx = e.clientX;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const s = hero.getBoundingClientRect();
      const m = mark.getBoundingClientRect();
      if (!m.width) return;
      const d = (cx - m.right) / m.width;
      cal.style.setProperty('--cx', `${cx - s.left}px`);
      out.textContent = fmtW(d);
      cal.classList.toggle('is-violation', d > 0 && d < 1);
    });
  }, { passive: true });
}

/* ---------- boot() ----------
   Replaces the bare initMeasure() call and the initLoader() callback in the
   existing boot(). Everything above initMeasure in boot() is unchanged:
   initConsent, initConsentLink, initAnalytics, initLenis, initNav,
   initCoverReveals, initStages. */
function bootHero(): void {
  if (!hero) return;
  window.__xzHero = 1;                       // cancels the head watchdog

  /* prefers-reduced-motion, ?static and the renderer-viewport heuristic are
     all JS-detected and none of them trip a media query, so the un-jam has to
     be written here rather than left to CSS. Inline beats the html.js rule. */
  if (prefersReduced && !frameMode) hero.style.setProperty('--hero-open', '1');

  initMeasure(document);                     // wires [data-stage], publishes --w
  DIMS = Array.from(hero.querySelectorAll<HTMLElement>('[data-dim]'));
  const at = (id: string) => DIMS.findIndex((el) => el.id === id);
  iA = at('dim-a'); iAY = at('dim-a-y'); iB = at('dim-b'); iC = at('dim-c');

  heroTrack();
  heroCaliper();

  /* Type metrics move every edge on this sheet, so the claim waits for the
     font. The veil, when there is one, covers the wait; when there is not,
     the violation is already painted, so there is nothing to hide. */
  Promise.all([
    document.fonts?.ready ?? Promise.resolve(),
    new Promise<void>((r) => initLoader(() => r())),
  ]).then(() => {
    heroClaim();
    requestAnimationFrame(() => ScrollTrigger.refresh());
  });
}

/* ------------------------------------------------------------
   The claims

   Two chains, one law. Both are stated top to bottom, because the order in
   the array IS the causal order: body n is displaced by every claim above
   it and by nothing else.
   ------------------------------------------------------------ */
function initShunts(): void {
  const caps = document.querySelector<HTMLElement>('.caps');
  if (caps) {
    /* Seven bodies, six claims. The statement claims first and the whole
       list is displaced; then each row in turn; the seal receives all six
       and closes the list wherever the claims have left it. */
    const bodies = [
      caps.querySelector<HTMLElement>('.caps__statement'),
      ...caps.querySelectorAll<HTMLElement>('.caps__row'),
      caps.querySelector<HTMLElement>('.caps__seal'),
    ].filter((el): el is HTMLElement => !!el);

    shunt({ section: caps, bodies, start: 'top 70%', travel: 1.6, scrub: 0.7 });
  }

  const anatomy = document.querySelector<HTMLElement>('.anatomy');
  const fig01 = anatomy?.querySelector<HTMLElement>('#fig-01');
  const fig02 = anatomy?.querySelector<HTMLElement>('.reg');
  if (anatomy && fig01 && fig02) {
    /* One claim. The construction figure takes its clearspace and the
       registration proof is displaced by it. The proof itself never moves on
       its own account, which is the point: a proof is a static fact. */
    shunt({ section: anatomy, bodies: [fig01, fig02], start: 'top 60%', travel: 3, scrub: 0.7 });
  }
}

/* ------------------------------------------------------------
   The registration probe

   The plate is registered at rest, which is the state worth showing, so this
   only has to be able to break it. A real button, so it is keyboard
   reachable and works on touch, with aria-pressed carrying the state. The
   readout is the only text that changes, and both figures in it are measured.
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

// in boot(), after initStages():
  initShunts();
  initRegistration();

/* initMeasure() already runs first in boot(), which is load bearing: the
   shunt reads --clearspace and takes its baseline off a measured document,
   so the geometry has to exist before any claim is built. */

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
function boot(): void {
  // Consent first, so nothing measures before a choice exists. This order is
  // load-bearing: initConsent sets the Consent Mode defaults that the other
  // two depend on.
  initConsent();
  initAnalytics();

  const lenis = initLenis();
  initNav(lenis);
  initCoverReveals();
  initStages();
  /* The ending owns its own choreography, because both of its stages read
     real geometry while they run rather than tweening to numbers. */
  initArchive();
  initInversion();

  /* bootHero owns the hero end to end: the measurement pass, the parse-time
     violation, the claim that resolves it, the scrubbed track and the
     caliper. It also drives the loader, because the veil lifting and the
     sheet claiming its clearance are one event rather than two. */
  bootHero();

  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  revealFailsafe();
  applyStaticScroll();
  applyFrame();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
