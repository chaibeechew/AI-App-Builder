// LANERIQ AI Game World Reconstruction V4
// Deterministic, provider-neutral multi-view reconstruction planning with explicit privacy/evidence boundaries.

function text(v){return String(v??"").trim();}
function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
function opaqueRef(v){const s=text(v);return s&&!/^https?:|^data:/i.test(s)?s:"";}

export const GAME_WORLD_RECONSTRUCTION_V4=Object.freeze({
  version:"game-world-reconstruction-v4",
  modes:Object.freeze(["photo-set","video-frames","panorama-set","existing-mesh","synthetic-capture-plan"]),
  stages:Object.freeze(["ingest","privacy-scrub","frame-select","camera-solve","depth-estimate-contract","geometry-fuse-contract","semantic-anchor","quality-audit"]),
  providerNeutral:true,
  deterministicPlanning:true,
  faceIdentityExtractionDefault:false,
  geolocationInferenceDefault:false,
  liveReconstructionProviderVerified:false
});

export function createReconstructionCapturePlan({project,captures=[],mode="synthetic-capture-plan",maxFrames=96}={}){
  const regions=project?.blueprint?.regions||[];
  const sanitized=(Array.isArray(captures)?captures:[]).slice(0,clamp(maxFrames,4,256)).map((item,index)=>({
    id:text(item.id)||`capture_${index+1}`,
    assetRef:opaqueRef(item.assetRef),
    timestampMs:Math.max(0,Number(item.timestampMs)||index*500),
    cameraHint:item.cameraHint?{fov:clamp(item.cameraHint.fov||60,20,140),orientation:Array.isArray(item.cameraHint.orientation)?item.cameraHint.orientation.slice(0,4):null}:null,
    metadataPolicy:"strip-private-metadata"
  })).filter(item=>item.assetRef||mode==="synthetic-capture-plan");
  const synthetic=sanitized.length?sanitized:regions.slice(0,Math.max(6,Math.min(24,regions.length*3||6))).map((region,index)=>({
    id:`synthetic_view_${index+1}`,
    assetRef:"",
    timestampMs:index*500,
    cameraHint:{fov:60,orientation:null,regionId:text(region?.id)||"world"},
    metadataPolicy:"no-capture-asset"
  }));
  return{
    version:GAME_WORLD_RECONSTRUCTION_V4.version,
    mode,
    frames:synthetic,
    cameraSolve:{intrinsics:"estimate-or-use-consented-metadata",extrinsics:"multi-view-relative-pose",scale:"anchor-required-for-real-world-scale",bundleAdjustmentContract:true},
    geometry:{depth:"provider-or-local-estimator-contract",fusion:"tsdf-or-point-splat-contract",proxyMesh:true,semanticAnchors:true},
    privacy:{stripPrivateMetadata:true,faceIdentityExtraction:false,geolocationInference:false,biometricTemplateStorage:false,rawUrlsAccepted:false},
    evidence:{realCaptureUsed:sanitized.some(x=>Boolean(x.assetRef)),liveCameraSolveVerified:false,liveDepthProviderVerified:false,liveReconstructionProviderVerified:false,realWorldScaleVerified:false}
  };
}

export function estimateReconstructionQuality(plan={}){
  const frameCount=plan.frames?.length||0;
  const coverage=Math.round(clamp(frameCount/24*100,0,100));
  const cameraDiversity=Math.round(clamp(frameCount/12*100,0,100));
  const score=Math.round(coverage*.55+cameraDiversity*.45);
  return{score,coverage,cameraDiversity,reprojectionErrorPx:null,scaleErrorPercent:null,measured:false,measurementRequiredForLive:true};
}

export function auditReconstructionV4(plan={}){
  const gates={
    frames:Array.isArray(plan.frames)&&plan.frames.length>=4,
    cameraSolve:plan.cameraSolve?.bundleAdjustmentContract===true,
    geometry:plan.geometry?.proxyMesh===true&&plan.geometry?.semanticAnchors===true,
    privacy:plan.privacy?.stripPrivateMetadata===true&&plan.privacy?.faceIdentityExtraction===false&&plan.privacy?.geolocationInference===false,
    noRawUrls:plan.privacy?.rawUrlsAccepted===false,
    truthBoundary:plan.evidence?.liveReconstructionProviderVerified===false&&plan.evidence?.realWorldScaleVerified===false
  };
  const score=Math.round(Object.values(gates).filter(Boolean).length/Object.keys(gates).length*100);
  return{score,gates,canClaimInternal100:score===100,canClaimProduction100:false};
}

export function createReconstructionProviderContract(){
  return{
    version:"game-world-reconstruction-provider-contract-v1",
    inputs:["opaque-image-assets","opaque-video-asset","camera-metadata-optional","scale-anchor-optional"],
    outputs:["camera-poses","depth-confidence","sparse-or-dense-points","proxy-mesh","appearance-layer","quality-metadata"],
    requiredEvidence:["provider-name","model-version","asset-license","source-ownership","reprojection-error","coverage-score","latency-ms"],
    privacyRequirements:["metadata-scrub","no-default-face-identification","no-default-geolocation-inference"],
    providerNeutral:true,
    liveVerified:false
  };
}
