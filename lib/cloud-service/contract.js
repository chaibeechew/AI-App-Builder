const OPS=new Set(["project.read","project.write","context.read","context.write","artifact.meta"]);
const ID=/^[A-Za-z0-9._:-]{1,160}$/;
const MAX_BYTES=128*1024;
function text(v,max=2000){return String(v??"").trim().slice(0,max);}
export function validateCloudServiceRequest(input={}){
 const operation=text(input.operation,40);if(!OPS.has(operation))return{ok:false,code:"INVALID_OPERATION"};
 const requestId=text(input.requestId,160),tenantId=text(input.tenantId,160),userId=text(input.userId,160),projectId=text(input.projectId,160);
 if(!ID.test(requestId)||!ID.test(tenantId)||!ID.test(userId)||!ID.test(projectId))return{ok:false,code:"INVALID_SCOPE_IDENTITY"};
 const payload=input.payload&&typeof input.payload==="object"&&!Array.isArray(input.payload)?input.payload:{};
 const serialized=JSON.stringify(payload);if(Buffer.byteLength(serialized,"utf8")>MAX_BYTES)return{ok:false,code:"PAYLOAD_TOO_LARGE"};
 if(/(?:token|api[_-]?key|secret|password|credential|private[_-]?key|service[_-]?role)\s*[":=]/i.test(serialized))return{ok:false,code:"RAW_SECRET_FORBIDDEN"};
 if(/\b(select|insert|update|delete|drop|alter|create)\b[\s\S]{0,30}\b(from|into|table)\b/i.test(serialized))return{ok:false,code:"ARBITRARY_QUERY_FORBIDDEN"};
 return{ok:true,value:{operation,requestId,tenantId,userId,projectId,payload}};
}
export const CLOUD_SERVICE_CONTRACT=Object.freeze({version:"csvc1",operations:[...OPS],scope:["tenantId","userId","projectId"],maxPayloadBytes:MAX_BYTES,arbitraryQueryAllowed:false,requiresHttps:true,requiresSignedRequests:true,noSilentFallback:true,providerOpaque:true,evidenceLevel:"CODE_READY"});
