const OPS=new Set(["definition.validate","run","status"]);
const ACTIONS=new Set(["save_crm","save_order","notify_team","send_email","send_whatsapp","calendar"]);
const ID=/^[A-Za-z0-9._:-]{1,160}$/;
const MAX_BYTES=96*1024;
function text(v,max=2000){return String(v??"").trim().slice(0,max);}
export function validateWorkflowServiceRequest(input={}){
 const operation=text(input.operation,40);if(!OPS.has(operation))return{ok:false,code:"INVALID_OPERATION"};
 const requestId=text(input.requestId,160),tenantId=text(input.tenantId,160),userId=text(input.userId,160),projectId=text(input.projectId,160),workflowId=text(input.workflowId,160),idempotencyKey=text(input.idempotencyKey,200);
 if(![requestId,tenantId,userId,projectId,workflowId].every(v=>ID.test(v)))return{ok:false,code:"INVALID_SCOPE_IDENTITY"};
 if(operation==="run"&&!ID.test(idempotencyKey))return{ok:false,code:"IDEMPOTENCY_REQUIRED"};
 const payload=input.payload&&typeof input.payload==="object"&&!Array.isArray(input.payload)?input.payload:{};
 const serialized=JSON.stringify(payload);if(Buffer.byteLength(serialized,"utf8")>MAX_BYTES)return{ok:false,code:"PAYLOAD_TOO_LARGE"};
 if(/(?:token|api[_-]?key|secret|password|credential|private[_-]?key|service[_-]?role)\s*[":=]/i.test(serialized))return{ok:false,code:"RAW_SECRET_FORBIDDEN"};
 const actions=Array.isArray(payload.actions)?payload.actions.slice(0,13):[];if(actions.length>12)return{ok:false,code:"TOO_MANY_ACTIONS"};
 for(const action of actions){if(!ACTIONS.has(String(action?.type||"")))return{ok:false,code:"UNSUPPORTED_ACTION"};}
 if(actions.some(a=>String(a?.type||"")==="send_sms"))return{ok:false,code:"SMS_DISABLED"};
 return{ok:true,value:{operation,requestId,tenantId,userId,projectId,workflowId,idempotencyKey,dryRun:input.dryRun===true,payload}};
}
export const WORKFLOW_SERVICE_CONTRACT=Object.freeze({version:"wsvc1",operations:[...OPS],actions:[...ACTIONS],maxActions:12,stableIdempotencyRequired:true,safeTestSupported:true,smsEnabled:false,requiresHttps:true,requiresSignedRequests:true,noSilentFallback:true,providerOpaque:true,evidenceLevel:"CODE_READY"});
