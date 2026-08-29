// Adapter for a separately isolated Soolen sandbox service.
// Never executes generated code in the AI App Builder host process.
import { createRuntimeTestPlan } from "./runtime-test-engine.js";

function runtimeUrl(){const raw=String(process.env.SOOLEN_SANDBOX_RUNTIME_URL||"").trim();if(!raw)return null;const u=new URL(raw);if(u.protocol!=="https:"&&!(["localhost","127.0.0.1"].includes(u.hostname)))throw new Error("SOOLEN_SANDBOX_RUNTIME_URL_MUST_USE_HTTPS");return u.toString().replace(/\/$/,"");}
async function call(path,payload,timeoutMs){const base=runtimeUrl();if(!base)throw new Error("SOOLEN_SANDBOX_RUNTIME_NOT_CONNECTED");const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);try{const r=await fetch(`${base}${path}`,{method:"POST",headers:{"content-type":"application/json",...(process.env.SOOLEN_SANDBOX_RUNTIME_TOKEN?{authorization:`Bearer ${process.env.SOOLEN_SANDBOX_RUNTIME_TOKEN}`}:{})},body:JSON.stringify(payload),signal:controller.signal,cache:"no-store",redirect:"error"});if(!r.ok)throw new Error(`SOOLEN_SANDBOX_HTTP_${r.status}`);return await r.json();}finally{clearTimeout(timer);}}

export function createRemoteSandboxAdapter(){
 return {
  async materialize(job){return call("/v1/workspaces",{jobId:job.id,specification:job.specification,policy:job.policy},15000);},
  async build(workspace,policy){return call("/v1/build",{workspaceId:workspace.id,policy},Math.min(Number(policy.maxBuildMs)||120000,120000));},
  async test(workspace,policy){return call("/v1/test",{workspaceId:workspace.id,plan:createRuntimeTestPlan(workspace.specification||{}),policy},Math.min(Number(policy.maxTestMs)||60000,60000));},
  async cleanup(workspace){try{return await call("/v1/cleanup",{workspaceId:workspace.id},10000);}catch{return {cleaned:false};}}
 };
}
export function sandboxRuntimeConnected(){try{return Boolean(runtimeUrl());}catch{return false;}}
