/* ============================================================
   THE LIGHT SWITCH

   Three states, and the third one is the reason this file exists at all.

   WHAT THE LAST SWITCH GOT WRONG, so this one does not repeat it. It had two
   states, light and dark, and pressing it always forced one of them. A reader
   whose machine is dark, who pressed it once out of curiosity, was now pinned
   to whichever room they landed in, permanently, because there was no value
   that meant "stop deciding for me". Then the control was deleted while those
   stored values stayed on disk. That is the failure being repaired: a switch
   that can set a preference and cannot clear one is a trap, not a control.

   THE THREE STATES, in the order the button cycles them:

     system   no data-theme attribute at all. :root carries
              `color-scheme: light dark`, so every light-dark() pair in
              tokens.css follows prefers-color-scheme. This is the DEFAULT and
              it is also the state a reader can always get back to.
     light    data-theme="light" narrows color-scheme to light. The sheet.
     dark     data-theme="dark" narrows color-scheme to dark. The void.

   THE ATTRIBUTE IS THE WHOLE MECHANISM. There is no palette here, no class
   list, no per-token mapping, and nothing in this file names a colour. It
   writes one attribute with one of two words in it, or removes it. Everything
   the reader sees is decided by CSS, which is why the system state works with
   this file blocked and with scripting off entirely.

   WHY REMOVING THE ATTRIBUTE IS THE SYSTEM STATE, rather than a third word
   like data-theme="system". A third word would need its own CSS rule, that
   rule would have to restate `color-scheme: light dark`, and it would then be
   possible for the attribute and the default to disagree. Absence cannot
   disagree with anything.

   Loaded from partials/nav.html alongside nav.ts, so it reaches all sixteen
   routes without either entry point importing it. The inline guard in <head>,
   emitted by vite.config.ts, has already replayed a stored choice before the
   first paint; this file takes over afterwards and owns the control.
   ============================================================ */

type Choice = 'light' | 'dark';
type State = Choice | 'system';

const KEY = 'xz-theme';
const root = document.documentElement;

/* The cycle. system -> light -> dark -> system, so the state a reader is
   least likely to want to be stuck in is never more than two presses away
   from the state that stops deciding for them. */
const ORDER: readonly State[] = ['system', 'light', 'dark'] as const;

/* What the control says it will do. These are the control's own labels, in
   the same register the previous switch used, and they are the accessible
   name rather than visible copy: the visible half of this control is the
   glyph, which shows the room instead of naming it. */
const LABEL: Record<State, string> = {
  system: 'Use your system colour scheme',
  light: 'Switch to light mode',
  dark: 'Switch to dark mode',
};

function stored(): Choice | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    /* Storage can be blocked outright. The switch still works for this page
       view; it just cannot remember anything, which is a degradation rather
       than a fault. */
    return null;
  }
}

/** The state as the DOM currently has it, whatever put it there. */
function active(): State {
  const attr = root.getAttribute('data-theme');
  return attr === 'light' || attr === 'dark' ? attr : 'system';
}

function apply(next: State): void {
  if (next === 'system') {
    root.removeAttribute('data-theme');
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* nothing to do: the choice is cleared for this page view only */
    }
  } else {
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* nothing to do: the choice holds for this page view only */
    }
  }
  sync();
}

/* TWO CONTROLS, ONE STATE. The header carries one and the overlay menu
   carries the other, because the header row below 1025px has no width to
   spare. Both are .nav__theme, both are wired here, and sync() writes all of
   them, so the copy inside the menu can never disagree with the copy in the
   bar. */
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.nav__theme'));

function sync(): void {
  const now = active();
  const next = ORDER[(ORDER.indexOf(now) + 1) % ORDER.length];

  for (const button of buttons) {
    /* THE GLYPH SHOWS WHERE YOU ARE. THE NAME SAYS WHERE PRESSING GOES.

       Those are deliberately two different things. A cycling control that
       names its current state leaves a reader guessing what a press will do,
       and one whose glyph shows the destination leaves them guessing where
       they are. The visible disc is the room; the accessible name is the
       next room.

       data-theme-state is also the ONLY thing that draws this control. CSS
       holds .nav__theme at display: none until this attribute exists, so a
       button whose script never ran is never in the tab order. That is the
       repair for the 0 x 0 phantom: the drawing and the behaviour are now
       switched on by the same one thing. */
    button.setAttribute('data-theme-state', now);
    button.setAttribute('title', LABEL[next]);
    const label = button.querySelector<HTMLElement>('[data-theme-label]');
    if (label) label.textContent = LABEL[next];
  }
}

/* RECONCILE BEFORE DRAWING. The inline guard in <head> has normally already
   replayed a stored choice, and when it has, this is a no-op. It runs anyway
   because the two are separate code paths and only one of them is inline: if
   a Content Security Policy blocks the inline script, or a future edit drops
   it from the head, the reader's remembered room is restored here instead of
   silently ignored. One frame later than the guard, which is the cost of the
   belt as against the braces. */
const remembered = stored();
if (remembered && active() === 'system') root.setAttribute('data-theme', remembered);

if (buttons.length) {
  sync();

  for (const button of buttons) {
    button.addEventListener('click', () => {
      apply(ORDER[(ORDER.indexOf(active()) + 1) % ORDER.length]);
    });
  }
}
