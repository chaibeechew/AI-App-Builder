import { getCreativeMediaTask } from './creative-media-control-plane.js';

const freeze=value=>Object.freeze(value);
const clean=value=>String(value||'').trim();
const clamp=value=>{const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):0;};
const list=value=>Array.isArray(value)?value:[];

export const CREATIVE_MEDIA_PROVIDER_PRIORITY=freeze([
  'connected-free-quota','user-owned-provider','free-provider','low-cost-provider','premium-provider-explicit-only'
]);

function normalizeCostClass(value){
  const raw=clean(value||'metered').toLowerCase();
  return ['zero','free','low','metered','premium'].includes(raw)?raw:'metered';
}
function supports(provider,capability){
  const set=new Set(list(provider?.capabilities).map(v=>clean(v).toLowerCase()).filter(Boolean));
  return set.has(clean(capability).toLowerCase());
}
function costAllowed(provider,{costMode='zero',premiumAllowed=false}={}){
  const freeQuota=Number(provider?.freeQuotaRemaining||0)>0;
  if(freeQuota)return true;
  const cost=normalizeCostClass(provider?.costClass);
  const mode=clean(costMode||'zero').toLowerCase();
  if(mode==='zero'||mode==='free')return cost==='zero'||cost==='free';
  if(cost==='premium')return premiumAllowed===true;
  return true;
}
function priorityTier(provider,{premiumAllowed=false}={}){
  if(Number(provider?.freeQuotaRemaining||0)>0)return 0;
  if(provider?.userOwned===true)return 1;
  const cost=normalizeCostClass(provider?.costClass);
  if(cost==='zero'||cost==='free')return 2;
  if(cost==='low'||cost==='metered')return 3;
  if(cost==='premium'&&premiumAllowed===true)return 4;
  return 9;
}
function latencyScore(value){const n=Number(value);if(!Number.isFinite(n)||n<=0)return 50;return Math.max(0,Math.min(100,100-(n/60)));}

export function normalizeCreativeMediaProvider(provider={}){
  const verifiedOutputs=Math.max(0,Number(provider?.verifiedOutputCount)||0);
  return freeze({
    id:clean(provider.id||provider.name).slice(0,100),
    label:clean(provider.label||provider.name||provider.id).slice(0,120),
    connected:provider.connected===true,
    available:provider.available!==false,
    safetyReady:provider.safetyReady===true,
    userOwned:provider.userOwned===true,
    costClass:normalizeCostClass(provider.costClass),
    freeQuotaRemaining:Math.max(0,Number(provider.freeQuotaRemaining)||0),
    capabilities:freeze(list(provider.capabilities).map(v=>clean(v).toLowerCase()).filter(Boolean).slice(0,100)),
    qualityScore:clamp(provider.qualityScore),
    latencyMs:Math.max(0,Number(provider.latencyMs)||0),
    verifiedOutputCount:verifiedOutputs,
    liveProviderVerified:verifiedOutputs>0,
    productionEvidenceId:clean(provider.productionEvidenceId).slice(0,160)||null,
  });
}

export function rankCreativeMediaProviders({task,providers=[],costMode='zero',premiumAllowed=false}={}){
  const spec=getCreativeMediaTask(task);
  if(!spec)return freeze({task:clean(task).toLowerCase(),capability:null,eligible:freeze([]),rejected:freeze([]),selected:null,rule:'Unsupported media task.'});
  const normalized=list(providers).map(normalizeCreativeMediaProvider).filter(p=>p.id);
  const rejected=[];const eligible=[];
  for(const provider of normalized){
    let reason='';
    if(!provider.connected)reason='not-connected';
    else if(!provider.available)reason='unavailable';
    else if(!provider.safetyReady)reason='safety-not-ready';
    else if(!supports(provider,spec.capability))reason='capability-missing';
    else if(!costAllowed(provider,{costMode,premiumAllowed}))reason='cost-policy-blocked';
    if(reason){rejected.push({...provider,rejectedReason:reason});continue;}
    const tier=priorityTier(provider,{premiumAllowed});
    const score=Number((1000-(tier*120)+(provider.qualityScore*.8)+(latencyScore(provider.latencyMs)*.25)+(provider.liveProviderVerified?25:0)).toFixed(2));
    eligible.push({...provider,priorityTier:tier,rankingScore:score});
  }
  eligible.sort((a,b)=>a.priorityTier-b.priorityTier||b.rankingScore-a.rankingScore||a.latencyMs-b.latencyMs||a.id.localeCompare(b.id));
  const selected=eligible[0]||null;
  return freeze({
    task:clean(task).toLowerCase(),capability:spec.capability,
    eligible:freeze(eligible.map(row=>freeze(row))),rejected:freeze(rejected.map(row=>freeze(row))),selected:selected?freeze(selected):null,
    rule:'Selection order: connected free quota → user-owned provider → free provider → low-cost provider → premium only with explicit permission. A configured provider is not LIVE VERIFIED until verifiedOutputCount > 0.'
  });
}

export function buildCreativeMediaProviderTruth(provider={}){
  const p=normalizeCreativeMediaProvider(provider);
  if(!p.connected)return freeze({state:'PROVIDER_READY',live:false,reason:'provider-not-connected'});
  if(!p.available)return freeze({state:'PROVIDER_CONNECTED',live:false,reason:'provider-unavailable'});
  if(p.verifiedOutputCount<1)return freeze({state:'PROVIDER_CONNECTED',live:false,reason:'real-output-evidence-required'});
  return freeze({state:'LIVE_PROVIDER_VERIFIED',live:true,reason:'verified-real-output-present',productionEvidenceId:p.productionEvidenceId});
}
