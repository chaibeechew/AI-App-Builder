const METRICS=['trajectoryAdherence','temporalSmoothness','subjectIdentityStability','productGeometryStability','backgroundStability','loopBoundaryContinuity','motionIntentAdherence','occlusionConsistency'];
const DEFAULT_WEIGHTS={trajectoryAdherence:1.4,temporalSmoothness:1.2,subjectIdentityStability:1.4,productGeometryStability:1.4,backgroundStability:0.7,loopBoundaryContinuity:1,motionIntentAdherence:1.2,occlusionConsistency:0.8};
function metric(value){const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=1?n:null;}
export function scoreCreativeMotionConsistency(input={}){
  const values=input.metrics&&typeof input.metrics==='object'?input.metrics:{};
  const required=Array.isArray(input.requiredMetrics)&&input.requiredMetrics.length?input.requiredMetrics:['trajectoryAdherence','temporalSmoothness','motionIntentAdherence'];
  if(required.some(name=>!METRICS.includes(name))) return {ok:false,code:'CREATIVE_MOTION_SCORE_REQUIRED_METRIC_INVALID'};
  for(const name of required) if(metric(values[name])===null) return {ok:false,code:'CREATIVE_MOTION_SCORE_METRIC_REQUIRED',missing:name};
  let weighted=0,total=0;
  const normalized={};
  for(const name of METRICS){
    const value=metric(values[name]);
    if(value===null) continue;
    const weight=Math.max(0,Number(input.weights?.[name] ?? DEFAULT_WEIGHTS[name]));
    normalized[name]=value;
    weighted+=value*weight;
    total+=weight;
  }
  if(total<=0) return {ok:false,code:'CREATIVE_MOTION_SCORE_METRICS_EMPTY'};
  const score=Number(((weighted/total)*100).toFixed(2));
  const threshold=Math.min(100,Math.max(0,Number(input.threshold ?? 88)));
  const hardMinimum=Math.min(1,Math.max(0,Number(input.hardMinimum ?? 0.72)));
  const hardFailures=required.filter(name=>normalized[name]<hardMinimum);
  return {
    ok:true,
    schemaVersion:'creative-motion-consistency-score.v1',
    score,
    threshold,
    pass:score>=threshold&&hardFailures.length===0,
    hardMinimum,
    hardFailures,
    metrics:normalized,
    measurementSourceRequired:true,
    liveQualityVerified:false,
    providerNativeControlVerified:false,
    note:'Consumes measured motion evidence only; CODE does not prove trajectory adherence, motion quality, loop quality, or provider-native control support.',
    truth:'CODE_READY',
  };
}
