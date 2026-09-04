import { createHash } from 'node:crypto';

const freeze=value=>Object.freeze(value);
const ID=/^[A-Za-z0-9._:-]{1,180}$/;
const ROLE=/^[A-Za-z0-9._ -]{1,80}$/;
const PAGE=/^[A-Za-z0-9._/ -]{1,120}$/;
const MIME=/^(?:image|video|audio)\/[A-Za-z0-9.+-]{1,80}$/i;
const STATES=freeze(['draft','queued','running','completed','failed','blocked_by_policy','cancelled']);
const TRUTH=freeze(['CODE_READY','CI_READY','PROVIDER_READY','PROVIDER_CONNECTED','LIVE_PROVIDER_VERIFIED','PRODUCTION_VERIFIED','REAL_OUTPUT_QUALITY_VERIFIED']);

function clean(value,max=240){return String(value||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);}
function ids(value,max=24){return [...new Set((Array.isArray(value)?value:[]).map(v=>typeof v==='string'?v:v?.id).map(v=>clean(v,180)).filter(v=>ID.test(v)))].slice(0,max);}
function sha(value){return createHash('sha256').update(String(value||'')).digest('hex');}
function safeNumber(value,min=0,max=1e9){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):null;}
function safeIso(value){const date=value?new Date(value):new Date();return Number.isNaN(date.getTime())?new Date().toISOString():date.toISOString();}
function truthSet(value){return [...new Set((Array.isArray(value)?value:[]).map(v=>clean(v,80)).filter(v=>TRUTH.includes(v)))];}

export const CREATIVE_MEDIA_LIFECYCLE_STATES=STATES;
export const CREATIVE_MEDIA_LIFECYCLE_TRUTH=TRUTH;

export function buildCreativeMediaHistoryEntry({
  requestId,task,modality,state='completed',assetIds=[],parentAssetIds=[],retryOf=null,supersedes=null,
  source='unknown',provider=null,providerJobId=null,prompt=null,promptHash=null,versionNo=1,quality=null,truth=[],createdAt,
}={}){
  const stableRequest=clean(requestId,180);if(!ID.test(stableRequest))throw new Error('MEDIA_HISTORY_REQUEST_ID_INVALID');
  const media=clean(modality,20).toLowerCase();if(!['image','video','audio'].includes(media))throw new Error('MEDIA_HISTORY_MODALITY_INVALID');
  const normalizedState=clean(state,40);if(!STATES.includes(normalizedState))throw new Error('MEDIA_HISTORY_STATE_INVALID');
  const normalizedAssets=ids(assetIds);if(normalizedState==='completed'&&!normalizedAssets.length)throw new Error('MEDIA_HISTORY_COMPLETED_OUTPUT_REQUIRED');
  const promptDigest=clean(promptHash,64)||sha(clean(prompt,4000));
  const lineage=freeze({parentAssetIds:freeze(ids(parentAssetIds)),retryOf:ID.test(clean(retryOf,180))?clean(retryOf,180):null,supersedes:ID.test(clean(supersedes,180))?clean(supersedes,180):null});
  const qualitySummary=quality&&typeof quality==='object'?freeze({score:safeNumber(quality.score,0,100),decision:clean(quality.decision,40)||null,gatePassed:quality.gatePassed===true}):null;
  const core={schemaVersion:1,requestId:stableRequest,task:clean(task,120)||'unknown',modality:media,state:normalizedState,assetIds:freeze(normalizedAssets),lineage,source:clean(source,60)||'unknown',provider:clean(provider,80)||null,providerJobId:ID.test(clean(providerJobId,180))?clean(providerJobId,180):null,promptHash:promptDigest,versionNo:Math.max(1,Math.floor(Number(versionNo)||1)),quality:qualitySummary,truth:freeze(truthSet(truth)),createdAt:safeIso(createdAt),rawPromptStored:false,signedUrlStored:false,reusableAcrossUsers:false};
  const evidenceDigest=sha(JSON.stringify(core));
  return freeze({...core,evidenceDigest});
}

export function buildCreativeMediaUndoPlan(history=[],currentRequestId=''){
  const rows=(Array.isArray(history)?history:[]).filter(row=>row&&row.state==='completed'&&Array.isArray(row.assetIds)&&row.assetIds.length);
  const current=clean(currentRequestId,180);const index=rows.findIndex(row=>row.requestId===current);if(index<0)return freeze({ok:false,code:'MEDIA_UNDO_CURRENT_NOT_FOUND'});
  const previous=rows.slice(0,index).reverse().find(row=>row.requestId!==current);if(!previous)return freeze({ok:false,code:'MEDIA_UNDO_NO_PREVIOUS_VERSION'});
  return freeze({ok:true,fromRequestId:current,toRequestId:previous.requestId,restoreAssetIds:freeze([...previous.assetIds]),createsNewVersion:true,destructiveDelete:false});
}

export function buildCreativeMediaRetryPlan(entry,{qualityDecision='retry',sameProviderAvailable=true,fallbackAvailable=true,costAllowed=true}={}){
  if(!entry?.requestId)return freeze({ok:false,code:'MEDIA_RETRY_SOURCE_REQUIRED'});if(!costAllowed)return freeze({ok:false,code:'MEDIA_RETRY_COST_POLICY_BLOCKED'});
  const decision=clean(qualityDecision,40).toLowerCase();const strategy=decision==='repair'?'prompt-repair':sameProviderAvailable?'same-provider-regenerate':fallbackAvailable?'provider-fallback':'fail-closed';
  return freeze({ok:strategy!=='fail-closed',strategy,retryOf:entry.requestId,preserveParents:true,preservePromptHash:true,newRequestIdRequired:true,providerChargeRequiresPolicyApproval:true});
}

export function buildAssetLibraryHandoff({projectId,assetId,suggestedPage='home',suggestedRole='media',placementReason='AI-generated media selected by owner'}={}){
  const project=clean(projectId,180),asset=clean(assetId,180),page=clean(suggestedPage,120),role=clean(suggestedRole,80),reason=clean(placementReason,240);
  if(!ID.test(project)||!ID.test(asset))throw new Error('MEDIA_HANDOFF_ID_INVALID');if(!PAGE.test(page)||!ROLE.test(role))throw new Error('MEDIA_HANDOFF_PLACEMENT_INVALID');
  return freeze({schemaVersion:1,projectId:project,assetId:asset,suggestedPage:page,suggestedRole:role,placementReason:reason||'Owner-selected generated media',ownerValidationRequired:true,assetOwnershipValidationRequired:true,projectOwnershipValidationRequired:true,storesSignedUrl:false,appBuilderCoreMutation:false});
}

export function buildAppBuilderMediaInsertContract(input={}){
  const handoff=buildAssetLibraryHandoff(input);return freeze({...handoff,insertionId:sha(`${handoff.projectId}:${handoff.assetId}:${handoff.suggestedPage}:${handoff.suggestedRole}`).slice(0,32),contract:'LANERIQ_MEDIA_ASSET_INSERT_V1',allowedTargets:freeze(['app','website','game']),publishRequiresDurableAsset:true});
}

export function buildCreativeMediaExportManifest({projectId=null,assets=[]}={}){
  const project=clean(projectId,180);if(project&&!ID.test(project))throw new Error('MEDIA_EXPORT_PROJECT_ID_INVALID');
  const rows=(Array.isArray(assets)?assets:[]).slice(0,100).map(item=>{const id=clean(item?.id,180);if(!ID.test(id))return null;const mime=clean(item?.mimeType||item?.mime_type,120);if(mime&&!MIME.test(mime))return null;return freeze({id,mimeType:mime||null,fileName:clean(item?.fileName||item?.file_name,180)||null,bytes:safeNumber(item?.bytes||item?.file_size,0,104857600),width:safeNumber(item?.width,1,16384),height:safeNumber(item?.height,1,16384),durationSeconds:safeNumber(item?.durationSeconds,0,86400),contentFingerprint:/^[0-9a-f]{64}$/i.test(clean(item?.contentFingerprint||item?.content_fingerprint,64))?clean(item?.contentFingerprint||item?.content_fingerprint,64).toLowerCase():null});}).filter(Boolean);
  const manifest={schemaVersion:1,projectId:project||null,assetCount:rows.length,assets:freeze(rows),durableAssetsOnly:true,signedUrlsExcluded:true,providerCredentialsExcluded:true,rawPromptsExcluded:true};
  return freeze({...manifest,manifestDigest:sha(JSON.stringify(manifest))});
}

export function assessCreativeMediaLifecycleReadiness({history=true,versioning=true,undo=true,provenance=true,assetLibrary=true,appBuilderHandoff=true,exportManifest=true,liveProviderEvidence=false,realOutputQualityEvidence=false}={}){
  const codeChecks={history,versioning,undo,provenance,assetLibrary,appBuilderHandoff,exportManifest};const passed=Object.values(codeChecks).filter(Boolean).length;
  return freeze({codeScore:Math.round(passed/Object.keys(codeChecks).length*100),codeReady:passed===Object.keys(codeChecks).length,liveProviderVerified:liveProviderEvidence===true,realOutputQualityVerified:realOutputQualityEvidence===true,productionComplete:passed===Object.keys(codeChecks).length&&liveProviderEvidence===true&&realOutputQualityEvidence===true,rule:'100 CODE does not imply LIVE PROVIDER, PRODUCTION or REAL OUTPUT QUALITY verification.'});
}
