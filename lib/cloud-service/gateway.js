import crypto from "node:crypto";
import { validateCloudServiceRequest } from "./contract.js";
const PATH="/api/cloud/v1/operate";
function httpsUrl(v){try{const u=new URL(String(v||"").trim());return u.protocol==="https:"?u.toString().replace(/\/$/,""):"";}catch{return"";}}
function sign(secret,body,ts,nonce){const digest=crypto.createHash("sha256").update(body).digest("hex");return crypto.createHmac("sha256",secret).update(`csvc1\n${ts}\n${nonce}\n${PATH}\n${digest}`).digest("hex");}
export function cloudServiceMode(){const url=httpsUrl(process.env.LANERIQ_CLOUD_SERVICE_URL),secret=String(process.env.LANERIQ_CLOUD_SERVICE_SECRET||"");return url&&secret.length>=32?"remote":"embedded";}
export async function executeCloudService(input,{embedded}){
 const checked=validateCloudServiceRequest(input);if(!checked.ok){const e=new Error(checked.code);e.code=checked.code;throw e;}
 if(typeof embedded!=="function")throw new Error("EMBEDDED_CLOUD_HANDLER_REQUIRED");
 if(cloudServiceMode()==="embedded")return embedded(checked.value);
 const url=httpsUrl(process.env.LANERIQ_CLOUD_SERVICE_URL),secret=String(process.env.LANERIQ_CLOUD_SERVICE_SECRET||"");
 const body=JSON.stringify(checked.value),ts=String(Date.now()),nonce=crypto.randomBytes(24).toString("base64url"),signature=sign(secret,body,ts,nonce);
 let response;try{response=await fetch(`${url}${PATH}`,{method:"POST",headers:{"content-type":"application/json","x-laneriq-cloud-ts":ts,"x-laneriq-cloud-nonce":nonce,"x-laneriq-cloud-signature":signature},body,redirect:"error",cache:"no-store",signal:AbortSignal.timeout(30000)});}catch(error){const e=new Error("CLOUD_SERVICE_UNREACHABLE");e.cause=error;throw e;}
 const data=await response.json().catch(()=>({}));if(!response.ok){const e=new Error(data?.error||"CLOUD_SERVICE_FAILED");e.status=response.status;throw e;}return data;
}
