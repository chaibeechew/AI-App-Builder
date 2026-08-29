import { createSandboxJob, runSandboxVerification } from "./execution-sandbox.js";
import { createRemoteSandboxAdapter, sandboxRuntimeConnected } from "./sandbox-runtime-adapter.js";
// Real source-code acceptance always requires the isolated runtime. Never falls back to host execution.
export async function verifyInRealSandbox(specification,{appId}={}){if(!sandboxRuntimeConnected())return {passed:null,status:"not-connected",required:true,failures:["isolated-sandbox-runtime-required"]};const job=createSandboxJob({appId,specification});const result=await runSandboxVerification(job,createRemoteSandboxAdapter());return {...result,required:true};}
