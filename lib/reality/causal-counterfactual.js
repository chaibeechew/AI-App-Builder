import { REALITY_TRUTH_LEVELS } from './reality-intelligence-contract.js';

const freeze=value=>Object.freeze(value);
const clean=(value,max=160)=>String(value??'').trim().slice(0,max);
const idPattern=/^[A-Za-z0-9._:-]{1,160}$/;
const clamp=value=>{const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;};
const list=value=>Array.isArray(value)?value:[];

function normalizeNode(node={}){
  const id=clean(node.id);if(!idPattern.test(id))throw new Error('REALITY_CAUSAL_NODE_ID_INVALID');
  return freeze({id,label:clean(node.label||id,200)||id,kind:clean(node.kind||'variable',60)||'variable',observed:node.observed===true});
}
function normalizeEdge(edge={}){
  const from=clean(edge.from),to=clean(edge.to);if(!idPattern.test(from)||!idPattern.test(to)||from===to)throw new Error('REALITY_CAUSAL_EDGE_INVALID');
  return freeze({
    from,to,
    mechanism:clean(edge.mechanism||'unspecified',300)||'unspecified',
    evidenceId:clean(edge.evidenceId,160)||null,
    confidence:clamp(edge.confidence),
  });
}
function assertAcyclic(nodes,edges){
  const graph=new Map(nodes.map(node=>[node.id,[]]));for(const edge of edges)graph.get(edge.from).push(edge.to);
  const visiting=new Set(),visited=new Set();
  function walk(id){if(visiting.has(id))throw new Error('REALITY_CAUSAL_GRAPH_CYCLE');if(visited.has(id))return;visiting.add(id);for(const next of graph.get(id)||[])walk(next);visiting.delete(id);visited.add(id);}
  for(const node of nodes)walk(node.id);
}

export function createCausalModel({modelId,nodes=[],edges=[],source='explicit-user-or-system-model'}={}){
  const id=clean(modelId);if(!idPattern.test(id))throw new Error('REALITY_CAUSAL_MODEL_ID_INVALID');
  const normalizedNodes=list(nodes).map(normalizeNode);const ids=new Set(normalizedNodes.map(row=>row.id));if(ids.size!==normalizedNodes.length)throw new Error('REALITY_CAUSAL_NODE_DUPLICATE');
  const normalizedEdges=list(edges).map(normalizeEdge);for(const edge of normalizedEdges){if(!ids.has(edge.from)||!ids.has(edge.to))throw new Error('REALITY_CAUSAL_EDGE_NODE_MISSING');}
  assertAcyclic(normalizedNodes,normalizedEdges);
  const evidenceCoverage=normalizedEdges.length?normalizedEdges.filter(edge=>edge.evidenceId&&edge.confidence>0).length/normalizedEdges.length:0;
  return freeze({
    schemaVersion:1,modelId:id,nodes:freeze(normalizedNodes),edges:freeze(normalizedEdges),
    evidenceCoverage:Number(evidenceCoverage.toFixed(4)),source:clean(source,200),truth:REALITY_TRUTH_LEVELS.SIMULATION_ONLY,
    statement:'Edges represent explicit modeled assumptions or supplied evidence. This object does not establish real-world causal truth.',
  });
}

export function buildCounterfactualPlan({model,scenarioId,interventions={},outcomes=[],assumptions=[]}={}){
  if(!model?.modelId||!Array.isArray(model.nodes))throw new Error('REALITY_CAUSAL_MODEL_INVALID');
  const id=clean(scenarioId);if(!idPattern.test(id))throw new Error('REALITY_COUNTERFACTUAL_SCENARIO_ID_INVALID');
  const nodeIds=new Set(model.nodes.map(node=>node.id));const normalizedInterventions={};
  for(const [key,value] of Object.entries(interventions&&typeof interventions==='object'&&!Array.isArray(interventions)?interventions:{})){
    if(!nodeIds.has(key))throw new Error('REALITY_COUNTERFACTUAL_INTERVENTION_NODE_UNKNOWN');normalizedInterventions[key]=value;
  }
  const normalizedOutcomes=list(outcomes).map(value=>clean(value)).filter(Boolean);for(const outcome of normalizedOutcomes){if(!nodeIds.has(outcome))throw new Error('REALITY_COUNTERFACTUAL_OUTCOME_NODE_UNKNOWN');}
  if(!Object.keys(normalizedInterventions).length||!normalizedOutcomes.length)throw new Error('REALITY_COUNTERFACTUAL_INPUT_REQUIRED');
  const affected=new Set(Object.keys(normalizedInterventions));let changed=true;
  while(changed){changed=false;for(const edge of model.edges){if(affected.has(edge.from)&&!affected.has(edge.to)){affected.add(edge.to);changed=true;}}}
  const relevantEdges=model.edges.filter(edge=>affected.has(edge.from)&&affected.has(edge.to));
  const confidence=relevantEdges.length?relevantEdges.reduce((sum,row)=>sum+row.confidence,0)/relevantEdges.length:0;
  return freeze({
    schemaVersion:1,scenarioId:id,modelId:model.modelId,
    interventions:freeze({...normalizedInterventions}),outcomes:freeze(normalizedOutcomes),
    affectedNodes:freeze([...affected]),assumptions:freeze(list(assumptions).map(value=>clean(value,300)).filter(Boolean).slice(0,50)),
    evidenceCoverage:model.evidenceCoverage,modeledConfidence:Number(confidence.toFixed(4)),
    truth:REALITY_TRUTH_LEVELS.SIMULATION_ONLY,
    canClaimPrediction:false,
    statement:'This is a counterfactual simulation plan derived from an explicit causal graph. Results must be labeled simulated unless separately validated against real-world evidence.',
  });
}
