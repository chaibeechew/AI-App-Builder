import crypto from "node:crypto";
import { validatePublishServiceRequest } from "./contract.js";
const PATH="/api/publish/v1/operate";
function httpsUrl(v){try{const u=new URL(String(v||"").trim());return u.protocol==="https:"?u.toString().replace(/\/$/,""):"";}catch{return"";}}
function sign(secret,body,ts,nonce){const digest=crypto.createHash("sha256").update(body).digest("hex");return crypto.createHmac("sha256",secret).update(`psvc1\n${ts}\n${nonce}\n${PATH}\n${digest}`).digest("hex");}
export function publishServiceMode(){const url=httpsUrl(process.env.LANERIQ_PUBLISH_SERVICE_URL),secret=String(process.env.LANERIQ_PUBLISH_SERVICE_SECRET||"");return url&&secret.length>=32?"remote":"embedded";}
export async function executePublishService(input,{embedded}){
 const checked=validatePublishServiceRequest(input);if(!checked.ok){const e=new Error(checked.code);e.code=checked.code;throw e;}
 if(typeof embedded!=="function")throw new Error("EMBEDDED_PUBLISH_HANDLER_REQUIRED");
 if(publishServiceMode()==="embedded")return embedded(checked.value);
 const url=httpsUrl(process.env.LANERIQ_PUBLISH_SERVICE_URL),secret=String(process.env.LANERIQ_PUBLISH_SERVICE_SECRET||"");
 const body=JSON.stringify(checked.value),ts=String(Date.now()),nonce=crypto.randomBytes(24).toString("base64url"),signature=sign(secret,body,ts,nonce);
 let response;try{response=await fetch(`${url}${PATH}`,{method:"POST",headers:{"content-type":"application/json","x-laneriq-publish-ts":ts,"x-laneriq-publish-nonce":nonce,"x-laneriq-publish-signature":signature},body,redirect:"error",cache:"no-store",signal:AbortSignal.timeout(120000)});}catch(error){const e=new Error("PUBLISH_SERVICE_UNREACHABLE");e.cause=error;throw e;}
 const data=await response.json().catch(()=>({}));if(!response.ok){const e=new Error(data?.error||"PUBLISH_SERVICE_FAILED");e.status=response.status;throw e;}return data;
}
