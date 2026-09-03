// LANERIQ AI trend source registry.
// Evidence states are intentionally strict: only LIVE sources may influence live trend scoring.

export const TREND_SOURCE_REGISTRY=Object.freeze([
  Object.freeze({
    id:'apple-app-store-rss',
    label:'Apple App Store official RSS',
    state:'live',
    evidence:'official-store-chart',
    costMode:'zero',
    auth:'none',
    scoreEligible:true,
  }),
  Object.freeze({
    id:'google-play-trend-adapter',
    label:'Google Play trend adapter',
    state:'provider-ready',
    evidence:'provider-ready',
    costMode:'zero',
    auth:'none',
    scoreEligible:false,
    note:'No verified first-party chart snapshot is connected yet; this source must not influence LIVE scoring.',
  }),
  Object.freeze({
    id:'ai-product-trend-adapter',
    label:'AI / product trend adapter',
    state:'provider-ready',
    evidence:'provider-ready',
    costMode:'zero',
    auth:'none',
    scoreEligible:false,
    note:'Requires a bounded evidence snapshot before it may influence generation.',
  }),
]);

export function getTrendSourceRegistryStatus(){
  const live=TREND_SOURCE_REGISTRY.filter(source=>source.state==='live'&&source.scoreEligible);
  const providerReady=TREND_SOURCE_REGISTRY.filter(source=>source.state==='provider-ready');
  return Object.freeze({
    total:TREND_SOURCE_REGISTRY.length,
    live:live.length,
    providerReady:providerReady.length,
    scoreEligible:live.length,
    sources:TREND_SOURCE_REGISTRY.map(({id,label,state,evidence,costMode,scoreEligible})=>({id,label,state,evidence,costMode,scoreEligible})),
  });
}
