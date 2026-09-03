import { TRENDING_APP_REFERENCE_PATTERNS } from './trendingAppReferences.js';
import { TREND_FUSION_SNAPSHOT } from './trendFusionSnapshot.js';
import { TREND_SOURCE_REGISTRY,getTrendSourceRegistryStatus } from './trendSourceRegistry.js';

const DAY=86_400_000;
const MAX_FRESH_DAYS=14;
const MAX_RECENT_DAYS=30;
const SEA_MARKETS=new Set(['MY','ID','SG','TH','PH','VN','BN','KH','LA','MM']);
const MARKET_HINTS=Object.freeze([
  ['MY',['malaysia','malaysian','kuala lumpur','sarawak','sabah','马来西亚','大马']],
  ['ID',['indonesia','indonesian','jakarta','印尼','印度尼西亚']],
  ['US',['united states','usa','u.s.','american','america','new york','美国']],
  ['SEA',['southeast asia','asean','singapore','thailand','philippines','vietnam','brunei','cambodia','laos','myanmar','东南亚','新加坡','泰国','菲律宾','越南']],
  ['GLOBAL',['global','worldwide','international','全球','国际市场']],
]);

function normalize(value){return String(value||'').toLowerCase().slice(0,12000)}
function clamp(value,min=0,max=1){return Math.max(min,Math.min(max,Number(value)||0))}
function ageDays(observedAt,now){const then=Date.parse(observedAt);const current=Date.parse(now||new Date().toISOString());return Number.isFinite(then)&&Number.isFinite(current)?Math.max(0,(current-then)/DAY):Infinity}
function freshnessWeight(days){if(!Number.isFinite(days))return 0;if(days<=MAX_FRESH_DAYS)return 1;if(days<=MAX_RECENT_DAYS)return clamp(1-(days-MAX_FRESH_DAYS)/(MAX_RECENT_DAYS-MAX_FRESH_DAYS));return 0}
function freshnessLabel(days){return days<=MAX_FRESH_DAYS?'live':days<=MAX_RECENT_DAYS?'recent':'stale'}
function rankWeight(rank,chartSize=100){const r=Math.max(1,Number(rank)||chartSize),size=Math.max(2,Number(chartSize)||100);return clamp(1-(r-1)/(size-1))}
function sourceScoreEligible(sourceId){const source=TREND_SOURCE_REGISTRY.find(item=>item.id===sourceId);return Boolean(source?.state==='live'&&source?.scoreEligible)}

export function detectTrendTargetMarket(input,{market,primaryMarket=TREND_FUSION_SNAPSHOT.primaryMarket||'MY'}={}){
  const explicit=String(market||'').trim().toUpperCase();
  if(explicit){
    if(explicit==='GLOBAL'||explicit==='WORLDWIDE')return 'GLOBAL';
    if(explicit==='SEA'||explicit==='ASEAN')return 'SEA';
    if(/^[A-Z]{2}$/.test(explicit))return explicit;
  }
  const text=normalize(input);
  for(const [candidate,hints] of MARKET_HINTS){if(hints.some(hint=>text.includes(hint)))return candidate;}
  return String(primaryMarket||'MY').toUpperCase();
}

export function marketAffinity(sourceMarket,targetMarket,sourceGroup){
  const source=String(sourceMarket||'').toUpperCase(),target=String(targetMarket||'').toUpperCase(),group=String(sourceGroup||'').toUpperCase();
  if(target==='GLOBAL')return group==='GLOBAL'?0.8:0.55;
  if(target==='SEA')return SEA_MARKETS.has(source)||group==='SEA'?0.9:0.3;
  if(source===target)return 1;
  if(SEA_MARKETS.has(source)&&SEA_MARKETS.has(target))return 0.55;
  if(group==='GLOBAL')return 0.3;
  return 0.15;
}

export function getFusionMarketStatus(snapshot,{now}={}){
  const days=ageDays(snapshot?.observedAt,now);
  return Object.freeze({
    market:snapshot?.market||null,
    marketGroup:snapshot?.marketGroup||null,
    observedAt:snapshot?.observedAt||null,
    sourceId:snapshot?.sourceId||null,
    sourceKind:snapshot?.sourceKind||null,
    freshness:freshnessLabel(days),
    ageDays:Number.isFinite(days)?Number(days.toFixed(2)):null,
    freshnessWeight:Number(freshnessWeight(days).toFixed(3)),
    evidenceSignals:(snapshot?.signals||[]).length,
    evidencePatterns:new Set((snapshot?.signals||[]).map(signal=>signal.patternId)).size,
    scoreEligible:sourceScoreEligible(snapshot?.sourceId),
  });
}

export function getTrendFusionStatus({input='',market,now,fusionSnapshot=TREND_FUSION_SNAPSHOT}={}){
  const targetMarket=detectTrendTargetMarket(input,{market,primaryMarket:fusionSnapshot?.primaryMarket});
  const marketStatuses=(fusionSnapshot?.markets||[]).map(snapshot=>getFusionMarketStatus(snapshot,{now}));
  const active=marketStatuses.filter(item=>item.scoreEligible&&item.freshnessWeight>0&&item.evidenceSignals>0);
  const patterns=new Set();
  let signals=0;
  for(const snapshot of fusionSnapshot?.markets||[]){
    const status=marketStatuses.find(item=>item.market===snapshot.market);
    if(!status?.scoreEligible||status.freshnessWeight<=0)continue;
    for(const signal of snapshot.signals||[]){patterns.add(signal.patternId);signals+=1;}
  }
  const sourceRegistry=getTrendSourceRegistryStatus();
  const targetActive=active
    .map(status=>({...status,affinity:marketAffinity(status.market,targetMarket,status.marketGroup)}))
    .sort((a,b)=>b.affinity-a.affinity||b.freshnessWeight-a.freshnessWeight);
  const primary=targetActive[0]||marketStatuses[0]||null;
  const overallFreshness=active.some(item=>item.freshness==='live')?'live':active.some(item=>item.freshness==='recent')?'recent':'stale';
  return Object.freeze({
    schemaVersion:fusionSnapshot?.schemaVersion||0,
    mode:'multi-source-fusion',
    region:targetMarket,
    targetMarket,
    primaryMarket:fusionSnapshot?.primaryMarket||null,
    observedAt:primary?.observedAt||null,
    sourceKind:'multi-source-fusion',
    freshness:overallFreshness,
    freshnessWeight:primary?.freshnessWeight||0,
    activeMarketCount:active.length,
    liveMarketCount:active.filter(item=>item.freshness==='live').length,
    recentMarketCount:active.filter(item=>item.freshness==='recent').length,
    staleMarketCount:marketStatuses.filter(item=>item.freshness==='stale').length,
    configuredMarkets:marketStatuses.map(item=>item.market),
    activeMarkets:active.map(item=>item.market),
    marketStatuses,
    evidenceSignals:signals,
    evidencePatterns:patterns.size,
    vocabularySize:TRENDING_APP_REFERENCE_PATTERNS.length,
    boundedVocabulary:TRENDING_APP_REFERENCE_PATTERNS.length===100,
    staleSafeFallback:true,
    sourceRegistry,
  });
}

export function buildFusedEvidence({input='',market,now,fusionSnapshot=TREND_FUSION_SNAPSHOT}={}){
  const targetMarket=detectTrendTargetMarket(input,{market,primaryMarket:fusionSnapshot?.primaryMarket});
  const evidence=new Map();
  for(const snapshot of fusionSnapshot?.markets||[]){
    const status=getFusionMarketStatus(snapshot,{now});
    if(!status.scoreEligible||status.freshnessWeight<=0)continue;
    const affinity=marketAffinity(snapshot.market,targetMarket,snapshot.marketGroup),trust=clamp(snapshot.trust??1);
    for(const signal of snapshot.signals||[]){
      const contribution=rankWeight(signal.rank,snapshot.chartSize)*status.freshnessWeight*affinity*trust;
      if(contribution<=0)continue;
      const current=evidence.get(signal.patternId)||{peak:0,sum:0,mentions:0,markets:new Set(),charts:new Set(),sources:new Set()};
      current.peak=Math.max(current.peak,contribution);
      current.sum+=contribution;
      current.mentions+=1;
      current.markets.add(snapshot.market);
      current.charts.add(`${snapshot.market}:${signal.chart||'all'}`);
      current.sources.add(snapshot.sourceId);
      evidence.set(signal.patternId,current);
    }
  }
  const output=new Map();
  for(const [patternId,item] of evidence){
    const crossMarketBoost=Math.min(0.10,Math.max(0,item.markets.size-1)*0.05);
    const breadth=Math.min(0.18,item.sum*0.08);
    const trend=clamp((item.peak*0.72)+breadth+crossMarketBoost);
    output.set(patternId,Object.freeze({
      trend:Number(trend.toFixed(4)),
      evidenceCount:item.mentions,
      marketCount:item.markets.size,
      chartCount:item.charts.size,
      sourceCount:item.sources.size,
      markets:[...item.markets],
    }));
  }
  return output;
}
