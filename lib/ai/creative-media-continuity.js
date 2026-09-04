import { createHash } from 'node:crypto';
import { getCreativeMediaTask, validateCreativeMediaRequest } from './creative-media-control-plane.js';
import { getCreativeMediaRequiredQualitySignals } from './creative-media-quality-judge.js';

const freeze = value => Object.freeze(value);
const ID = /^[A-Za-z0-9._:-]{1,180}$/;
const PROFILE_KINDS = freeze(['character','product','brand']);
const SUBJECT_TYPES = freeze(['fictional','self','consenting-adult','minor','unknown']);
const PROHIBITED_KEY = /(embedding|biometric|facevector|facetemplate|rawimage|base64|secret|token|password|credential|privatekey|signedurl|sourceurl|imageurl|videourl|audioUrl)/i;
const PRODUCT_TASKS = new Set(['image.product-series','video.product-consistency']);
const BRAND_TASKS = new Set(['image.brand-consistency']);
const CHARACTER_TASKS = new Set(['image.identity-series','image.face-consistency','video.character-consistency','video.avatar-speech','video.lipsync']);

function clean(value,max=240){return String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);}
function cleanId(value){const id=clean(value,180);return ID.test(id)?id:null;}
function uniqueIds(value,max=12){return freeze([...new Set((Array.isArray(value)?value:[]).map(cleanId).filter(Boolean))].slice(0,max));}
function sha(value){return createHash('sha256').update(String(value??'')).digest('hex');}
function safeStringList(value,maxItems=24,maxChars=120){return freeze((Array.isArray(value)?value:[]).map(v=>clean(v,maxChars)).filter(Boolean).slice(0,maxItems));}
function assertNoProhibitedKeys(value,path='profile'){
  if(!value||typeof value!=='object')return;
  if(Array.isArray(value)){value.forEach((item,index)=>assertNoProhibitedKeys(item,`${path}[${index}]`));return;}
  for(const [key,item] of Object.entries(value)){
    if(PROHIBITED_KEY.test(key))throw new Error('MEDIA_IDENTITY_PRIVATE_FIELD_NOT_ALLOWED');
    assertNoProhibitedKeys(item,`${path}.${key}`);
  }
}
function semanticLock(input={}){
  const source=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
  assertNoProhibitedKeys(source);
  return freeze({
    description:clean(source.description,800)||null,
    palette:safeStringList(source.palette,12,48),
    wardrobe:safeStringList(source.wardrobe,12,120),
    materials:safeStringList(source.materials,12,120),
    geometry:safeStringList(source.geometry,12,120),
    distinctiveMarks:safeStringList(source.distinctiveMarks,12,120),
    prohibitedChanges:safeStringList(source.prohibitedChanges,24,160),
  });
}
function likenessPolicy({kind,subjectType,realPersonLikeness,consentAttested,guardianConsentAttested}){
  if(kind!=='character')return freeze({likenessConsentRequired:false,likenessConsentSatisfied:true,minorSafeguardsRequired:false});
  if(subjectType==='minor'){
    if(realPersonLikeness===true&&guardianConsentAttested!==true)throw new Error('MEDIA_IDENTITY_GUARDIAN_CONSENT_REQUIRED');
    return freeze({likenessConsentRequired:realPersonLikeness===true,likenessConsentSatisfied:realPersonLikeness!==true||guardianConsentAttested===true,minorSafeguardsRequired:true});
  }
  if(realPersonLikeness===true&&subjectType==='unknown')throw new Error('MEDIA_IDENTITY_SUBJECT_TYPE_REQUIRED');
  if(realPersonLikeness===true&&subjectType!=='fictional'&&consentAttested!==true)throw new Error('MEDIA_IDENTITY_LIKENESS_CONSENT_REQUIRED');
  return freeze({likenessConsentRequired:realPersonLikeness===true&&subjectType!=='fictional',likenessConsentSatisfied:realPersonLikeness!==true||subjectType==='fictional'||consentAttested===true,minorSafeguardsRequired:false});
}

export const CREATIVE_MEDIA_IDENTITY_PROFILE_KINDS = PROFILE_KINDS;
export const CREATIVE_MEDIA_IDENTITY_SUBJECT_TYPES = SUBJECT_TYPES;

export function buildCreativeMediaIdentityProfile({
  identityId=null,kind='character',displayName='',subjectType='fictional',realPersonLikeness=false,
  consentAttested=false,guardianConsentAttested=false,referenceAssetIds=[],semantic={},createdAt=null,
}={}){
  const normalizedKind=clean(kind,24).toLowerCase();
  if(!PROFILE_KINDS.includes(normalizedKind))throw new Error('MEDIA_IDENTITY_KIND_INVALID');
  const normalizedSubject=clean(subjectType,32).toLowerCase();
  if(!SUBJECT_TYPES.includes(normalizedSubject))throw new Error('MEDIA_IDENTITY_SUBJECT_TYPE_INVALID');
  const references=uniqueIds(referenceAssetIds,12);
  if((Array.isArray(referenceAssetIds)?referenceAssetIds:[]).length!==references.length)throw new Error('MEDIA_IDENTITY_REFERENCE_ID_INVALID');
  const lock=semanticLock(semantic);
  const consent=likenessPolicy({kind:normalizedKind,subjectType:normalizedSubject,realPersonLikeness:realPersonLikeness===true,consentAttested:consentAttested===true,guardianConsentAttested:guardianConsentAttested===true});
  const core={schemaVersion:1,kind:normalizedKind,displayName:clean(displayName,120)||null,subjectType:normalizedKind==='character'?normalizedSubject:null,realPersonLikeness:normalizedKind==='character'&&realPersonLikeness===true,referenceAssetIds:references,semanticLock:lock,consent,referenceOwnershipValidationRequired:references.length>0,rawReferenceUrlsAllowed:false,biometricEmbeddingsStored:false,reusableAcrossUsers:false,createdAt:createdAt?new Date(createdAt).toISOString():null};
  const profileDigest=sha(JSON.stringify(core));
  const stableId=cleanId(identityId)||`media-id:${profileDigest.slice(0,32)}`;
  return freeze({...core,identityId:stableId,profileDigest});
}

function kindAllowedForTask(kind,taskId){
  if(PRODUCT_TASKS.has(taskId))return kind==='product';
  if(BRAND_TASKS.has(taskId))return kind==='brand';
  if(CHARACTER_TASKS.has(taskId))return kind==='character';
  return true;
}

export function buildCreativeMediaIdentityEnvelope({task,profile,input={},referenceOwnershipValidated=false}={}){
  const spec=getCreativeMediaTask(task);const id=clean(task,120).toLowerCase();
  if(!spec)return freeze({ok:false,code:'CREATIVE_MEDIA_TASK_UNSUPPORTED',task:id||null});
  if(!profile?.identityId||!profile?.profileDigest||!PROFILE_KINDS.includes(profile?.kind))return freeze({ok:false,code:'MEDIA_IDENTITY_PROFILE_REQUIRED',task:id});
  if(!kindAllowedForTask(profile.kind,id))return freeze({ok:false,code:'MEDIA_IDENTITY_KIND_TASK_MISMATCH',task:id});
  if(profile.referenceAssetIds?.length&&referenceOwnershipValidated!==true)return freeze({ok:false,code:'MEDIA_IDENTITY_REFERENCE_OWNERSHIP_REQUIRED',task:id});
  if(profile.consent?.likenessConsentRequired===true&&profile.consent?.likenessConsentSatisfied!==true)return freeze({ok:false,code:'MEDIA_IDENTITY_LIKENESS_CONSENT_REQUIRED',task:id});
  const base=input&&typeof input==='object'&&!Array.isArray(input)?{...input}:{};
  if(profile.referenceAssetIds?.length&&!Array.isArray(base.referenceImages))base.referenceImages=[...profile.referenceAssetIds];
  if(profile.kind==='character')base.identityId=profile.identityId;
  if(profile.kind==='product')base.productId=profile.identityId;
  if(profile.kind==='brand')base.brandKitId=base.brandKitId||profile.identityId;
  base.continuity={...(base.continuity&&typeof base.continuity==='object'?base.continuity:{}),identityProfileDigest:profile.profileDigest,lockSemanticIdentity:true,reusableAcrossUsers:false};
  const validation=validateCreativeMediaRequest({task:id,input:base});
  if(!validation.ok)return freeze({...validation,code:validation.code||'CREATIVE_MEDIA_INPUT_REQUIRED'});
  const qualityContext=freeze({requiresPeople:profile.kind==='character',requiresCharacterConsistency:profile.kind==='character',requiresProductConsistency:profile.kind==='product',requiresBrandConsistency:profile.kind==='brand'});
  return freeze({ok:true,task:id,input:freeze(base),identity:freeze({identityId:profile.identityId,kind:profile.kind,profileDigest:profile.profileDigest}),qualityContext,requiredQualitySignals:freeze(getCreativeMediaRequiredQualitySignals({task:id,context:qualityContext})),likenessConsent:profile.consent?.likenessConsentSatisfied===true,referenceOwnershipValidated:referenceOwnershipValidated===true,providerLiveVerified:false,rule:'Identity continuity is a CODE contract until owner validation, provider execution and real output quality evidence are separately verified.'});
}

function normalizeShot(shot,index,profile){
  const source=shot&&typeof shot==='object'&&!Array.isArray(shot)?shot:{};assertNoProhibitedKeys(source);
  const shotId=cleanId(source.shotId)||`shot-${index+1}`;
  const task=clean(source.task||'video.scene-generate',120).toLowerCase();const spec=getCreativeMediaTask(task);
  if(!spec||spec.modality!=='video')throw new Error('MEDIA_CONTINUITY_SHOT_TASK_INVALID');
  const prompt=clean(source.prompt,2000);if(!prompt)throw new Error('MEDIA_CONTINUITY_SHOT_PROMPT_REQUIRED');
  const durationSeconds=Math.max(1,Math.min(20,Number(source.durationSeconds)||5));
  const firstFrameAssetId=source.firstFrameAssetId?cleanId(source.firstFrameAssetId):null;
  const lastFrameAssetId=source.lastFrameAssetId?cleanId(source.lastFrameAssetId):null;
  if(source.firstFrameAssetId&&!firstFrameAssetId)throw new Error('MEDIA_CONTINUITY_FRAME_ID_INVALID');
  if(source.lastFrameAssetId&&!lastFrameAssetId)throw new Error('MEDIA_CONTINUITY_FRAME_ID_INVALID');
  const context={requiresPeople:profile.kind==='character',requiresCharacterConsistency:profile.kind==='character',requiresProductConsistency:profile.kind==='product',requiresBrandConsistency:profile.kind==='brand'};
  return freeze({shotId,task,prompt,durationSeconds,camera:source.camera&&typeof source.camera==='object'?freeze({...source.camera}):null,motion:clean(source.motion,160)||null,firstFrameAssetId,lastFrameAssetId,identityProfileDigest:profile.profileDigest,requiredQualitySignals:freeze(getCreativeMediaRequiredQualitySignals({task,context}))});
}

export function buildCreativeMediaContinuityPlan({storyId=null,profile,shots=[],aspectRatio='16:9',targetDurationSeconds=null}={}){
  if(!profile?.identityId||!profile?.profileDigest)throw new Error('MEDIA_IDENTITY_PROFILE_REQUIRED');
  if(!Array.isArray(shots)||shots.length<1||shots.length>24)throw new Error('MEDIA_CONTINUITY_SHOT_COUNT_INVALID');
  const draft=shots.map((shot,index)=>normalizeShot(shot,index,profile));
  const normalized=freeze(draft.map((shot,index)=>freeze({...shot,continuityFrom:index?draft[index-1].shotId:null})));
  const totalDurationSeconds=Number(normalized.reduce((sum,shot)=>sum+shot.durationSeconds,0).toFixed(2));
  if(targetDurationSeconds!=null&&totalDurationSeconds>Math.max(1,Number(targetDurationSeconds)))throw new Error('MEDIA_CONTINUITY_DURATION_EXCEEDED');
  const core={schemaVersion:1,storyId:cleanId(storyId)||`story:${sha(`${profile.profileDigest}:${normalized.map(v=>v.shotId).join('|')}`).slice(0,24)}`,identityId:profile.identityId,identityProfileDigest:profile.profileDigest,aspectRatio:clean(aspectRatio,24)||'16:9',shotCount:normalized.length,totalDurationSeconds,shots:normalized,continuityRules:freeze({lockIdentity:true,lockCorePalette:true,lockProductGeometry:profile.kind==='product',lockBrandMarks:profile.kind==='brand',bridgeAdjacentShots:true,referenceOwnershipRequired:true,providerMayNotReusePrivateReferencesAcrossUsers:true})};
  return freeze({...core,planDigest:sha(JSON.stringify(core)),truth:freeze({codeReady:true,providerConnected:false,liveProviderVerified:false,realOutputQualityVerified:false})});
}
