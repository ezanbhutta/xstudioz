/* ============================================================
   XStudioz — Interior document entry
   The cover (main.ts) owns the loader, the hero and the running
   folio. Every other page boots only the shared chrome, so the
   interior bundle stays small and the content paints immediately.
   ============================================================ */

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/doc.css';

import {
  initLenis,
  initNav,
  initCommonReveals,
  revealFailsafe,
  applyStaticScroll,
  ScrollTrigger,
} from './lib/motion';
import { initConsent } from './lib/consent';
import { initAnalytics } from './lib/analytics';

function boot(): void {
  // Consent first, so nothing measures before a choice exists.
  initConsent();
  initAnalytics();

  const lenis = initLenis();
  initNav(lenis);
  initCommonReveals();
  revealFailsafe();
  markCurrentSection();

  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  applyStaticScroll();
}

/* The section index highlights whichever section is in view.
   Purely decorative: the links work regardless. */
function markCurrentSection(): void {
  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('.doc__index a[href^="#"]')
  );
  if (!links.length) return;

  const byId = new Map(links.map((a) => [a.getAttribute('href')!.slice(1), a]));
  const sections = Array.from(byId.keys())
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => Boolean(el));
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.remove('is-current'));
        byId.get(entry.target.id)?.classList.add('is-current');
      });
    },
    { rootMargin: '-20% 0px -70% 0px' }
  );

  sections.forEach((s) => observer.observe(s));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
