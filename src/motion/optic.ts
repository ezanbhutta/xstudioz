/* ============================================================
   XStudioz: the loader for the optical scene

   THIS FILE NEVER IMPORTS three, AND THAT IS ITS ENTIRE REASON FOR EXISTING.
   It is the only module the homepage bundle links statically, it is a few
   hundred bytes, and the one thing it can do is decide whether the scene is
   allowed to be fetched at all. The renderer, the shaders and the whole of
   the library sit behind a single dynamic import at the bottom of start(),
   so Rollup emits them as a separate chunk that the fifteen interior routes
   never reference and never load.

   THE GATES, and every one of them is a refusal rather than a degradation:

     the field      under 1024 cover.css does not reserve a second track, so
                    there is no box to draw into. The scene is not made
                    smaller, it is not started.
     reduced motion the static drawing in index.html is the finished
                    composition. A reader who asked for less movement gets
                    the picture, not a blank field.
     Save-Data      the same. A drawing already on the page costs nothing and
                    a WebGL library costs a great deal.
     WebGL          probed synchronously with a throwaway context, which is
                    immediately released, so a machine that cannot create one
                    never pays for the import either.

   THE STILL IS HIDDEN BEFORE THE FIRST PAINT, NOT AFTER THE SCENE ARRIVES.
   boot() runs at DOMContentLoaded, ahead of the hero's first frame, so the
   attribute that hides the drawing is already set when the gates pass. The
   reader therefore never sees the drawing replaced by anything: the field
   stands as the checkpoint composed it, two drawn edges and nothing in
   between, and then the scene settles into it. If the import fails the
   attribute comes off and the drawing is the answer after all.

   THE IMPORT WAITS FOR load. The hero is the LCP element on this page and a
   library of this size parses for long enough to matter. Nothing is fetched
   until the document has finished loading and the main thread is next idle.
   ============================================================ */

import { prefersReduced } from '../lib/motion';

/** What the scene module hands back. Kept structural so this file does not
    have to name a single type from three. */
export interface OpticHandle {
  dispose(): void;
}

const DESKTOP = '(min-width: 1024px)';

/* THE CAPABILITY GATE COSTS NOTHING, AND THE VERSION THAT DID IS DELETED.

   What stood here created a real WebGL context, asked whether it existed and
   immediately threw it away. It was the honest test — a machine can advertise
   the API and still refuse a context because the GPU is blocklisted or
   because it has run out — and it was far too expensive to ask that way.
   Measured on the built page: 23ms for a bare context on this machine, over
   200ms for the first one a process creates, and it ran on EVERY load
   including phones, which never go on to use one. It was the only long task
   the mobile page had.

   So the free half is taken here and the expensive half is taken by the thing
   that needs the context anyway: mount() constructs its renderer inside a
   try/catch and hands back null when the context is refused, and the loader
   puts the drawing back. The rare machine that cannot render has downloaded a
   chunk it will not use; every other machine has stopped paying a context
   creation to be told what it already knew. */
function webglDeclared(): boolean {
  return typeof WebGL2RenderingContext !== 'undefined' || typeof WebGLRenderingContext !== 'undefined';
}

function saveData(): boolean {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData === true;
}

/** The next moment the browser has nothing better to do.

    scheduler.postTask at background priority first, because it is the only
    one of the three that the scheduler will hold back behind PENDING INPUT
    rather than merely behind a busy frame. requestIdleCallback second, with
    a ceiling so a permanently busy main thread does not mean the scene never
    arrives. A timeout last, for anything that has neither. */
function idle(run: () => void, timeout = 1500): void {
  const w = window as Window & typeof globalThis & {
    scheduler?: { postTask?: (cb: () => void, opts?: { priority?: string; delay?: number }) => Promise<unknown> };
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (w.scheduler?.postTask) {
    w.scheduler.postTask(run, { priority: 'background' }).catch(() => undefined);
    return;
  }
  if (w.requestIdleCallback) {
    w.requestIdleCallback(run, { timeout });
    return;
  }
  window.setTimeout(run, 120);
}

/* After load, then at the first spare moment. */
function whenSpare(run: () => void): void {
  if (document.readyState === 'complete') idle(run);
  else window.addEventListener('load', () => idle(run), { once: true });
}

export function initOptic(): void {
  const host = document.querySelector<HTMLElement>('.optic');
  if (!host) return;

  /* All three gates are free: a matchMedia read, a property read and a
     typeof. The still has to be hidden before the first paint, so nothing
     here may cost a frame. */
  if (prefersReduced) return;
  if (saveData()) return;
  if (!webglDeclared()) return;

  const desktop = window.matchMedia(DESKTOP);

  let scene: OpticHandle | null = null;
  let loading = false;
  let dead = false;

  const start = (): void => {
    if (dead || scene || loading || !desktop.matches) return;
    loading = true;
    /* Before the first paint on the common path. The drawing is not shown and
       then swapped; it is never shown. */
    host.dataset.optic = 'live';

    whenSpare(() => {
      if (dead || !desktop.matches) {
        loading = false;
        delete host.dataset.optic;
        return;
      }
      import('./optic-scene')
        .then((mod) => {
          loading = false;
          if (dead || !desktop.matches) {
            delete host.dataset.optic;
            return;
          }
          /* A SECOND YIELD, AND IT IS THE DIFFERENCE BETWEEN ONE LONG TASK
             AND THREE SHORT ONES. A dynamic import resolves its promise in
             the SAME task that evaluated the module, so a .then that goes
             straight on to build a renderer welds the parse, the context
             creation and the first compile into a single block of main
             thread. Measured on the built page: 418ms and 186ms with the
             work joined, against nothing at all on a page without the
             scene.

             Handing the mount back to the idle queue lets the parse task
             end, and mount() then asks for its first frame through
             requestAnimationFrame, which puts the program compile in a
             third task again. Nothing is faster; it is simply no longer one
             thing a first interaction can land behind. */
          idle(() => {
            if (dead || !desktop.matches) {
              delete host.dataset.optic;
              return;
            }
            scene = mod.mount(host);
            if (!scene) delete host.dataset.optic;
          }, 800);
        })
        .catch(() => {
          /* The chunk did not arrive. Give the drawing back rather than
             leaving a reserved field with nothing in it. */
          loading = false;
          delete host.dataset.optic;
        });
    });
  };

  const stop = (): void => {
    scene?.dispose();
    scene = null;
    delete host.dataset.optic;
  };

  desktop.addEventListener('change', () => {
    if (desktop.matches) start();
    else stop();
  });

  /* MPA navigation. Everything the scene holds — the context, the geometry,
     the materials and its own listeners — is released here, so a reader who
     walks the sixteen routes never accumulates a second context. */
  window.addEventListener('pagehide', () => {
    dead = true;
    stop();
  });

  start();
}
