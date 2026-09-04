// LANERIQ AI Game World Digital Twin Calibration V4
// Aligns reconstructed observations to editable game-world coordinates without claiming real-world accuracy.

function text(v){return String(v??"").trim();}
function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}

export const GAME_WORLD_DIGITAL_TWIN_CALIBRATION_V4=Object.freeze({
  version:"game-world-digital-twin-calibration-v4",
  anchors:Object.freeze(["origin","scale","up-axis","region-anchor","landmark-anchor"]),
  changeDetectionContract:true,
  driftMonitoringContract:true,
  realWorldAccuracyVerified:false,
  liveChangeDetectionVerified:false
});

export function buildDigitalTwinCalibrationV4({v3,reconstruction,neuralScene,anchors=[]}={}){
  const regions=v3?.project?.blueprint?.regions||[];
  const provided=(Array.isArray(anchors)?anchors:[]).slice(0,32).map((a,index)=>({
    id:text(a.id)||`anchor_${index+1}`,
    type:text(a.type)||"landmark-anchor",
    worldNodeId:text(a.worldNodeId||a.nodeId),
    observedPoint:Array.isArray(a.observedPoint)?a.observedPoint.slice(0,3).map(Number):null,
    worldPoint:Array.isArray(a.worldPoint)?a.worldPoint.slice(0,3).map(Number):null,
    confidence:clamp(a.confidence||0,0,1)
  }));
  const synthetic=provided.length?provided:regions.slice(0,Math.max(3,Math.min(8,regions.length))).map((region,index)=>({id:`synthetic_anchor_${index+1}`,type:index===0?"origin":"region-anchor",worldNodeId:text(region.id)||`region_${index+1}`,observedPoint:null,worldPoint:[Number(region.x)||index*10,Number(region.y)||0,Number(region.z)||0],confidence:0}));
  return{
    version:GAME_WORLD_DIGITAL_TWIN_CALIBRATION_V4.version,
    anchors:synthetic,
    coordinateFrame:{upAxis:"Y",handedness:"right-handed-contract",metersPerUnit:1,scaleRequiresMeasuredAnchor:true},
    calibration:{method:"similarity-transform-plus-outlier-rejection-contract",minimumMeasuredAnchors:3,reprojectionOrAlignmentErrorRequiredForLive:true},
    changeDetection:{inputs:["prior-scene","new-observation"],outputs:["added","removed","moved","appearance-changed"],humanReviewForStructuralEdits:true,productionAutoWrite:false},
    drift:{monitorScale:true,monitorAnchorResiduals:true,monitorCameraResiduals:true,recalibrateOnThreshold:true},
    bindings:{reconstructionFrames:reconstruction?.frames?.length||0,neuralChunks:neuralScene?.chunks?.length||0,worldNodes:v3?.spatial?.nodes?.length||0},
    evidence:{measuredAnchorCount:provided.filter(a=>a.observedPoint&&a.worldPoint).length,alignmentError:null,realWorldScaleVerified:false,realWorldAccuracyVerified:false,liveChangeDetectionVerified:false,productionVerified:false}
  };
}

export function evaluateTwinCalibrationV4(twin={}){
  const measured=Number(twin.evidence?.measuredAnchorCount)||0;
  const score=measured>=3?100:Math.round(clamp(measured/3*100,0,100));
  return{measuredAnchorCount:measured,calibrationEvidenceScore:score,liveEligible:measured>=3&&Number.isFinite(twin.evidence?.alignmentError)&&twin.evidence?.realWorldScaleVerified===true};
}

export function auditDigitalTwinCalibrationV4(twin={}){
  const gates={
    anchors:Array.isArray(twin.anchors)&&twin.anchors.length>=3,
    coordinateFrame:twin.coordinateFrame?.upAxis==="Y"&&twin.coordinateFrame?.scaleRequiresMeasuredAnchor===true,
    calibration:Boolean(twin.calibration?.method),
    changeDetection:twin.changeDetection?.humanReviewForStructuralEdits===true&&twin.changeDetection?.productionAutoWrite===false,
    drift:twin.drift?.recalibrateOnThreshold===true,
    bindings:twin.bindings?.worldNodes>0,
    truthBoundary:twin.evidence?.realWorldAccuracyVerified===false&&twin.evidence?.productionVerified===false
  };
  const score=Math.round(Object.values(gates).filter(Boolean).length/Object.keys(gates).length*100);
  return{score,gates,canClaimInternal100:score===100,canClaimProduction100:false};
}

export function createDigitalTwinEvidenceContract(){
  return{
    version:"digital-twin-evidence-contract-v1",
    requiredForAccuracyClaim:["three-or-more-measured-anchors","scale-anchor","alignment-error","capture-timestamps","source-ownership","calibration-version"],
    requiredForLiveChangeDetection:["prior-scene-hash","new-observation-hash","change-score","review-decision"],
    codeOnlyCannotClaimAccuracy:true,
    codeOnlyCannotClaimLiveChangeDetection:true
  };
}
