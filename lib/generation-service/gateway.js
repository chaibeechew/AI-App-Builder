import crypto from "node:crypto";
import { validateGenerationServiceRequest } from "./contract.js";
const PATH="/api/generation/v1/operate";
function cleanUrl(value){try{const u=new URL(String(value||"").trim());return u.protocol==="https:"?u.toString().replace(/\/$/,""):"";}catch{return"";}}
function sign(secret,body,ts,nonce){const hash=crypto.createHash("sha256").update(body).digest("hex");return crypto.createHmac("sha256",secret).update(`gsvc1\n${ts}\n${nonce}\n${PATH}\n${hash}`).digest("hex");}
export function generationServiceMode(){const url=cleanUrl(process.env.LANERIQ_GENERATION_SERVICE_URL),secret=String(process.env.LANERIQ_GENERATION_SERVICE_SECRET||"");return url&&secret.length>=32?"remote":"embedded";}
export async function executeGenerationService(input,{embedded}){
  const checked=validateGenerationServiceRequest(input);if(!checked.ok){const e=new Error(checked.code);e.code=checked.code;throw e;}
  if(typeof embedded!=="function")throw new Error("EMBEDDED_GENERATION_HANDLER_REQUIRED");
  if(generationServiceMode()==="embedded")return embedded(checked.value);
  const url=cleanUrl(process.env.LANERIQ_GENERATION_SERVICE_URL),secret=String(process.env.LANERIQ_GENERATION_SERVICE_SECRET||"");
  const body=JSON.stringify(checked.value),ts=String(Date.now()),nonce=crypto.randomBytes(24).toString("base64url"),signature=sign(secret,body,ts,nonce);
  let response;try{response=await fetch(`${url}${PATH}`,{method:"POST",headers:{"content-type":"application/json","x-laneriq-generation-ts":ts,"x-laneriq-generation-nonce":nonce,"x-laneriq-generation-signature":signature},body,redirect:"error",cache:"no-store",signal:AbortSignal.timeout(120000)});}catch(error){const e=new Error("GENERATION_SERVICE_UNREACHABLE");e.cause=error;throw e;}
  const data=await response.json().catch(()=>({}));if(!response.ok){const e=new Error(data?.error||"GENERATION_SERVICE_FAILED");e.status=response.status;throw e;}return data;
}
