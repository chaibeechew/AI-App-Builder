const crypto=require("node:crypto");

const ROUTE_PATH="/api/dispatch";
const MAX_BODY_BYTES=65536;
const MAX_CLOCK_SKEW_SECONDS=300;
const ID_PATTERN=/^[A-Za-z0-9._:-]{1,180}$/;
const NONCE_PATTERN=/^[A-Za-z0-9_-]{16,180}$/;
const HEX_64=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(v){return String(v||"").trim();}
function sha256(v){return crypto.createHash("sha256").update(v).digest("hex");}
function hmac(secret,kind,v){return crypto.createHmac("sha256",secret).update(`${kind}:${v}`).digest("hex");}
function json(res,status,body){res.setHeader("Cache-Control","private, no-store, max-age=0");res.setHeader("X-Content-Type-Options","nosniff");return res.status(status).json(body);}
function canonical({clientId,timestamp,nonce,method,path,body}){return `${clientId}\n${timestamp}\n${nonce}\n${method}\n${path}\n${sha256(body)}`;}
function verify({secret,signature,clientId,timestamp,nonce,body}){
  if(secret.length<32)return {ok:false,reason:"service_auth_unavailable"};
  if(!ID_PATTERN.test(clientId)||!NONCE_PATTERN.test(nonce)||!/^\d{10,13}$/.test(timestamp)||!HEX_64.test(signature))return {ok:false,reason:"invalid_request"};
  if(Buffer.byteLength(body,"utf8")>MAX_BODY_BYTES)return {ok:false,reason:"invalid_request"};
  const n=Number(timestamp);const requestMs=timestamp.length===10?n*1000:n;
  if(!Number.isFinite(requestMs)||Math.abs(Date.now()-requestMs)>MAX_CLOCK_SKEW_SECONDS*1000)return {ok:false,reason:"stale_request"};
  const expected=crypto.createHmac("sha256",secret).update(canonical({clientId,timestamp,nonce,method:"POST",path:ROUTE_PATH,body})).digest("hex");
  if(!crypto.timingSafeEqual(Buffer.from(expected,"hex"),Buffer.from(signature,"hex")))return {ok:false,reason:"invalid_signature"};
  return {ok:true,bodyHash:sha256(body),expiresAt:new Date(requestMs+MAX_CLOCK_SKEW_SECONDS*1000).toISOString()};
}
function env(){
  const url=text(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/$/,"");
  const key=text(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY);
  const secret=text(process.env.LANERIQ_COMMUNICATIONS_SERVICE_SECRET);
  const clientId=text(process.env.LANERIQ_COMMUNICATIONS_SERVICE_CLIENT_ID||"laneriq-ai");
  if(!url||!key)throw new Error("database_unavailable");
  return {url,key,secret,clientId};
}
async function rpc(cfg,name,args){
  const r=await fetch(`${cfg.url}/rest/v1/rpc/${name}`,{method:"POST",headers:{apikey:cfg.key,authorization:`Bearer ${cfg.key}`,"content-type":"application/json"},body:JSON.stringify(args),redirect:"error"});
  if(!r.ok)throw new Error(`${name}_failed`);
  if(r.status===204)return null;
  return r.json().catch(()=>null);
}
function normalize(input){
  const idempotencyKey=text(input?.idempotencyKey||input?.messageId);
  if(!/^[A-Za-z0-9._:-]{8,180}$/.test(idempotencyKey))throw new Error("invalid_idempotency_key");
  const to=text(input?.to);if(!UUID.test(to))throw new Error("in_app_recipient_must_be_uuid");
  const body=text(input?.body||input?.text);if(!body||body.length>4000)throw new Error("invalid_body");
  const preferred=Array.isArray(input?.preferredChannels)?input.preferredChannels.map(v=>text(v).toLowerCase()):[];
  if(preferred.length&&!preferred.includes("in_app"))throw new Error("zero_cost_route_unavailable");
  return {idempotencyKey,to,body,subject:text(input?.subject||"LANERIQ AI").slice(0,180),purpose:text(input?.purpose||"transactional").slice(0,40),actionUrl:text(input?.actionUrl).slice(0,1000),metadata:input?.metadata&&typeof input.metadata==="object"&&!Array.isArray(input.metadata)?input.metadata:{}};
}
async function finish(cfg,requestId,status){try{await rpc(cfg,"server_finish_communication_service_request",{p_request_id:requestId,p_status:status});}catch{}}

module.exports=async function handler(req,res){
  if(req.method!=="POST")return json(res,405,{ok:false,error:"POST only"});
  let cfg;try{cfg=env();}catch{return json(res,503,{ok:false,error:"Service database unavailable."});}
  const clientId=text(req.headers["x-laneriq-client-id"]);const timestamp=text(req.headers["x-laneriq-timestamp"]);const nonce=text(req.headers["x-laneriq-nonce"]);const signature=text(req.headers["x-laneriq-signature"]).toLowerCase();
  if(clientId!==cfg.clientId)return json(res,401,{ok:false,error:"Unauthorized service client."});
  const bodyText=typeof req.body==="string"?req.body:JSON.stringify(req.body||{});
  const verified=verify({secret:cfg.secret,signature,clientId,timestamp,nonce,body:bodyText});
  if(!verified.ok)return json(res,401,{ok:false,error:"Unauthorized service request.",reason:verified.reason});
  let message;try{message=normalize(typeof req.body==="string"?JSON.parse(req.body):req.body);}catch(e){return json(res,400,{ok:false,error:e.message});}
  let claim;
  try{
    const data=await rpc(cfg,"server_claim_communication_service_request",{p_client_hash:hmac(cfg.secret,"client",clientId),p_nonce_hash:hmac(cfg.secret,"nonce",nonce),p_idempotency_hash:hmac(cfg.secret,"idempotency",message.idempotencyKey),p_body_hash:verified.bodyHash,p_expires_at:verified.expiresAt});
    claim=Array.isArray(data)?data[0]:data;
  }catch{return json(res,503,{ok:false,error:"Service request ledger unavailable."});}
  if(claim?.decision==="replay_nonce")return json(res,409,{ok:false,status:"replay_blocked"});
  if(claim?.decision==="idempotency_conflict")return json(res,409,{ok:false,status:"idempotency_conflict"});
  if(claim?.decision==="idempotent_replay")return json(res,202,{ok:true,status:"already_claimed",requestId:claim.request_id});
  if(claim?.decision!=="claimed"||!claim?.request_id)return json(res,409,{ok:false,error:"Service request was not accepted."});
  try{
    const messageId=await rpc(cfg,"server_create_in_app_notification",{p_user_id:message.to,p_title:message.subject,p_body:message.body,p_href:message.actionUrl||null,p_purpose:message.purpose,p_metadata:message.metadata});
    if(!text(messageId))throw new Error("invalid_receipt");
    await finish(cfg,claim.request_id,"completed");
    return json(res,200,{ok:true,requestId:claim.request_id,result:{status:"delivered",channel:"in_app",messageId:text(messageId),externalSpend:0,evidenceLevel:"CODE"}});
  }catch{
    await finish(cfg,claim.request_id,"failed");
    return json(res,503,{ok:false,requestId:claim.request_id,error:"Communication dispatch failed."});
  }
};
