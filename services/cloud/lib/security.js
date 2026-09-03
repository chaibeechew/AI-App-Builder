import crypto from "node:crypto";
const PATH="/api/cloud/v1/operate",MAX_SKEW=5*60*1000,ID=/^[A-Za-z0-9._:-]{1,160}$/;
function secret(){return String(process.env.LANERIQ_CLOUD_SERVICE_SECRET||"");}
function hash(body){return crypto.createHash("sha256").update(body).digest("hex");}
function expected(body,ts,nonce){return crypto.createHmac("sha256",secret()).update(`csvc1\n${ts}\n${nonce}\n${PATH}\n${hash(body)}`).digest("hex");}
export function verifySignedCloudRequest(req,body){
 const s=secret();if(s.length<32)return{ok:false,status:503,error:"CLOUD_SERVICE_NOT_CONFIGURED"};
 const ts=String(req.headers["x-laneriq-cloud-ts"]||""),nonce=String(req.headers["x-laneriq-cloud-nonce"]||""),sig=String(req.headers["x-laneriq-cloud-signature"]||"");
 const n=Number(ts);if(!Number.isFinite(n)||Math.abs(Date.now()-n)>MAX_SKEW)return{ok:false,status:401,error:"STALE_OR_INVALID_TIMESTAMP"};
 if(!/^[A-Za-z0-9_-]{20,80}$/.test(nonce))return{ok:false,status:401,error:"INVALID_NONCE"};
 const exp=expected(body,ts,nonce);if(sig.length!==exp.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(exp)))return{ok:false,status:401,error:"INVALID_SIGNATURE"};
 return{ok:true};
}
export function validateCloudPayload(input={}){const operation=String(input.operation||"");if(!["project.read","project.write","context.read","context.write","artifact.meta"].includes(operation))return{ok:false,error:"INVALID_OPERATION"};const requestId=String(input.requestId||""),tenantId=String(input.tenantId||""),userId=String(input.userId||""),projectId=String(input.projectId||"");if(!ID.test(requestId)||!ID.test(tenantId)||!ID.test(userId)||!ID.test(projectId))return{ok:false,error:"INVALID_SCOPE_IDENTITY"};return{ok:true,value:{operation,requestId,tenantId,userId,projectId,payload:input.payload&&typeof input.payload==="object"&&!Array.isArray(input.payload)?input.payload:{}}};}
