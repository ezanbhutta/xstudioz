/* ============================================================
   Scrollable tables

   A spec table wider than its column scrolls sideways. A mouse can drag it
   and a touch can swipe it, but a keyboard cannot reach it at all: the
   wrapper is a plain <div>, so it is not focusable and its hidden columns
   are unreachable without a pointer.

   The fix has to be applied here rather than in the markup, because four of
   the eleven tables live in pages another session owns. Doing it at runtime
   reaches all of them and edits none.

   Three rules govern this:
   - Only tables that actually overflow become focusable. A table that fits
     needs no scrolling, and making it a tab stop would be noise.
   - role="region" and the accessible name go on the WRAPPER. The <table>
     inside keeps its own semantics untouched, so row and column navigation
     still works.
   - The name comes from the nearest real heading, so a screen reader
     announces which table it has landed in rather than "region".
   ============================================================ */

function nameFor(wrap: HTMLElement, index: number): string {
  // Walk backwards through previous siblings, then up, looking for the
  // heading this table sits under.
  let node: Element | null = wrap;
  while (node) {
    let sib: Element | null = node.previousElementSibling;
    while (sib) {
      if (/^H[1-6]$/.test(sib.tagName) && sib.textContent?.trim()) {
        return `${sib.textContent.trim()}, table`;
      }
      sib = sib.previousElementSibling;
    }
    node = node.parentElement;
    if (node && node.tagName === 'BODY') break;
  }
  // A caption is the next best source, then a numbered fallback so the
  // region is never announced anonymously.
  const caption = wrap.querySelector('caption')?.textContent?.trim();
  return caption ? `${caption}, table` : `Table ${index + 1}`;
}

function apply(): void {
  const wraps = document.querySelectorAll<HTMLElement>('.spec-wrap');

  wraps.forEach((wrap, i) => {
    const overflows = wrap.scrollWidth > wrap.clientWidth + 1;

    if (!overflows) {
      // A table that fits is not a scroll region and must not be a tab stop.
      wrap.removeAttribute('tabindex');
      wrap.removeAttribute('role');
      wrap.removeAttribute('aria-label');
      wrap.classList.remove('spec-wrap--scrollable');
      return;
    }

    if (!wrap.hasAttribute('tabindex')) {
      wrap.setAttribute('tabindex', '0');
      wrap.setAttribute('role', 'region');
      wrap.setAttribute('aria-label', nameFor(wrap, i));
    }
    // Lets the stylesheet show the affordance only where it is true.
    wrap.classList.add('spec-wrap--scrollable');
  });
}

apply();

// Overflow depends on width, so this has to be re-evaluated whenever the
// layout changes: a table that fits at 1440 scrolls at 375, and the reverse.
// A ResizeObserver on the wrappers themselves catches every cause, including
// the column changing width without the window doing so, which a window
// resize listener would miss.
// The observer already batches its callbacks per frame, so there is no
// requestAnimationFrame in here. Deferring to a frame would only add a way
// for the work to be left pending in a document that is not scheduling any,
// and apply() cannot re-trigger the observer: it sets attributes and an
// outline-only class, none of which change a measured box.
if ('ResizeObserver' in window) {
  const observer = new ResizeObserver(apply);
  document.querySelectorAll<HTMLElement>('.spec-wrap').forEach((w) => observer.observe(w));
} else {
  addEventListener('resize', apply, { passive: true });
}

// Fonts land after first paint and change the measured width.
document.fonts?.ready.then(apply);
