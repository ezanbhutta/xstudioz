/* ============================================================
   Frame — freezing motion so it can be seen

   The problem this solves is not a design problem, it is an instrument
   problem, and it has cost this project four rebuilds.

   The preview environment used to art-direct this site does not fire
   requestAnimationFrame, times out on scroll, and returns blank captures
   after a script mutates the DOM. Screenshots only work on a clean page
   load. So motion could never be watched, only inferred from numbers, and
   inferring how something FEELS from numbers does not work.

   The way out: if a capture is only reliable on load, then put the motion
   state into the URL and let each load render one frame of it.

     /?frame=0      the timeline at its start
     /?frame=0.5    halfway
     /?frame=1      the end

   Every registered timeline is seeked to that progress and left there, with
   its ScrollTrigger disabled so nothing scrubs it back. A sequence of loads
   becomes a storyboard of the transition, photographable frame by frame.

   This is a development instrument. Without the parameter it does nothing at
   all, so it cannot affect a real visit.
   ============================================================ */

/* Vite replaces import.meta.env.DEV with a literal, so the whole instrument
   is statically false in a production build and the bundler drops it. It was
   shipping before this guard: data-frame was present in the built chunk. */
const DEV = import.meta.env.DEV;

const params = new URLSearchParams(window.location.search);
const raw = DEV ? params.get('frame') : null;

/** The requested frame, or null when the site is running normally. */
export const frameAt: number | null =
  raw === null || raw === '' || Number.isNaN(Number(raw))
    ? null
    : Math.min(1, Math.max(0, Number(raw)));

export const frameMode = frameAt !== null;

const held: gsap.core.Animation[] = [];

/**
 * Hand a timeline over to be frozen. Returns it unchanged when not in frame
 * mode, so call sites read the same in both.
 */
export function hold<T extends gsap.core.Animation>(tl: T | null): T | null {
  if (!tl || !frameMode) return tl;
  held.push(tl);
  return tl;
}

/**
 * Seek everything that was handed over. Called once after the page has built
 * its choreography, on the next frame so ScrollTrigger has finished measuring.
 */
export function applyFrame(): void {
  if (!frameMode || frameAt === null) return;

  const seek = (): void => {
    held.forEach((tl) => {
      const st = (tl as gsap.core.Timeline).scrollTrigger;
      /* The trigger would immediately scrub the timeline back to whatever the
         scroll position implies, so it has to be disabled before seeking. */
      if (st) st.disable(false);
      tl.progress(frameAt).pause();
    });
    document.documentElement.setAttribute('data-frame', String(frameAt));
  };

  /* Deliberately NOT requestAnimationFrame. The environment this instrument
     exists to work around is the one that never fires it, so using it here
     would make the tool depend on the fault it is meant to route around.
     Timers do fire, and seeking is idempotent, so this runs immediately and
     again once ScrollTrigger has finished measuring. */
  seek();
  window.setTimeout(seek, 60);
  window.setTimeout(seek, 400);
}

export {};
