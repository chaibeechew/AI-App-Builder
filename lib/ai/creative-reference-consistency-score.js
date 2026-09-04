const METRICS=['identitySimilarity','productSimilarity','styleSimilarity','compositionSimilarity','poseSimilarity','spatialIoU','colorSimilarity','temporalConsistency'];
const DEFAULT_WEIGHTS={identitySimilarity:1.4,productSimilarity:1.4,styleSimilarity:1,compositionSimilarity:1,poseSimilarity:0.8,spatialIoU:1.2,colorSimilarity:0.6,temporalConsistency:1.4};
function scoreValue(value){const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=1?n:null;}

export function scoreCreativeReferenceConsistency(input={}){
  const modality=String(input.modality||'image').toLowerCase();
  if(!['image','video'].includes(modality)) return {ok:false,code:'CREATIVE_CONSISTENCY_MODALITY_INVALID'};
  const metrics=input.metrics&&typeof input.metrics==='object'?input.metrics:{};
  const required=Array.isArray(input.requiredMetrics)?input.requiredMetrics:modality==='video'?['styleSimilarity','compositionSimilarity','temporalConsistency']:['styleSimilarity','compositionSimilarity'];
  if(required.some(name=>!METRICS.includes(name))) return {ok:false,code:'CREATIVE_CONSISTENCY_REQUIRED_METRIC_INVALID'};
  for(const name of required){if(scoreValue(metrics[name])===null) return {ok:false,code:'CREATIVE_CONSISTENCY_METRIC_REQUIRED',missing:name};}
  let weighted=0,total=0;
  const normalized={};
  for(const name of METRICS){
    const value=scoreValue(metrics[name]);
    if(value===null) continue;
    const weight=Math.max(0,Number(input.weights?.[name] ?? DEFAULT_WEIGHTS[name]));
    normalized[name]=value;
    weighted+=value*weight;
    total+=weight;
  }
  if(total<=0) return {ok:false,code:'CREATIVE_CONSISTENCY_METRICS_EMPTY'};
  const score=Number(((weighted/total)*100).toFixed(2));
  const threshold=Math.min(100,Math.max(0,Number(input.threshold ?? 88)));
  const hardMinimum=Math.min(1,Math.max(0,Number(input.hardMinimum ?? 0.72)));
  const hardFailures=required.filter(name=>normalized[name]<hardMinimum);
  return {
    ok:true,
    schemaVersion:'creative-reference-consistency-score.v1',
    modality,
    score,
    threshold,
    pass:score>=threshold&&hardFailures.length===0,
    hardMinimum,
    hardFailures,
    metrics:normalized,
    measurementSourceRequired:true,
    liveQualityVerified:false,
    note:'Consumes measured similarity/consistency evidence; this code does not itself perform perceptual measurement or prove provider quality.',
    truth:'CODE_READY',
  };
}
