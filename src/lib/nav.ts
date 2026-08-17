/* ============================================================
   Navigation

   Deliberately self-contained: this module is loaded straight from
   partials/nav.html, so it reaches all sixteen pages without either page
   entry having to import it. That keeps it out of main.ts and page.ts.

   The overlay is a native <dialog> opened with showModal(), which gives us
   the focus trap, the Escape key, inert background content and the top layer
   for free. What is left for us is the part the platform does not do:
   returning focus to the trigger, closing on a backdrop press, and locking
   the page scroll without letting the layout jump.
   ============================================================ */

/* ------------------------------------------------------------
   Which page you are on

   The header gave no indication of it. The breadcrumb marks the current page
   on interior documents, but the navigation itself never did, on any route,
   and the cover had no aria-current anywhere in the document at all.

   Marked here rather than in each page's markup because the header is one
   shared partial: sixteen copies of the same hand-maintained attribute is
   exactly the kind of thing that goes stale. The section links (/#capabilities)
   are deliberately skipped, since a link to a section of the current page is
   not the current page.
   ------------------------------------------------------------ */
function markCurrentPage(): void {
  const here = window.location.pathname.replace(/index\.html$/, '');

  document.querySelectorAll<HTMLAnchorElement>('.nav__link, .nav__menu-link').forEach((a) => {
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.hash) return;
    if (url.pathname.replace(/index\.html$/, '') !== here) return;

    a.setAttribute('aria-current', 'page');
  });
}

markCurrentPage();

const toggle = document.querySelector<HTMLButtonElement>('.nav__toggle');
const dialog = document.querySelector<HTMLDialogElement>('.nav__dialog');

if (toggle && dialog && typeof dialog.showModal === 'function') {
  const doc = document.documentElement;

  const open = (): void => {
    // Reserve the scrollbar's width before hiding it, or the whole page
    // shifts sideways as the overlay appears. On touch there is no classic
    // scrollbar, so this resolves to 0 and nothing moves.
    const gap = window.innerWidth - doc.clientWidth;
    doc.style.setProperty('--scrollbar-gap', `${gap}px`);
    doc.classList.add('nav-open');

    dialog.showModal();
    toggle.setAttribute('aria-expanded', 'true');

    // showModal focuses the dialog itself; put the caret on the first link
    // so a keyboard user's next Tab moves down the menu, not out of it.
    dialog.querySelector<HTMLAnchorElement>('.nav__menu-link')?.focus();
  };

  // Idempotent, because it can be reached from more than one direction.
  const teardown = (): void => {
    doc.classList.remove('nav-open');
    doc.style.removeProperty('--scrollbar-gap');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  };

  const close = (): void => {
    if (!dialog.open) return;
    dialog.close();
    // Done here rather than in a 'close' listener. The dialog close event is
    // not dependable: engines exist that close the dialog correctly and never
    // dispatch it, which strands aria-expanded, the scroll lock and the focus
    // return. Verified in this browser: showModal() then close() left
    // open === false with zero close events.
    teardown();
  };

  // Safety net for a close the user agent starts on its own, such as its
  // built-in Escape handling, where our close() is never called.
  dialog.addEventListener('close', teardown);
  dialog.addEventListener('cancel', teardown);

  toggle.addEventListener('click', () => (dialog.open ? close() : open()));
  dialog.querySelector('.nav__close')?.addEventListener('click', close);

  // Escape. A modal <dialog> is supposed to cancel on Escape by itself, but
  // that is a user-agent default action rather than something the DOM
  // guarantees, and it is observably absent in some engines and automation
  // contexts. Closing it ourselves makes the behaviour deterministic
  // everywhere; close() is idempotent, so it is harmless when the UA does
  // fire its own cancel as well.
  // Bound on the document rather than the dialog, because the key event's
  // target depends on where focus sits, and we want the same outcome however
  // the press arrives.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dialog.open) {
      e.preventDefault();
      close();
    }
  });

  // A press on the backdrop lands on the dialog element itself, because the
  // panel inside it covers the rest of the box.
  dialog.addEventListener('pointerdown', (e) => {
    if (e.target === dialog) close();
  });

  // Following a link inside the menu should not leave the overlay open
  // behind the new page, and same-page anchors would otherwise do exactly that.
  dialog.querySelectorAll('a[href]').forEach((link) => {
    link.addEventListener('click', close);
  });

  // If the viewport grows into the desktop layout while the menu is open,
  // the trigger is no longer on screen, so the overlay must not outlive it.
  const desktop = window.matchMedia('(min-width: 1025px)');
  desktop.addEventListener('change', (e) => {
    if (e.matches) close();
  });
}

/* Marks this file as a module. It is loaded as one, but without an import
   or an export TypeScript treats it as a global script, and the three
   modules the nav loads then share a single scope: two of them declaring
   a function called apply is enough to fail the build. */
export {};
