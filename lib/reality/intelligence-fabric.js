import { REALITY_TRUTH_LEVELS } from './reality-intelligence-contract.js';

const freeze=value=>Object.freeze(value);
const clean=(value,max=160)=>String(value??'').trim().slice(0,max);
const list=value=>Array.isArray(value)?value:[];
const clamp=value=>{const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):0;};

function normalizeCost(value){const raw=clean(value,30).toLowerCase();return ['zero','free','low','metered','premium'].includes(raw)?raw:'metered';}
function costAllowed(node,{costMode='zero',premiumAllowed=false}={}){
  if(Number(node.freeQuotaRemaining||0)>0)return true;
  const cost=normalizeCost(node.costClass);const mode=clean(costMode,20).toLowerCase();
  if(mode==='zero')return cost==='zero';
  if(mode==='free')return cost==='zero'||cost==='free';
  if(cost==='premium')return premiumAllowed===true;
  return true;
}
function normalizeNode(node={}){
  const id=clean(node.id||node.name,160);if(!id)throw new Error('REALITY_FABRIC_NODE_ID_REQUIRED');
  return freeze({
    id,label:clean(node.label||node.name||id,200)||id,
    connected:node.connected===true,available:node.available!==false,safetyReady:node.safetyReady===true,
    userOwned:node.userOwned===true,costClass:normalizeCost(node.costClass),freeQuotaRemaining:Math.max(0,Number(node.freeQuotaRemaining)||0),
    capabilities:freeze(list(node.capabilities).map(value=>clean(value,100).toLowerCase()).filter(Boolean)),
    qualityScore:clamp(node.qualityScore),latencyMs:Math.max(0,Number(node.latencyMs)||0),verifiedOutputCount:Math.max(0,Number(node.verifiedOutputCount)||0),
  });
}
function tier(node){if(node.freeQuotaRemaining>0)return 0;if(node.userOwned)return 1;if(node.costClass==='zero')return 2;if(node.costClass==='free')return 3;if(['low','metered'].includes(node.costClass))return 4;if(node.costClass==='premium')return 5;return 9;}

export function selectIntelligenceFabric({requiredCapabilities=[],nodes=[],costMode='zero',premiumAllowed=false,maxNodes=4}={}){
  const required=[...new Set(list(requiredCapabilities).map(value=>clean(value,100).toLowerCase()).filter(Boolean))];if(!required.length)throw new Error('REALITY_FABRIC_CAPABILITIES_REQUIRED');
  const normalized=list(nodes).map(normalizeNode);const rejected=[];const candidates=[];
  for(const node of normalized){
    let reason='';if(!node.connected)reason='not-connected';else if(!node.available)reason='unavailable';else if(!node.safetyReady)reason='safety-not-ready';else if(!costAllowed(node,{costMode,premiumAllowed}))reason='cost-policy-blocked';
    if(reason){rejected.push({...node,rejectedReason:reason});continue;}
    const coverage=required.filter(cap=>node.capabilities.includes(cap));if(!coverage.length){rejected.push({...node,rejectedReason:'capability-missing'});continue;}
    const score=Number((coverage.length*100+(100-tier(node)*12)+(node.qualityScore*.5)+(node.verifiedOutputCount>0?20:0)-Math.min(50,node.latencyMs/100)).toFixed(3));
    candidates.push({...node,coverage,score,priorityTier:tier(node)});
  }
  candidates.sort((a,b)=>b.coverage.length-a.coverage.length||a.priorityTier-b.priorityTier||b.score-a.score||a.id.localeCompare(b.id));
  const selected=[];const uncovered=new Set(required);for(const node of candidates){if(selected.length>=Math.max(1,Math.min(8,Number(maxNodes)||4)))break;const adds=node.coverage.some(cap=>uncovered.has(cap));if(!adds)continue;selected.push(node);for(const cap of node.coverage)uncovered.delete(cap);if(!uncovered.size)break;}
  const complete=uncovered.size===0;
  return freeze({
    requiredCapabilities:freeze(required),selected:freeze(selected.map(row=>freeze(row))),rejected:freeze(rejected.map(row=>freeze(row))),
    uncoveredCapabilities:freeze([...uncovered]),complete,
    truth:complete?REALITY_TRUTH_LEVELS.CODE_READY:REALITY_TRUTH_LEVELS.EVIDENCE_REQUIRED,
    rule:'Fabric chooses the smallest safe capability-covering set under the active cost policy. Premium nodes require explicit permission and unverified nodes never become LIVE merely by configuration.',
  });
}
