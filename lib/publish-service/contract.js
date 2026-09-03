const OPS=new Set(["prepare","promote","rollback","status"]);
const ID=/^[A-Za-z0-9._:-]{1,160}$/;
const DIGEST=/^sha256:[a-f0-9]{64}$/i;
const TARGETS=new Set(["preview","production"]);
const MAX_BYTES=64*1024;
function text(v,max=2000){return String(v??"").trim().slice(0,max);}
export function validatePublishServiceRequest(input={}){
 const operation=text(input.operation,32);if(!OPS.has(operation))return{ok:false,code:"INVALID_OPERATION"};
 const requestId=text(input.requestId,160);if(!ID.test(requestId))return{ok:false,code:"INVALID_REQUEST_ID"};
 const projectId=text(input.projectId,160),releaseId=text(input.releaseId,160),target=text(input.target||"preview",24);
 if(!ID.test(projectId)||!ID.test(releaseId))return{ok:false,code:"INVALID_RELEASE_IDENTITY"};
 if(!TARGETS.has(target))return{ok:false,code:"INVALID_TARGET"};
 const artifactDigest=text(input.artifactDigest,80);if(operation!=="status"&&!DIGEST.test(artifactDigest))return{ok:false,code:"INVALID_ARTIFACT_DIGEST"};
 const payload=input.payload&&typeof input.payload==="object"&&!Array.isArray(input.payload)?input.payload:{};
 if(Buffer.byteLength(JSON.stringify(payload),"utf8")>MAX_BYTES)return{ok:false,code:"PAYLOAD_TOO_LARGE"};
 if(/(?:token|api[_-]?key|secret|password|credential|private[_-]?key)\s*[":=]/i.test(JSON.stringify(payload)))return{ok:false,code:"RAW_SECRET_FORBIDDEN"};
 return{ok:true,value:{operation,requestId,projectId,releaseId,target,artifactDigest,payload}};
}
export const PUBLISH_SERVICE_CONTRACT=Object.freeze({version:"psvc1",operations:[...OPS],targets:[...TARGETS],artifactDigest:"sha256",requiresHttps:true,requiresSignedRequests:true,noSilentFallback:true,providerOpaque:true,evidenceLevel:"CODE_READY"});
