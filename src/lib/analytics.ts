/* ============================================================
   XStudioz — Event tracking

   Five approved events: email_click, fiverr_click, portfolio_click,
   faq_engagement, scroll_depth.

   Two rules applied throughout:

   1. No personal data in parameters. Note that email_click deliberately
      does NOT send link_url. A mailto href contains an email address,
      and the instruction was not to put email addresses into event
      parameters, so it sends the link text and the page instead.

   2. No event fires without consent. gtag is safe to call regardless,
      because Consent Mode holds it in a cookieless state until granted,
      but we gate anyway so that a denied visitor generates no network
      chatter at all.
   ============================================================ */

import { hasConsent } from './consent';

const MEASURE = __XZ_MEASURE__;

type Params = Record<string, string | number | boolean>;

function send(name: string, params: Params = {}): void {
  if (!MEASURE || !hasConsent()) return;
  window.gtag?.('event', name, {
    page_path: window.location.pathname,
    page_location: window.location.href,
    ...params,
  });
}

/* ------------------------------------------------------------
   Link events
   ------------------------------------------------------------ */

function linkText(a: HTMLAnchorElement): string {
  return (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100);
}

function initLinkEvents(): void {
  document.addEventListener(
    'click',
    (ev) => {
      const a = (ev.target as HTMLElement | null)?.closest?.('a');
      if (!a) return;

      const href = a.getAttribute('href') || '';

      if (href.startsWith('mailto:')) {
        // link_url withheld on purpose: it carries an email address.
        send('email_click', { link_text: linkText(a) });
        return;
      }
      if (href.includes('fiverr.com/x_studioz')) {
        send('fiverr_click', { link_text: linkText(a), link_url: href });
        return;
      }
      if (href.includes('portfolio.xstudioz.com')) {
        send('portfolio_click', { link_text: linkText(a), link_url: href });
      }
    },
    // Capture, so the event is recorded even where another handler
    // stops propagation before the click reaches the document.
    true
  );
}

/* ------------------------------------------------------------
   FAQ engagement

   Fires once per question, the first time a question actually enters
   view and stays there. The answers are always visible on this site,
   so there is no open/close to hook. Firing on every scroll past would
   be noise, hence the single-shot observer and the held threshold.
   ------------------------------------------------------------ */

function initFaqEngagement(): void {
  const items = document.querySelectorAll<HTMLElement>('.faq__item, .qa__item');
  if (!items.length || !('IntersectionObserver' in window)) return;

  const seen = new WeakSet<HTMLElement>();
  const timers = new WeakMap<HTMLElement, number>();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target as HTMLElement;

        if (!entry.isIntersecting) {
          const t = timers.get(el);
          if (t) {
            clearTimeout(t);
            timers.delete(el);
          }
          return;
        }
        if (seen.has(el)) return;

        // Held in view for a moment, so a fast scroll past does not count.
        timers.set(
          el,
          window.setTimeout(() => {
            seen.add(el);
            observer.unobserve(el);
            const q = el.querySelector('.faq__q, .qa__q');
            send('faq_engagement', {
              question: (q?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
            });
          }, 1500)
        );
      });
    },
    { threshold: 0.6 }
  );

  items.forEach((el) => observer.observe(el));
}

/* ------------------------------------------------------------
   Scroll depth

   Service pages only, and each threshold fires at most once.

   Note for the GA4 property: Enhanced Measurement's built-in "Scrolls"
   fires a `scroll` event at 90% only. That is a different event name
   from this one so there is no collision, but 90% would be recorded
   twice under two names. Turn Scrolls off in Enhanced Measurement if
   you want a single source.
   ------------------------------------------------------------ */

function initScrollDepth(): void {
  if (!MEASURE) return;
  if (!MEASURE.scrollRoutes.includes(window.location.pathname)) return;

  const thresholds = [25, 50, 75, 90];
  const fired = new Set<number>();
  let ticking = false;

  const measure = () => {
    ticking = false;
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    if (scrollable <= 0) return;

    const pct = (window.scrollY / scrollable) * 100;

    for (const t of thresholds) {
      if (pct >= t && !fired.has(t)) {
        fired.add(t);
        send('scroll_depth', { percent: t });
      }
    }
    if (fired.size === thresholds.length) {
      window.removeEventListener('scroll', onScroll);
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(measure);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  measure();
}

/* ------------------------------------------------------------ */

export function initAnalytics(): void {
  if (!MEASURE) return;
  initLinkEvents();
  initFaqEngagement();
  initScrollDepth();
}
