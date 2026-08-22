/* ============================================================
   The light switch

   Two rooms, one rig. The palette swap and the inversion of the light itself
   both live in CSS: see the daylight block in tokens.css and the two blend
   hooks it maps. Nothing about how the site looks is decided here.

   What this owns is only the choice. Three states, in order of authority:

     1. an explicit choice, remembered in localStorage
     2. light, which is the palette :root carries

   The operating system's preference is deliberately not one of them. The site
   is a light document by decision: tokens.css carries paper on :root and
   reaches the dark room only through data-theme, so with scripting off every
   reader gets the sheet. This module exists for 1, and for the control that
   sets it. A small inline script in <head> applies a remembered choice before
   the first paint, so nothing flashes; this file takes over afterwards.

   Loaded from partials/nav.html alongside nav.ts, so it reaches every page
   without either entry point importing it.
   ============================================================ */

type Theme = 'light' | 'dark';

const KEY = 'xz-theme';
const root = document.documentElement;

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    // Storage can be blocked outright. The switch still works for this
    // page view; it just cannot remember anything.
    return null;
  }
}

/** What the reader is actually looking at, whatever put them there. */
function active(): Theme {
  const attr = root.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return 'light';
}

function apply(theme: Theme, remember: boolean): void {
  root.setAttribute('data-theme', theme);
  if (remember) {
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* nothing to do: the choice holds for this page view only */
    }
  }
  sync();
}

const button = document.querySelector<HTMLButtonElement>('.nav__theme');
const label = button?.querySelector<HTMLElement>('[data-theme-label]');

function sync(): void {
  if (!button) return;
  const now = active();
  /* The button switches to the other room, so it is named for where it takes
     you rather than for where you are. aria-pressed is deliberately absent:
     this is not a thing that is on or off, it is a destination. */
  const next: Theme = now === 'dark' ? 'light' : 'dark';
  if (label) label.textContent = `Switch to ${next} mode`;
  button.setAttribute('title', `Switch to ${next} mode`);
}

if (button) {
  button.hidden = false;
  sync();

  button.addEventListener('click', () => {
    apply(active() === 'dark' ? 'light' : 'dark', true);
  });
}

/* Marks this file as a module. It is loaded as one, but without an import
   or an export TypeScript treats it as a global script, and the three
   modules the nav loads then share a single scope: two of them declaring
   a function called apply is enough to fail the build. */
export {};
