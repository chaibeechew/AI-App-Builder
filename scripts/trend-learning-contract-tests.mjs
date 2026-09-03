import assert from 'node:assert/strict';
import { TRENDING_APP_REFERENCE_PATTERNS } from '../lib/trendingAppReferences.js';
import { TREND_SIGNAL_SNAPSHOT } from '../lib/trendSignalSnapshot.js';
import { TREND_FUSION_SNAPSHOT } from '../lib/trendFusionSnapshot.js';
import { TREND_SOURCE_REGISTRY,getTrendSourceRegistryStatus } from '../lib/trendSourceRegistry.js';
import { buildFusedEvidence,detectTrendTargetMarket,getTrendFusionStatus } from '../lib/trendFusionEngine.js';
import { buildAdaptiveTrendingReferenceContext,getTrendLearningStatus,selectAdaptiveTrendingReferences } from '../lib/trendLearningEngine.js';

assert.equal(TRENDING_APP_REFERENCE_PATTERNS.length,100,'Pattern vocabulary must remain exactly 100.');
assert.equal(new Set(TRENDING_APP_REFERENCE_PATTERNS.map(x=>x.id)).size,100,'Pattern IDs must be unique.');
assert.ok(TREND_SIGNAL_SNAPSHOT.signals.length>=20,'Primary MY snapshot needs meaningful evidence coverage.');
assert.equal(TREND_FUSION_SNAPSHOT.markets.length,3,'Fusion snapshot must ship MY + SEA peer + global sample.');
assert.deepEqual(TREND_FUSION_SNAPSHOT.markets.map(item=>item.market),['MY','ID','US']);
for(const market of TREND_FUSION_SNAPSHOT.markets){
  assert.ok(market.signals.length>=10,`${market.market} needs meaningful anonymous evidence coverage.`);
  assert.ok(market.signals.every(x=>TRENDING_APP_REFERENCE_PATTERNS.some(ref=>ref.id===x.patternId)),`${market.market} has an unknown pattern ID.`);
  assert.ok(market.signals.every(x=>Number.isInteger(x.rank)&&x.rank>=1&&x.rank<=market.chartSize),`${market.market} rank is outside its chart.`);
}

const sourceStatus=getTrendSourceRegistryStatus();
assert.equal(TREND_SOURCE_REGISTRY.length,3);
assert.equal(sourceStatus.live,1,'Only verified live source families may influence scoring.');
assert.equal(sourceStatus.providerReady,2,'Google Play and AI/product adapters remain provider-ready until evidence is connected.');
assert.ok(TREND_SOURCE_REGISTRY.filter(source=>source.state!=='live').every(source=>source.scoreEligible===false),'Provider-ready sources must carry zero LIVE scoring eligibility.');

assert.equal(detectTrendTargetMarket('Build a Malaysian property app'),'MY');
assert.equal(detectTrendTargetMarket('Create an Indonesia wallet for Jakarta'),'ID');
assert.equal(detectTrendTargetMarket('Launch this for American consumers'),'US');
assert.equal(detectTrendTargetMarket('A Singapore and ASEAN service app'),'SEA');
assert.equal(detectTrendTargetMarket('Worldwide global creator platform'),'GLOBAL');

const live=getTrendLearningStatus({now:'2026-09-04T00:00:00.000Z'});
assert.equal(live.mode,'multi-source-fusion');
assert.equal(live.freshness,'live');
assert.equal(live.region,'MY');
assert.equal(live.targetMarket,'MY');
assert.equal(live.boundedVocabulary,true);
assert.equal(live.staleSafeFallback,true);
assert.equal(live.activeMarketCount,3);
assert.ok(live.evidencePatterns>=20);
assert.equal(live.sourceRegistry.live,1);
assert.equal(live.sourceRegistry.providerReady,2);

const wallet=selectAdaptiveTrendingReferences('Build a Malaysian e-wallet with scan pay, transfers and transaction history',{now:'2026-09-04T00:00:00.000Z'});
assert.equal(wallet[0].id,'mobile-wallet');
assert.ok(wallet[0].trendScore>0);
assert.ok(wallet[0].marketCount>=2,'Wallet pattern should benefit from cross-market MY/SEA evidence.');

const usFantasy=selectAdaptiveTrendingReferences('Build an American fantasy sports app with live scoring',{now:'2026-09-04T00:00:00.000Z'});
assert.equal(usFantasy[0].id,'fantasy-sports');
assert.ok(usFantasy[0].evidenceMarkets.includes('US'));

const aiEvidence=buildFusedEvidence({input:'AI assistant',now:'2026-09-04T00:00:00.000Z'}).get('ai-assistant-chat');
assert.ok(aiEvidence?.trend>0);
assert.ok(aiEvidence?.marketCount>=3,'Cross-market AI evidence should be fused across MY, ID and US.');

const generic=selectAdaptiveTrendingReferences('Build a useful consumer app',{now:'2026-09-04T00:00:00.000Z'});
assert.ok(generic[0].trendScore>0,'Fresh fused evidence must influence generic discovery ordering.');
assert.ok(generic[0].marketCount>=1);

const seaStatus=getTrendFusionStatus({input:'Build for Singapore and ASEAN',now:'2026-09-04T00:00:00.000Z'});
assert.equal(seaStatus.targetMarket,'SEA');
assert.equal(seaStatus.activeMarketCount,3);

const stale=getTrendLearningStatus({now:'2026-11-15T00:00:00.000Z'});
assert.equal(stale.freshness,'stale');
assert.equal(stale.activeMarketCount,0);
const staleGeneric=selectAdaptiveTrendingReferences('Build a useful consumer app',{now:'2026-11-15T00:00:00.000Z'});
assert.equal(staleGeneric[0].id,'ai-assistant-chat','Stale evidence must fall back to bounded vocabulary order instead of pretending to be current.');
assert.equal(staleGeneric[0].trendScore,0);

const legacy=getTrendLearningStatus({snapshot:TREND_SIGNAL_SNAPSHOT,now:'2026-09-04T00:00:00.000Z'});
assert.equal(legacy.mode,'single-source-legacy');
assert.equal(legacy.region,'MY');

const context=buildAdaptiveTrendingReferenceContext('AI research assistant for Malaysia',{now:'2026-09-04T00:00:00.000Z'});
assert.match(context,/Continuous Trend Learning Layer/);
assert.match(context,/Multi-Source Trend Fusion Layer/);
assert.match(context,/region MY/);
assert.match(context,/active markets MY, ID, US/);
assert.match(context,/Provider-ready trend adapters without verified snapshots carry zero LIVE scoring weight/);
assert.match(context,/Never reproduce third-party branding/);
assert.doesNotMatch(context,/Pinduoduo|ShopeePay|MVShort|ChatGPT Your everyday|MapQuest|Vinted|CapCut/i,'Provider context must not leak observed third-party app identities.');

console.log('Multi-Source Trend Fusion contract passed: 100 bounded patterns, MY/SEA/global weighting, evidence-tiered providers, stale-safe fallback and originality guard are locked.');
