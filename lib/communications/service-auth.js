import crypto from "node:crypto";

const MAX_BODY_BYTES=65536;
const MAX_CLOCK_SKEW_SECONDS=300;
const ID_PATTERN=/^[A-Za-z0-9._:-]{1,180}$/;
const NONCE_PATTERN=/^[A-Za-z0-9_-]{16,180}$/;
const HEX_64=/^[a-f0-9]{64}$/;

function requiredSecret(value){
  const secret=String(value||"").trim();
  if(secret.length<32)throw new Error("LANERIQ communications service secret is not configured.");
  return secret;
}
function requiredPattern(value,pattern,label){
  const text=String(value||"").trim();
  if(!pattern.test(text))throw new Error(`${label} is invalid.`);
  return text;
}
export function sha256Hex(value){return crypto.createHash("sha256").update(value).digest("hex");}
export function privacyHmac(secret,kind,value){return crypto.createHmac("sha256",requiredSecret(secret)).update(`${kind}:${value}`).digest("hex");}

export function canonicalServiceRequest({clientId,timestamp,nonce,method,path,body}){
  const safeClient=requiredPattern(clientId,ID_PATTERN,"Service client id");
  const safeNonce=requiredPattern(nonce,NONCE_PATTERN,"Service nonce");
  const safeTimestamp=String(timestamp||"").trim();
  if(!/^\d{10,13}$/.test(safeTimestamp))throw new Error("Service timestamp is invalid.");
  const safeMethod=String(method||"").trim().toUpperCase();
  if(!/^[A-Z]{3,12}$/.test(safeMethod))throw new Error("Service method is invalid.");
  const safePath=String(path||"").trim();
  if(!safePath.startsWith("/")||safePath.length>500)throw new Error("Service path is invalid.");
  const safeBody=typeof body==="string"?body:String(body||"");
  if(Buffer.byteLength(safeBody,"utf8")>MAX_BODY_BYTES)throw new Error("Service request body is too large.");
  return `${safeClient}\n${safeTimestamp}\n${safeNonce}\n${safeMethod}\n${safePath}\n${sha256Hex(safeBody)}`;
}

export function signServiceRequest({secret,...request}){
  const canonical=canonicalServiceRequest(request);
  return crypto.createHmac("sha256",requiredSecret(secret)).update(canonical).digest("hex");
}

export function verifyServiceRequestSignature({secret,signature,nowMs=Date.now(),...request}){
  const supplied=String(signature||"").trim().toLowerCase();
  if(!HEX_64.test(supplied))return {ok:false,reason:"invalid_signature"};
  let canonical;
  try{canonical=canonicalServiceRequest(request);}catch{return {ok:false,reason:"invalid_request"};}
  const timestampNumber=Number(request.timestamp);
  const requestMs=String(request.timestamp).length===10?timestampNumber*1000:timestampNumber;
  if(!Number.isFinite(requestMs)||Math.abs(nowMs-requestMs)>MAX_CLOCK_SKEW_SECONDS*1000)return {ok:false,reason:"stale_request"};
  let expected;
  try{expected=crypto.createHmac("sha256",requiredSecret(secret)).update(canonical).digest("hex");}catch{return {ok:false,reason:"service_auth_unavailable"};}
  const ok=crypto.timingSafeEqual(Buffer.from(expected,"hex"),Buffer.from(supplied,"hex"));
  if(!ok)return {ok:false,reason:"invalid_signature"};
  return {
    ok:true,
    clientId:String(request.clientId),
    nonce:String(request.nonce),
    bodyHash:sha256Hex(typeof request.body==="string"?request.body:String(request.body||"")),
    expiresAt:new Date(requestMs+(MAX_CLOCK_SKEW_SECONDS*1000)).toISOString(),
  };
}

export const SERVICE_AUTH_LIMITS=Object.freeze({maxBodyBytes:MAX_BODY_BYTES,maxClockSkewSeconds:MAX_CLOCK_SKEW_SECONDS});
