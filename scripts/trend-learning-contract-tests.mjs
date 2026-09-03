import assert from 'node:assert/strict';
import { TRENDING_APP_REFERENCE_PATTERNS } from '../lib/trendingAppReferences.js';
import { TREND_SIGNAL_SNAPSHOT } from '../lib/trendSignalSnapshot.js';
import { buildAdaptiveTrendingReferenceContext,getTrendLearningStatus,selectAdaptiveTrendingReferences } from '../lib/trendLearningEngine.js';

assert.equal(TRENDING_APP_REFERENCE_PATTERNS.length,100,'Pattern vocabulary must remain exactly 100.');
assert.equal(new Set(TRENDING_APP_REFERENCE_PATTERNS.map(x=>x.id)).size,100,'Pattern IDs must be unique.');
assert.ok(TREND_SIGNAL_SNAPSHOT.signals.length>=20,'Trend snapshot needs meaningful evidence coverage.');
assert.ok(TREND_SIGNAL_SNAPSHOT.signals.every(x=>TRENDING_APP_REFERENCE_PATTERNS.some(ref=>ref.id===x.patternId)),'Every trend signal must map to the bounded LANERIQ vocabulary.');
assert.ok(TREND_SIGNAL_SNAPSHOT.signals.every(x=>Number.isInteger(x.rank)&&x.rank>=1&&x.rank<=TREND_SIGNAL_SNAPSHOT.chartSize),'Ranks must remain within the declared chart.');

const live=getTrendLearningStatus({now:'2026-09-04T00:00:00.000Z'});
assert.equal(live.freshness,'live');
assert.equal(live.region,'MY');
assert.equal(live.boundedVocabulary,true);
assert.equal(live.staleSafeFallback,true);
assert.ok(live.evidencePatterns>=15);

const wallet=selectAdaptiveTrendingReferences('Build a Malaysian e-wallet with scan pay, transfers and transaction history',{now:'2026-09-04T00:00:00.000Z'});
assert.equal(wallet[0].id,'mobile-wallet');
assert.ok(wallet[0].trendScore>0);

const generic=selectAdaptiveTrendingReferences('Build a useful consumer app',{now:'2026-09-04T00:00:00.000Z'});
assert.ok(generic[0].trendScore>0,'Fresh evidence must influence generic discovery ordering.');
assert.ok(
  TREND_SIGNAL_SNAPSHOT.signals.some(signal=>signal.patternId===generic[0].id&&signal.rank<=4),
  'Fresh generic discovery should prioritize a strongly evidenced top-chart pattern, including multi-chart evidence.',
);
assert.notEqual(generic[0].id,'ai-assistant-chat','Fresh trend evidence should be able to outrank the static vocabulary default.');

const stale=getTrendLearningStatus({now:'2026-11-15T00:00:00.000Z'});
assert.equal(stale.freshness,'stale');
assert.equal(stale.freshnessWeight,0);
const staleGeneric=selectAdaptiveTrendingReferences('Build a useful consumer app',{now:'2026-11-15T00:00:00.000Z'});
assert.equal(staleGeneric[0].id,'ai-assistant-chat','Stale evidence must fall back to bounded vocabulary order instead of pretending to be current.');

const context=buildAdaptiveTrendingReferenceContext('AI research assistant',{now:'2026-09-04T00:00:00.000Z'});
assert.match(context,/Continuous Trend Learning Layer/);
assert.match(context,/region MY/);
assert.match(context,/Never reproduce third-party branding/);
assert.doesNotMatch(context,/Pinduoduo|ShopeePay|MVShort|ChatGPT Your everyday/i,'Provider context must not leak observed third-party app identities.');

console.log('Continuous Trend Learning contract passed: exactly 100 bounded patterns, fresh multi-chart evidence weighting, stale-safe fallback and originality guard are locked.');
