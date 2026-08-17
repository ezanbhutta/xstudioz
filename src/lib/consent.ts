/* ============================================================
   XStudioz — Consent

   The rule this file exists to keep: no non-essential cookie is
   written before the visitor has actively chosen. UK PECR wants
   consent first, not a banner that quietly assumes it.

   How each tool is handled, and why they differ:

   GA4      loads on every page with Consent Mode v2 defaulting to
            DENIED. In that state the tag runs but stores nothing,
            sending cookieless pings instead. On accept we flip the
            signal and it begins setting _ga.

   Clarity  is not loaded at all until accept. It drops five
            third-party Microsoft cookies on top of its own two, and
            MUID among them is documented by Microsoft as serving
            advertising. Consent-moding that is not enough; it stays
            off the page entirely until asked for.

   The only thing stored before consent is the record of the choice
   itself, in localStorage rather than a cookie. That is the one
   genuinely strictly-necessary item here, and it is not a cookie at
   all, so it never needs consent.
   ============================================================ */

const MEASURE = __XZ_MEASURE__;

const STORE_KEY = 'xz-consent';
type Choice = 'granted' | 'denied';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
  }
}

/* ------------------------------------------------------------
   Stored choice
   ------------------------------------------------------------ */

function readChoice(): Choice | null {
  try {
    const v = localStorage.getItem(STORE_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    // Private mode, or storage disabled. Treat as undecided and ask again.
    return null;
  }
}

function writeChoice(choice: Choice): void {
  try {
    localStorage.setItem(STORE_KEY, choice);
  } catch {
    // If we cannot remember the choice we still honour it for this page view.
  }
}

/* ------------------------------------------------------------
   Tools
   ------------------------------------------------------------ */

function grantGa4(): void {
  window.gtag?.('consent', 'update', {
    analytics_storage: 'granted',
  });
}

let clarityLoaded = false;

function loadClarity(): void {
  if (!MEASURE || clarityLoaded || !MEASURE.clarityId) return;
  clarityLoaded = true;

  // Microsoft's documented snippet, written out rather than eval'd so it
  // is readable and so a CSP could allow it by hash later.
  window.clarity =
    window.clarity ||
    function (...args: unknown[]) {
      (window.clarity!.q = window.clarity!.q || []).push(args);
    };

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.clarity.ms/tag/${MEASURE.clarityId}`;
  document.head.appendChild(s);
}

function applyGranted(): void {
  grantGa4();
  loadClarity();
}

/* ------------------------------------------------------------
   Banner

   Built in JS rather than shipped in every page's HTML so that a
   visitor who has already chosen never receives the markup at all.
   ------------------------------------------------------------ */

function buildBanner(
  cfg: NonNullable<typeof MEASURE>,
  onChoice: (c: Choice) => void
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'consent';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-labelledby', 'consent-title');
  el.setAttribute('aria-describedby', 'consent-body');

  el.innerHTML = `
    <div class="consent__inner">
      <div class="consent__copy">
        <p class="label consent__title" id="consent-title">Cookies</p>
        <p class="consent__body" id="consent-body">
          We would like to measure how this site is used, which means setting
          cookies. Nothing is set unless you agree. Read the
          <a href="${cfg.privacyPath}">privacy policy</a> and the
          <a href="${cfg.cookiePath}">cookie policy</a>.
        </p>
      </div>
      <div class="consent__actions">
        <button class="pill consent__btn" type="button" data-consent="denied">Decline</button>
        <button class="pill consent__btn" type="button" data-consent="granted">Accept</button>
      </div>
    </div>
  `;

  el.querySelectorAll<HTMLButtonElement>('[data-consent]').forEach((btn) => {
    btn.addEventListener('click', () => {
      onChoice(btn.dataset.consent === 'granted' ? 'granted' : 'denied');
    });
  });

  return el;
}

function showBanner(): void {
  if (!MEASURE) return;

  const banner = buildBanner(MEASURE, (choice) => {
    writeChoice(choice);
    if (choice === 'granted') applyGranted();
    banner.remove();
    document.dispatchEvent(new CustomEvent('xz:consent', { detail: choice }));
  });

  document.body.appendChild(banner);
  // Next frame so the entrance transition actually runs.
  requestAnimationFrame(() => banner.classList.add('consent--in'));
}

/* ------------------------------------------------------------
   Public
   ------------------------------------------------------------ */

export function hasConsent(): boolean {
  return readChoice() === 'granted';
}

/** Re-open the banner. Wired to a footer link so a choice can be changed. */
export function reopenConsent(): void {
  if (!MEASURE) return;
  if (document.querySelector('.consent')) return;
  showBanner();
}

export function initConsent(): void {
  if (!MEASURE) return;

  const choice = readChoice();

  if (choice === 'granted') {
    applyGranted();
    return;
  }
  if (choice === 'denied') {
    // Respect it silently. GA4 stays in its default denied state.
    return;
  }

  showBanner();
}
