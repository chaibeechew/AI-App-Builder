// Evidence metadata for LANERIQ AI Trending App Reference Layer.
// The runtime pattern vocabulary is intentionally brand-neutral. This file records how it should be refreshed.
export const TRENDING_REFERENCE_EVIDENCE = Object.freeze({
  capturedAt: '2026-09-03',
  market: 'Malaysia-first, global cross-check',
  sources: Object.freeze([
    {kind:'official-chart', provider:'Apple App Store', scope:'Malaysia iPhone Top Free Apps'},
    {kind:'official-store-surface', provider:'Google Play', scope:'Popular/current app discovery surface'},
  ]),
  observedFamilies: Object.freeze([
    'AI assistants','short drama/video','social/community','travel booking','maps/navigation','mobile wallet','commerce','food delivery','membership/loyalty','government utilities','creator editing','learning','streaming'
  ]),
  policy: Object.freeze({
    inspirationOnly:true,
    copyBrand:false,
    copyText:false,
    copyAssets:false,
    copySourceCode:false,
    copyDistinctiveTradeDress:false,
    refreshCadence:'evidence may be refreshed without shipping 100 heavyweight client templates',
  }),
});
