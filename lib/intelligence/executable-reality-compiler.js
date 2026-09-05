import { compileRealityIntent } from '../reality/reality-compiler.js';
import { UNIFIED_TRUTH_LEVELS } from './unified-intelligence-contract.js';

const freeze=value=>Object.freeze(value);
const clean=(value,max=240)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
const list=value=>Array.isArray(value)?value:[];

function node(id,type,dependsOn=[],config={}){return freeze({id,type,dependsOn:freeze([...dependsOn]),config:freeze({...config})});}

export function compileExecutableRealityPlan({intent,targets=['world'],constraints={},context,costMode='zero',premiumAllowed=false}={}){
  if(!context?.worldId||!context?.projectId)throw new Error('UNIFIED_EXECUTABLE_CONTEXT_REQUIRED');
  const semantic=compileRealityIntent({intent,targets,constraints,worldId:context.worldId,projectId:context.projectId});
  const mode=clean(costMode,20).toLowerCase()||'zero';const premiumEffective=premiumAllowed===true&&!['zero','free'].includes(mode);
  const blockers=[...semantic.blockers];if(premiumAllowed===true&&!premiumEffective)blockers.push('premium-escalation-blocked-by-zero-free-mode');
  const nodes=[];
  nodes.push(node('context','resolve-reality-context',[],{worldId:context.worldId,worldVersion:context.worldVersion,projectId:context.projectId}));
  nodes.push(node('world','load-world-state',['context'],{required:true,eventSourced:true}));
  const simulationNeeded=semantic.targets.some(target=>['simulation','world'].includes(target))||constraints?.simulateBeforeExecute===true;
  if(simulationNeeded)nodes.push(node('simulation','causal-counterfactual-simulation',['world'],{truth:'SIMULATION_ONLY',predictionClaimAllowed:false}));
  nodes.push(node('fabric','select-intelligence-fabric',[simulationNeeded?'simulation':'world'],{requiredCapabilities:semantic.requiredCapabilities}));
  nodes.push(node('cost','cost-admission',['fabric'],{costMode:mode,premiumRequested:premiumAllowed===true,premiumAllowed:premiumEffective,failClosed:true}));
  const executionIds=[];
  for(const target of semantic.targets){
    const id=`execute-${target}`;let type='target-execution';
    if(['image','video'].includes(target))type='creative-media-execution';else if(['app','web'].includes(target))type='app-builder-execution';else if(target==='simulation')type='simulation-result';else if(target==='agent')type='agent-execution';else if(target==='world')type='world-plan-execution';
    nodes.push(node(id,type,['cost'],{target,externalAdapterRequired:['image','video','agent'].includes(target),truth:['simulation','world'].includes(target)?'SIMULATION_ONLY':'EVIDENCE_REQUIRED'}));executionIds.push(id);
  }
  nodes.push(node('judge','quality-continuity-security-judge',executionIds,{providerSelfReportAccepted:false,observedEvidenceRequired:true}));
  nodes.push(node('repair','bounded-repair-and-fallback',['judge'],{failClosed:true,bounded:true}));
  nodes.push(node('evidence','append-evidence-ledger',['repair'],{signedObservedEvidenceRequired:true,appendOnly:true}));
  if(constraints?.actionable===true||constraints?.physicalAction===true)nodes.push(node('authority','action-authority',['evidence'],{explicitScopeRequired:true,humanApprovalIfIrreversible:true,securityCheckRequired:true}));
  nodes.push(node('world-update','append-world-event',[nodes.some(row=>row.id==='authority')?'authority':'evidence'],{acceptedObservedOutputOnly:true,expectedVersion:context.worldVersion}));
  const plan={schemaVersion:1,planId:clean(constraints?.planId||`unified:${context.worldId}:${context.worldVersion}`,160),semantic,context,cost:freeze({mode,premiumRequested:premiumAllowed===true,premiumAllowed:premiumEffective}),nodes:freeze(nodes),blockers:freeze([...new Set(blockers)]),executable:blockers.length===0,truth:blockers.length?UNIFIED_TRUTH_LEVELS.EVIDENCE_REQUIRED:UNIFIED_TRUTH_LEVELS.CODE_READY,adaptersRequired:freeze([...new Set(nodes.filter(row=>row.config.externalAdapterRequired).map(row=>row.type))]),statement:'Executable means the dependency DAG is structurally runnable when required adapters and evidence are supplied. It does not claim external providers, world models or real-world actions are already LIVE.'};
  return freeze(plan);
}

export function validateExecutableRealityPlan(plan){
  const rows=list(plan?.nodes);if(!rows.length)return freeze({ok:false,reason:'nodes-required'});const ids=new Set();for(const row of rows){if(!row?.id||ids.has(row.id))return freeze({ok:false,reason:'duplicate-or-missing-node-id'});ids.add(row.id);for(const dependency of row.dependsOn||[]){if(!ids.has(dependency))return freeze({ok:false,reason:'dependency-must-precede-node',nodeId:row.id,dependency});}}
  const final=rows[rows.length-1];if(final.id!=='world-update')return freeze({ok:false,reason:'world-update-must-be-final'});return freeze({ok:true,nodeCount:rows.length,finalNode:final.id,truth:UNIFIED_TRUTH_LEVELS.CODE_READY});
}
