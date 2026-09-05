import { UNIFIED_TRUTH_LEVELS } from './unified-intelligence-contract.js';

const freeze=value=>Object.freeze(value);
const clean=(value,max=240)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
const ID=/^[A-Za-z0-9._:-]{1,160}$/;
const clamp01=value=>{const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(1,n)):null;};
function safeId(value,code){const id=clean(value,160);if(!ID.test(id))throw new Error(code);return id;}
function freezeState(state){return freeze({...state,records:freeze(Object.fromEntries(Object.entries(state.records).map(([key,row])=>[key,freeze({...row,predictions:freeze({...row.predictions}),outcomes:freeze({...row.outcomes}),errors:freeze({...row.errors})})])))});}

export function createSimulationCalibrationState(){return freezeState({schemaVersion:1,records:{},truth:UNIFIED_TRUTH_LEVELS.SIMULATION_ONLY,simulationIsNotPrediction:true});}

export function registerSimulation(state,input={}){
  if(!state?.records)throw new Error('UNIFIED_CALIBRATION_STATE_INVALID');const simulationId=safeId(input.simulationId,'UNIFIED_CALIBRATION_SIMULATION_ID_INVALID');if(state.records[simulationId])throw new Error('UNIFIED_CALIBRATION_SIMULATION_REPLAY');
  const predictions={};for(const [metric,value] of Object.entries(input.predictions&&typeof input.predictions==='object'?input.predictions:{})){const n=clamp01(value);if(n!==null)predictions[clean(metric,100)]=n;}
  if(!Object.keys(predictions).length)throw new Error('UNIFIED_CALIBRATION_PREDICTIONS_REQUIRED');
  const record={simulationId,modelId:clean(input.modelId,160)||null,scenarioId:clean(input.scenarioId,160)||null,predictions,outcomes:{},errors:{},assumptionsCount:Array.isArray(input.assumptions)?Math.min(100,input.assumptions.length):0,evidenceIds:freeze((Array.isArray(input.evidenceIds)?input.evidenceIds:[]).map(value=>clean(value,160)).filter(Boolean).slice(0,64)),registeredAt:clean(input.registeredAt,40)||new Date().toISOString(),observedAt:null,calibrated:false,truth:UNIFIED_TRUTH_LEVELS.SIMULATION_ONLY,canClaimPrediction:false};
  return freezeState({...state,records:{...state.records,[simulationId]:record}});
}

export function recordObservedOutcome(state,input={}){
  if(!state?.records)throw new Error('UNIFIED_CALIBRATION_STATE_INVALID');const simulationId=safeId(input.simulationId,'UNIFIED_CALIBRATION_SIMULATION_ID_INVALID');const record=state.records[simulationId];if(!record)throw new Error('UNIFIED_CALIBRATION_SIMULATION_UNKNOWN');
  if(input.independentEvidence!==true||!safeId(input.evidenceId,'UNIFIED_CALIBRATION_EVIDENCE_ID_INVALID'))throw new Error('UNIFIED_CALIBRATION_INDEPENDENT_EVIDENCE_REQUIRED');
  const outcomes={};const errors={};for(const [metric,predicted] of Object.entries(record.predictions)){const actual=clamp01(input.outcomes?.[metric]);if(actual===null)continue;outcomes[metric]=actual;errors[metric]=Number(Math.abs(predicted-actual).toFixed(6));}
  if(!Object.keys(outcomes).length)throw new Error('UNIFIED_CALIBRATION_OUTCOMES_REQUIRED');
  const next={...record,outcomes,errors,observedAt:clean(input.observedAt,40)||new Date().toISOString(),outcomeEvidenceId:input.evidenceId,calibrated:true,truth:UNIFIED_TRUTH_LEVELS.OBSERVED_VERIFIED,canClaimPrediction:false};return freezeState({...state,records:{...state.records,[simulationId]:next}});
}

export function summarizeCalibration(state){
  const calibrated=Object.values(state?.records||{}).filter(row=>row.calibrated);const errors=calibrated.flatMap(row=>Object.values(row.errors||{})).map(Number).filter(Number.isFinite);const meanAbsoluteError=errors.length?Number((errors.reduce((sum,value)=>sum+value,0)/errors.length).toFixed(6)):null;
  return freeze({registered:Object.keys(state?.records||{}).length,calibrated:calibrated.length,meanAbsoluteError,truth:calibrated.length?UNIFIED_TRUTH_LEVELS.OBSERVED_VERIFIED:UNIFIED_TRUTH_LEVELS.SIMULATION_ONLY,canClaimFutureAccuracy:false,statement:'Calibration compares prior simulations with later independently evidenced outcomes. It improves measured reliability but never turns a simulation into guaranteed future prediction.'});
}
