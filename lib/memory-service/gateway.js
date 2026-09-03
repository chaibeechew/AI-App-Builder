import crypto from "node:crypto";

const PATH="/api/memory/v1/operate";
const MAX_BODY_BYTES=262144;

function text(value){return String(value??"").trim();}
function baseUrl(value){const v=text(value).replace(/\/$/,"");if(!v)return"";try{const u=new URL(v);return u.protocol==="https:"?v:"";}catch{return"";}}
function bodyHash(body){return crypto.createHash("sha256").update(body).digest("hex");}
function canonical({clientId,timestamp,nonce,body}){return `${clientId}\n${timestamp}\n${nonce}\nPOST\n${PATH}\n${bodyHash(body)}`;}
function signature(secret,fields){return crypto.createHmac("sha256",secret).update(canonical(fields)).digest("hex");}

export function getMemoryServiceMode(){
  const url=baseUrl(process.env.LANERIQ_MEMORY_SERVICE_URL);
  const secret=text(process.env.LANERIQ_MEMORY_SERVICE_SECRET);
  return url&&secret.length>=32?"remote":"embedded";
}

export async function executeMemoryService({operation,appId,userId,payload={},embedded}){
  if(!["load","save"].includes(operation))throw new Error("invalid_memory_operation");
  if(typeof embedded!=="function")throw new Error("embedded_memory_handler_required");
  if(getMemoryServiceMode()==="embedded")return embedded();
  const url=baseUrl(process.env.LANERIQ_MEMORY_SERVICE_URL);
  const secret=text(process.env.LANERIQ_MEMORY_SERVICE_SECRET);
  const clientId=text(process.env.LANERIQ_MEMORY_SERVICE_CLIENT_ID||"laneriq-ai");
  const body=JSON.stringify({operation,appId,userId,payload});
  if(Buffer.byteLength(body,"utf8")>MAX_BODY_BYTES+65536)throw new Error("memory_service_request_too_large");
  const timestamp=String(Date.now());const nonce=crypto.randomBytes(24).toString("base64url");const sig=signature(secret,{clientId,timestamp,nonce,body});
  let response;try{response=await fetch(`${url}${PATH}`,{method:"POST",headers:{"content-type":"application/json","x-laneriq-client-id":clientId,"x-laneriq-timestamp":timestamp,"x-laneriq-nonce":nonce,"x-laneriq-signature":sig},body,redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10000)});}catch(error){const wrapped=new Error("memory_service_unreachable");wrapped.cause=error;throw wrapped;}
  const data=await response.json().catch(()=>({}));if(!response.ok){const error=new Error(data?.error||"memory_service_failed");error.status=response.status;throw error;}return data;
}
