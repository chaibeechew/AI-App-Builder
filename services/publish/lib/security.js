import crypto from "node:crypto";
const PATH="/api/publish/v1/operate",MAX_SKEW=5*60*1000,ID=/^[A-Za-z0-9._:-]{1,160}$/,DIGEST=/^sha256:[a-f0-9]{64}$/i;
function secret(){return String(process.env.LANERIQ_PUBLISH_SERVICE_SECRET||"");}
function hash(body){return crypto.createHash("sha256").update(body).digest("hex");}
function expected(body,ts,nonce){return crypto.createHmac("sha256",secret()).update(`psvc1\n${ts}\n${nonce}\n${PATH}\n${hash(body)}`).digest("hex");}
export function verifySignedPublishRequest(req,body){
 const s=secret();if(s.length<32)return{ok:false,status:503,error:"PUBLISH_SERVICE_NOT_CONFIGURED"};
 const ts=String(req.headers["x-laneriq-publish-ts"]||""),nonce=String(req.headers["x-laneriq-publish-nonce"]||""),sig=String(req.headers["x-laneriq-publish-signature"]||"");
 const n=Number(ts);if(!Number.isFinite(n)||Math.abs(Date.now()-n)>MAX_SKEW)return{ok:false,status:401,error:"STALE_OR_INVALID_TIMESTAMP"};
 if(!/^[A-Za-z0-9_-]{20,80}$/.test(nonce))return{ok:false,status:401,error:"INVALID_NONCE"};
 const exp=expected(body,ts,nonce);if(sig.length!==exp.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(exp)))return{ok:false,status:401,error:"INVALID_SIGNATURE"};
 return{ok:true};
}
export function validatePublishPayload(input={}){const operation=String(input.operation||"");if(!["prepare","promote","rollback","status"].includes(operation))return{ok:false,error:"INVALID_OPERATION"};const requestId=String(input.requestId||""),projectId=String(input.projectId||""),releaseId=String(input.releaseId||"");if(!ID.test(requestId)||!ID.test(projectId)||!ID.test(releaseId))return{ok:false,error:"INVALID_RELEASE_IDENTITY"};const target=String(input.target||"preview");if(!["preview","production"].includes(target))return{ok:false,error:"INVALID_TARGET"};const artifactDigest=String(input.artifactDigest||"");if(operation!=="status"&&!DIGEST.test(artifactDigest))return{ok:false,error:"INVALID_ARTIFACT_DIGEST"};return{ok:true,value:{operation,requestId,projectId,releaseId,target,artifactDigest,payload:input.payload&&typeof input.payload==="object"&&!Array.isArray(input.payload)?input.payload:{}}};}
