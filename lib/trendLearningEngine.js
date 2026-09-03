import { TRENDING_APP_REFERENCE_PATTERNS } from './trendingAppReferences.js';
import { TREND_SIGNAL_SNAPSHOT } from './trendSignalSnapshot.js';

const DAY=86_400_000;
const MAX_FRESH_DAYS=14;
const MAX_RECENT_DAYS=30;

function normalize(value){return String(value||'').toLowerCase().slice(0,12000)}
function clamp(value,min=0,max=1){return Math.max(min,Math.min(max,Number(value)||0))}
function ageDays(observedAt,now){const then=Date.parse(observedAt);const current=Date.parse(now||new Date().toISOString());return Number.isFinite(then)&&Number.isFinite(current)?Math.max(0,(current-then)/DAY):Infinity}
function freshnessWeight(days){if(!Number.isFinite(days))return 0;if(days<=MAX_FRESH_DAYS)return 1;if(days<=MAX_RECENT_DAYS)return clamp(1-(days-MAX_FRESH_DAYS)/(MAX_RECENT_DAYS-MAX_FRESH_DAYS));return 0}
function intentScore(text,ref){return ref.signals.reduce((n,signal)=>n+(text.includes(signal)?Math.max(1,signal.length/4):0),0)}
function rankWeight(rank,chartSize=100){const r=Math.max(1,Number(rank)||chartSize), size=Math.max(2,Number(chartSize)||100);return clamp(1-(r-1)/(size-1))}

export function getTrendLearningStatus({snapshot=TREND_SIGNAL_SNAPSHOT,now}={}){
  const days=ageDays(snapshot?.observedAt,now), freshness=days<=MAX_FRESH_DAYS?'live':days<=MAX_RECENT_DAYS?'recent':'stale';
  const uniquePatterns=new Set((snapshot?.signals||[]).map(signal=>signal.patternId));
  return {
    schemaVersion:snapshot?.schemaVersion||0,
    region:snapshot?.region||null,
    observedAt:snapshot?.observedAt||null,
    sourceKind:snapshot?.sourceKind||null,
    freshness,
    ageDays:Number.isFinite(days)?Number(days.toFixed(2)):null,
    freshnessWeight:Number(freshnessWeight(days).toFixed(3)),
    evidenceSignals:(snapshot?.signals||[]).length,
    evidencePatterns:uniquePatterns.size,
    vocabularySize:TRENDING_APP_REFERENCE_PATTERNS.length,
    boundedVocabulary:TRENDING_APP_REFERENCE_PATTERNS.length===100,
    staleSafeFallback:true,
  };
}

export function scoreTrendPatterns(input,{snapshot=TREND_SIGNAL_SNAPSHOT,now}={}){
  const text=normalize(input), status=getTrendLearningStatus({snapshot,now}), evidence=new Map();
  for(const signal of snapshot?.signals||[]){
    const current=evidence.get(signal.patternId)||{bestRankWeight:0,mentions:0,charts:new Set()};
    current.bestRankWeight=Math.max(current.bestRankWeight,rankWeight(signal.rank,snapshot.chartSize));
    current.mentions+=1;
    current.charts.add(signal.chart||'all');
    evidence.set(signal.patternId,current);
  }
  return TRENDING_APP_REFERENCE_PATTERNS.map((ref,index)=>{
    const ev=evidence.get(ref.id), relevance=intentScore(text,ref), trend=ev?clamp((ev.bestRankWeight*0.85)+Math.min(0.15,(ev.mentions-1)*0.03))*status.freshnessWeight:0;
    return {
      ref,
      index,
      relevance,
      trend:Number(trend.toFixed(4)),
      evidenceCount:ev?.mentions||0,
      chartCount:ev?.charts.size||0,
      score:(relevance*100)+(trend*10)+(1-index/1000),
    };
  }).sort((a,b)=>b.score-a.score||a.index-b.index);
}

export function selectAdaptiveTrendingReferences(input,{limit=5,snapshot=TREND_SIGNAL_SNAPSHOT,now}={}){
  const bounded=Math.max(1,Math.min(Number(limit)||5,8));
  return scoreTrendPatterns(input,{snapshot,now}).slice(0,bounded).map(item=>({
    ...item.ref,
    trendScore:item.trend,
    evidenceCount:item.evidenceCount,
    chartCount:item.chartCount,
  }));
}

export function buildAdaptiveTrendingReferenceContext(input,{snapshot=TREND_SIGNAL_SNAPSHOT,now}={}){
  const refs=selectAdaptiveTrendingReferences(input,{limit:5,snapshot,now}), status=getTrendLearningStatus({snapshot,now});
  const lines=[
    'LANERIQ AI Continuous Trend Learning Layer:',
    `Trend evidence: ${status.freshness} · region ${status.region||'global'} · observed ${status.observedAt||'unknown'} · ${status.evidencePatterns} pattern families evidenced.`,
    ...refs.map(ref=>`- ${ref.family}: ${ref.patterns.join(', ')}${ref.trendScore>0?` [trend ${ref.trendScore.toFixed(2)}]`:''}`),
    'Use trend weights only to prioritize abstract product/interaction patterns. Never reproduce third-party branding, exact layouts, copy, assets, source code or distinctive trade dress.',
  ];
  if(status.freshness==='stale')lines.push('Trend evidence is stale: ignore trend boost and fall back to intent relevance + the bounded LANERIQ pattern vocabulary.');
  return lines.join('\n');
}
