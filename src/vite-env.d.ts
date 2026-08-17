/// <reference types="vite/client" />

/** Measurement settings inlined at build time by vite.config.ts.
    `null` when ANALYTICS.enabled is false, which lets the bundler
    remove the consent and analytics code and the IDs completely. */
declare const __XZ_MEASURE__: {
  clarityId: string;
  privacyPath: string;
  cookiePath: string;
  scrollRoutes: string[];
} | null;
