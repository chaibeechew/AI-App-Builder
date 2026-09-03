import crypto from "node:crypto";
const PATH="/api/generation/v1/operate",MAX_SKEW=5*60*1000,ID=/^[A-Za-z0-9._:-]{1,160}$/;
function secret(){return String(process.env.LANERIQ_GENERATION_SERVICE_SECRET||"");}
function hash(body){return crypto.createHash("sha256").update(body).digest("hex");}
function expected(body,ts,nonce){return crypto.createHmac("sha256",secret()).update(`gsvc1\n${ts}\n${nonce}\n${PATH}\n${hash(body)}`).digest("hex");}
export function verifySignedGenerationRequest(req,body){
 const s=secret();if(s.length<32)return{ok:false,status:503,error:"GENERATION_SERVICE_NOT_CONFIGURED"};
 const ts=String(req.headers["x-laneriq-generation-ts"]||""),nonce=String(req.headers["x-laneriq-generation-nonce"]||""),sig=String(req.headers["x-laneriq-generation-signature"]||"");
 const n=Number(ts);if(!Number.isFinite(n)||Math.abs(Date.now()-n)>MAX_SKEW)return{ok:false,status:401,error:"STALE_OR_INVALID_TIMESTAMP"};
 if(!/^[A-Za-z0-9_-]{20,80}$/.test(nonce))return{ok:false,status:401,error:"INVALID_NONCE"};
 const exp=expected(body,ts,nonce);if(sig.length!==exp.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(exp)))return{ok:false,status:401,error:"INVALID_SIGNATURE"};
 return{ok:true};
}
export function validatePayload(input={}){const operation=String(input.operation||"");if(!["generate","modify","repair","verify"].includes(operation))return{ok:false,error:"INVALID_OPERATION"};const requestId=String(input.requestId||"");if(!ID.test(requestId))return{ok:false,error:"INVALID_REQUEST_ID"};const payload=input.payload&&typeof input.payload==="object"&&!Array.isArray(input.payload)?input.payload:{};if(Buffer.byteLength(JSON.stringify(payload),"utf8")>96*1024)return{ok:false,error:"PAYLOAD_TOO_LARGE"};return{ok:true,value:{operation,requestId,tenantId:String(input.tenantId||"").slice(0,160),projectId:String(input.projectId||"").slice(0,160),payload}};}
