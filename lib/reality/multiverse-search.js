import { REALITY_TRUTH_LEVELS } from './reality-intelligence-contract.js';

const freeze=value=>Object.freeze(value);
const clean=(value,max=200)=>String(value??'').trim().slice(0,max);
const clamp=value=>{const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):0;};
const list=value=>Array.isArray(value)?value:[];
const idPattern=/^[A-Za-z0-9._:-]{1,160}$/;

function normalizeScenario(row={}){
  const id=clean(row.id,160);if(!idPattern.test(id))throw new Error('REALITY_MULTIVERSE_SCENARIO_ID_INVALID');
  const metrics=row.metrics&&typeof row.metrics==='object'&&!Array.isArray(row.metrics)?row.metrics:{};
  const evidenceIds=list(row.evidenceIds).map(value=>clean(value,160)).filter(Boolean).slice(0,50);
  return freeze({id,label:clean(row.label||id,200)||id,metrics:freeze({...metrics}),evidenceIds:freeze(evidenceIds),simulated:row.simulated!==false});
}

export function rankSimulatedFutures({scenarios=[],objectives={},maxResults=3,requireEvidence=true}={}){
  const rows=list(scenarios).map(normalizeScenario);if(!rows.length)throw new Error('REALITY_MULTIVERSE_SCENARIOS_REQUIRED');
  if(rows.length>1000)throw new Error('REALITY_MULTIVERSE_SCENARIO_LIMIT');
  const weights=objectives&&typeof objectives==='object'&&!Array.isArray(objectives)?objectives:{};
  const objectiveEntries=Object.entries(weights).map(([key,value])=>[clean(key,100),Number(value)]).filter(([key,value])=>key&&Number.isFinite(value)&&value!==0);
  if(!objectiveEntries.length)throw new Error('REALITY_MULTIVERSE_OBJECTIVES_REQUIRED');
  const rejected=[];const eligible=[];
  for(const row of rows){
    if(requireEvidence&&row.evidenceIds.length===0){rejected.push({...row,rejectedReason:'evidence-required'});continue;}
    let weighted=0,totalWeight=0;
    for(const [metric,weight] of objectiveEntries){const score=clamp(row.metrics[metric]);weighted+=score*weight;totalWeight+=Math.abs(weight);}
    const score=totalWeight?weighted/totalWeight:0;
    eligible.push({...row,score:Number(score.toFixed(3))});
  }
  eligible.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  const limit=Math.max(1,Math.min(20,Number(maxResults)||3));
  return freeze({
    results:freeze(eligible.slice(0,limit).map((row,index)=>freeze({...row,rank:index+1}))),
    rejected:freeze(rejected.map(row=>freeze(row))),
    evaluated:rows.length,
    truth:REALITY_TRUTH_LEVELS.SIMULATION_ONLY,
    canClaimBestRealFuture:false,
    statement:'Ranking compares supplied simulated scenarios under explicit objective weights. It is not proof that the top-ranked scenario will occur or outperform in the real world.',
  });
}
