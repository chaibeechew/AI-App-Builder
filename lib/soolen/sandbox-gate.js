import { createSandboxJob, runSandboxVerification } from "./execution-sandbox.js";
import { createRemoteSandboxAdapter, sandboxRuntimeConnected } from "./sandbox-runtime-adapter.js";

// Real runtime verification is optional until an isolated runtime URL is configured.
// Never falls back to host-process execution.
export async function verifyInRealSandbox(specification,{appId}={}){
 if(!sandboxRuntimeConnected())return {passed:null,status:"not-connected",required:false,failures:[]};
 const job=createSandboxJob({appId,specification});
 const result=await runSandboxVerification(job,createRemoteSandboxAdapter());
 return {...result,required:true};
}
