const OPS=new Set(["generate","modify","repair","verify"]);
const ID=/^[A-Za-z0-9._:-]{1,160}$/;
const MAX_BYTES=96*1024;
function text(v,max=4000){return String(v??"").trim().slice(0,max);}
export function validateGenerationServiceRequest(input={}){
  const operation=text(input.operation,32);
  if(!OPS.has(operation))return{ok:false,code:"INVALID_OPERATION"};
  const requestId=text(input.requestId,160);if(!ID.test(requestId))return{ok:false,code:"INVALID_REQUEST_ID"};
  const tenantId=text(input.tenantId,160),projectId=text(input.projectId,160);
  const payload=input.payload&&typeof input.payload==="object"&&!Array.isArray(input.payload)?input.payload:{};
  const bytes=Buffer.byteLength(JSON.stringify(payload),"utf8");if(bytes>MAX_BYTES)return{ok:false,code:"PAYLOAD_TOO_LARGE"};
  const serialized=JSON.stringify(payload);
  if(/(?:api[_-]?key|private[_-]?key|password|passwd|secret|credential)\s*[":=]/i.test(serialized))return{ok:false,code:"RAW_SECRET_FORBIDDEN"};
  return{ok:true,value:{operation,requestId,tenantId,projectId,payload}};
}
export const GENERATION_SERVICE_CONTRACT=Object.freeze({version:"gsvc1",operations:[...OPS],maxPayloadBytes:MAX_BYTES,requiresHttps:true,requiresSignedRequests:true,noSilentFallback:true,providerOpaque:true,evidenceLevel:"CODE_READY"});
