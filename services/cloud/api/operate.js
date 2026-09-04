import { verifySignedCloudRequest,validateCloudPayload } from "../lib/security.js";
function httpsUrl(value){try{const u=new URL(String(value||"").trim());return u.protocol==="https:"?u.toString():"";}catch{return"";}}
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST")return res.status(405).json({error:"METHOD_NOT_ALLOWED"});
 const raw=typeof req.body==="string"?req.body:JSON.stringify(req.body||{});
 const signed=verifySignedCloudRequest(req,raw);if(!signed.ok)return res.status(signed.status).json({error:signed.error});
 let input;try{input=typeof req.body==="string"?JSON.parse(req.body):req.body||{};}catch{return res.status(400).json({error:"INVALID_JSON"});}
 const checked=validateCloudPayload(input);if(!checked.ok)return res.status(400).json({error:checked.error});
 const adapter=httpsUrl(process.env.LANERIQ_CLOUD_STORAGE_ADAPTER_URL);
 const adapterSecret=String(process.env.LANERIQ_CLOUD_STORAGE_ADAPTER_SECRET||process.env.LANERIQ_CLOUD_SERVICE_SECRET||"");
 if(!adapter||adapterSecret.length<32)return res.status(503).json({error:"CLOUD_STORAGE_ADAPTER_NOT_READY",evidenceLevel:"CODE_READY"});
 let response;try{response=await fetch(adapter,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${adapterSecret}`,"x-laneriq-cloud-contract":"csvc1"},body:JSON.stringify(checked.value),redirect:"error",cache:"no-store",signal:AbortSignal.timeout(25000)});}catch{return res.status(503).json({error:"CLOUD_STORAGE_ADAPTER_UNREACHABLE"});}
 const data=await response.json().catch(()=>({}));if(!response.ok)return res.status(response.status>=400&&response.status<600?response.status:502).json({error:data?.error||"CLOUD_STORAGE_ADAPTER_FAILED"});
 return res.status(200).json({...data,service:"laneriq-cloud-data",contract:"csvc1",requestId:checked.value.requestId});
}
