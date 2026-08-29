const SAFE_EXECUTION_TARGETS=new Set(["device","company-pool","soolen-cloud-optional"]);
const PRIVATE_MEDIA_FIELDS=new Set(["referenceImage","sourceVideo","voiceFile"]);

export class SoolenSecurityError extends Error{
  constructor(message,code="SOOLEN_SECURITY_ERROR",status=400){super(message);this.name="SoolenSecurityError";this.code=code;this.status=status;}
}

export function sanitizeDeviceCapabilities(input={}){
  const allowed={};
  if(typeof input.runtime==="string")allowed.runtime=input.runtime.slice(0,32);
  if(typeof input.deviceClass==="string")allowed.deviceClass=input.deviceClass.slice(0,32);
  if(Number.isFinite(Number(input.cpuThreads)))allowed.cpuThreads=Math.max(1,Math.min(256,Number(input.cpuThreads)));
  if(Number.isFinite(Number(input.memoryGB)))allowed.memoryGB=Math.max(0,Math.min(1024,Number(input.memoryGB)));
  allowed.webgpu=Boolean(input.webgpu);
  if(typeof input.tier==="string")allowed.tier=input.tier.slice(0,32);
  return allowed;
}

export function createDataHandlingPolicy({executionTarget="device",hasPrivateMedia=false,hasUploadedVoice=false,shareSpareCompute=false}={}){
  if(!SAFE_EXECUTION_TARGETS.has(executionTarget))throw new SoolenSecurityError("Unsupported execution target.","INVALID_EXECUTION_TARGET",400);
  const local=executionTarget==="device";
  return {
    version:1,
    executionTarget,
    localProcessingPreferred:true,
    privateMediaExpected:Boolean(hasPrivateMedia||hasUploadedVoice),
    uploadPrivateMediaToServer:!local,
    persistRawPrivateMedia:false,
    persistPrompt:false,
    retainGeneratedArtifacts:"user-controlled",
    crossUserComputeAllowed:false,
    shareSpareCompute:Boolean(shareSpareCompute),
    sharePrivateRawContent:false,
    telemetry:{rawPrompt:false,rawMedia:false,voiceSamples:false,deviceFingerprint:false},
    logs:{secrets:false,rawPrompt:false,rawMedia:false,fullUserAgent:false},
    network:{allowOnlySelectedRuntime:true,thirdPartyMediaProviders:false},
    encryption:{transportRequired:true,atRestRequiredForPersistedSensitiveData:true}
  };
}

export function enforceAutonomousSecurity(input={}){
  const target=input.executionTarget||"device";
  if(!SAFE_EXECUTION_TARGETS.has(target))throw new SoolenSecurityError("Unsupported execution target.","INVALID_EXECUTION_TARGET",400);
  if(input.shareSpareCompute&&input.sharePrivateRawContent)throw new SoolenSecurityError("Private customer media cannot be shared with volunteer compute nodes.","PRIVATE_DATA_COMPUTE_SHARING_BLOCKED",403);
  if(input.backgroundCompute&&!input.explicitBackgroundConsent)throw new SoolenSecurityError("Background compute requires explicit consent.","BACKGROUND_COMPUTE_CONSENT_REQUIRED",403);
  if(input.crossUserCompute)throw new SoolenSecurityError("Cross-user compute is disabled for private workloads.","CROSS_USER_COMPUTE_BLOCKED",403);
  return true;
}

export function redactSoolenLog(value){
  if(value===null||value===undefined)return value;
  if(typeof value==="string")return value.length>120?`${value.slice(0,24)}…[redacted]`:value.replace(/Bearer\s+[A-Za-z0-9._~-]+/gi,"Bearer [redacted]");
  if(Array.isArray(value))return value.map(redactSoolenLog);
  if(typeof value!=="object")return value;
  const out={};
  for(const [key,val] of Object.entries(value)){
    const k=key.toLowerCase();
    if(PRIVATE_MEDIA_FIELDS.has(key)||k.includes("token")||k.includes("secret")||k.includes("password")||k.includes("authorization")||k==="prompt"||k.includes("voicefile"))out[key]="[redacted]";
    else out[key]=redactSoolenLog(val);
  }
  return out;
}

export function assertRuntimeUrlAllowed(runtimeUrl){
  let url;
  try{url=new URL(runtimeUrl);}catch{throw new SoolenSecurityError("Invalid Soolen runtime URL.","INVALID_RUNTIME_URL",500);}
  if(url.protocol!=="https:"&&!(url.protocol==="http:"&&["localhost","127.0.0.1","::1"].includes(url.hostname)))throw new SoolenSecurityError("Soolen runtime must use HTTPS unless it is a local runtime.","INSECURE_RUNTIME_URL",500);
  const allowlist=String(process.env.SOOLEN_RUNTIME_HOST_ALLOWLIST||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(allowlist.length&& !allowlist.includes(url.hostname.toLowerCase()))throw new SoolenSecurityError("Selected runtime is not in the Soolen allowlist.","RUNTIME_NOT_ALLOWLISTED",403);
  return url.toString();
}
