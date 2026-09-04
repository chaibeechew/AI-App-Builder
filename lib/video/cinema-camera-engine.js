import { createHash } from 'node:crypto';

const freeze=value=>Object.freeze(value);
const clean=(value,max=240)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
const clamp=(value,min,max,fallback=null)=>{const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};
const enumValue=(value,allowed,fallback=null)=>{const normalized=clean(value,80).toLowerCase().replace(/\s+/g,'-');return allowed.includes(normalized)?normalized:fallback;};
const hash=value=>createHash('sha256').update(String(value??'')).digest('hex');

export const CINEMA_CAMERA_MOVES=freeze([
  'static','locked-tripod','pan-left','pan-right','tilt-up','tilt-down','dolly-in','dolly-out',
  'truck-left','truck-right','pedestal-up','pedestal-down','crane-up','crane-down','jib-up','jib-down',
  'push-in','pull-out','orbit-left','orbit-right','arc-left','arc-right','orbit-360','zoom-in','zoom-out',
  'crash-zoom-in','crash-zoom-out','rack-focus','whip-pan-left','whip-pan-right','roll-left','roll-right',
  'dutch-tilt-left','dutch-tilt-right','handheld','shoulder','steadicam','gimbal-follow','fpv-forward',
  'fpv-orbit','drone-rise','drone-dive','drone-flyover','bullet-time','snorricam','parallax-left',
  'parallax-right','reveal-up','reveal-down','tracking-front','tracking-rear','tracking-side','macro-slide'
]);
export const CINEMA_SHOT_SIZES=freeze(['extreme-wide','wide','full','medium-wide','medium','medium-close-up','close-up','extreme-close-up','macro']);
export const CINEMA_CAMERA_ANGLES=freeze(['eye-level','low','high','bird-eye','worm-eye','overhead','over-shoulder','pov','dutch-left','dutch-right']);
export const CINEMA_STABILIZATION=freeze(['auto','locked','tripod','gimbal','steadicam','handheld','shoulder','fpv','drone']);
export const CINEMA_DEPTH_OF_FIELD=freeze(['auto','shallow','medium','deep']);
export const CINEMA_EASING=freeze(['linear','ease-in','ease-out','ease-in-out','cinematic']);
export const CINEMA_SPEEDS=freeze(['slow','normal','fast','custom']);

const FORBIDDEN_TEXT=/https?:\/\/|data:|javascript:|bearer\s|api[_ -]?key|token|password|credential|secret/i;
function safeText(value,max=240){
  const text=clean(value,max);
  if(text&&FORBIDDEN_TEXT.test(text))throw new Error('CINEMA_CAMERA_PRIVATE_OR_URL_TEXT_NOT_ALLOWED');
  return text||null;
}
function normalizeMove(value,{allowNull=true}={}){
  const move=enumValue(value,CINEMA_CAMERA_MOVES,null);
  if(move)return move;
  if(allowNull&&!clean(value,80))return null;
  throw new Error('CINEMA_CAMERA_MOVE_INVALID');
}
function normalizeKeyframe(row,index){
  const source=row&&typeof row==='object'&&!Array.isArray(row)?row:{};
  const at=clamp(source.at,0,1,null);
  if(at===null)throw new Error('CINEMA_CAMERA_KEYFRAME_TIME_INVALID');
  return freeze({
    index,
    at,
    move:normalizeMove(source.move,{allowNull:true}),
    panDegrees:clamp(source.panDegrees,-360,360,null),
    tiltDegrees:clamp(source.tiltDegrees,-180,180,null),
    rollDegrees:clamp(source.rollDegrees,-180,180,null),
    lensMm:clamp(source.lensMm,8,300,null),
    focusDistanceMeters:clamp(source.focusDistanceMeters,0.05,10000,null),
    target:safeText(source.target,120),
  });
}
function normalizeKeyframes(value){
  const rows=Array.isArray(value)?value:[];
  if(rows.length>12)throw new Error('CINEMA_CAMERA_KEYFRAME_LIMIT_EXCEEDED');
  const normalized=rows.map((row,index)=>normalizeKeyframe(row,index));
  for(let i=1;i<normalized.length;i++)if(normalized[i].at<normalized[i-1].at)throw new Error('CINEMA_CAMERA_KEYFRAME_ORDER_INVALID');
  return freeze(normalized);
}

export function buildCinemaCameraContract({
  move='static',instruction=null,shotSize='medium',angle='eye-level',lensMm=null,apertureF=null,
  focusDistanceMeters=null,depthOfField='auto',speed='normal',speedPercent=null,stabilization='auto',
  handheldIntensity=null,arcDegrees=null,panDegrees=null,tiltDegrees=null,rollDegrees=null,
  zoomStartMm=null,zoomEndMm=null,subjectTracking=false,target=null,easing='cinematic',
  durationSeconds=null,keyframes=[],
}={}){
  const normalizedMove=normalizeMove(move,{allowNull:false});
  const normalizedSpeed=enumValue(speed,CINEMA_SPEEDS,null);
  if(!normalizedSpeed)throw new Error('CINEMA_CAMERA_SPEED_INVALID');
  const core={
    schemaVersion:1,
    move:normalizedMove,
    instruction:safeText(instruction,240),
    shotSize:enumValue(shotSize,CINEMA_SHOT_SIZES,'medium'),
    angle:enumValue(angle,CINEMA_CAMERA_ANGLES,'eye-level'),
    lensMm:clamp(lensMm,8,300,null),
    apertureF:clamp(apertureF,0.7,32,null),
    focusDistanceMeters:clamp(focusDistanceMeters,0.05,10000,null),
    depthOfField:enumValue(depthOfField,CINEMA_DEPTH_OF_FIELD,'auto'),
    speed:normalizedSpeed,
    speedPercent:clamp(speedPercent,0,100,null),
    stabilization:enumValue(stabilization,CINEMA_STABILIZATION,'auto'),
    handheldIntensity:clamp(handheldIntensity,0,100,null),
    arcDegrees:clamp(arcDegrees,-360,360,null),
    panDegrees:clamp(panDegrees,-360,360,null),
    tiltDegrees:clamp(tiltDegrees,-180,180,null),
    rollDegrees:clamp(rollDegrees,-180,180,null),
    zoomStartMm:clamp(zoomStartMm,8,300,null),
    zoomEndMm:clamp(zoomEndMm,8,300,null),
    subjectTracking:subjectTracking===true,
    target:safeText(target,120),
    easing:enumValue(easing,CINEMA_EASING,'cinematic'),
    durationSeconds:clamp(durationSeconds,0.5,30,null),
    keyframes:normalizeKeyframes(keyframes),
    providerNeutral:true,
    providerSupportRequired:true,
    providerLiveVerified:false,
    realOutputCameraQualityVerified:false,
  };
  return freeze({...core,cameraDigest:hash(JSON.stringify(core))});
}

export function normalizeCinemaCameraInput(value){
  if(value===undefined||value===null||value==='')return null;
  if(typeof value==='string'){
    const normalized=clean(value,240).toLowerCase().replace(/\s+/g,'-');
    if(CINEMA_CAMERA_MOVES.includes(normalized))return buildCinemaCameraContract({move:normalized});
    return buildCinemaCameraContract({move:'static',instruction:value});
  }
  if(typeof value!=='object'||Array.isArray(value))throw new Error('CINEMA_CAMERA_INPUT_INVALID');
  return buildCinemaCameraContract(value);
}

export function buildCinemaCameraCapabilityRequirement(camera){
  const contract=normalizeCinemaCameraInput(camera);
  if(!contract)return freeze({required:false,capabilities:freeze([]),controls:freeze([])});
  const controls=['camera-control'];
  if(contract.lensMm!==null||contract.zoomStartMm!==null||contract.zoomEndMm!==null)controls.push('lens-control');
  if(contract.apertureF!==null||contract.focusDistanceMeters!==null||contract.move==='rack-focus')controls.push('focus-control');
  if(contract.keyframes.length)controls.push('camera-keyframes');
  if(contract.subjectTracking)controls.push('subject-tracking');
  if(['fpv-forward','fpv-orbit','drone-rise','drone-dive','drone-flyover','bullet-time'].includes(contract.move))controls.push('advanced-camera-motion');
  return freeze({required:true,capabilities:freeze([...new Set(controls)]),controls:freeze({
    move:contract.move,shotSize:contract.shotSize,angle:contract.angle,lensMm:contract.lensMm,
    stabilization:contract.stabilization,keyframeCount:contract.keyframes.length,subjectTracking:contract.subjectTracking,
  }),rule:'Camera capability hints are routing requirements, not proof that a connected provider or real output has been verified.'});
}

export function assessCinemaCameraEvidence({contract,providerAdvertisedControls=[],productionOutputVerified=false,cameraQualityPassed=false}={}){
  const camera=normalizeCinemaCameraInput(contract);
  if(!camera)return freeze({codeReady:true,providerReady:false,liveVerified:false,realOutputQualityVerified:false,missingControls:freeze([])});
  const required=buildCinemaCameraCapabilityRequirement(camera).capabilities;
  const advertised=new Set((Array.isArray(providerAdvertisedControls)?providerAdvertisedControls:[]).map(v=>clean(v,80).toLowerCase()).filter(Boolean));
  const missing=required.filter(capability=>!advertised.has(capability));
  const providerReady=missing.length===0;
  const liveVerified=providerReady&&productionOutputVerified===true;
  return freeze({codeReady:true,providerReady,liveVerified,realOutputQualityVerified:liveVerified&&cameraQualityPassed===true,missingControls:freeze(missing),rule:'Provider-advertised camera controls do not count as LIVE until an exact Production output is verified; camera quality is a separate evidence gate.'});
}
