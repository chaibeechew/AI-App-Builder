// Soolen generated-app execution sandbox contract.
// This module intentionally does not spawn host processes. A compatible isolated runtime
// must implement the adapter and enforce these limits outside the generated app process.

export const DEFAULT_SANDBOX_POLICY=Object.freeze({
  network:"deny",
  filesystem:"ephemeral-workspace-only",
  secrets:"none",
  maxBuildMs:120000,
  maxTestMs:60000,
  maxMemoryMB:768,
  maxOutputBytes:2_000_000,
  allowedCommands:["install","build","test"],
  preview:{isolatedOrigin:true,iframeSandbox:"allow-scripts allow-forms",csp:true},
});

export function createSandboxJob({appId,specification,policy={}}={}){
 if(!specification)throw new Error("SOOLEN_SANDBOX_SPEC_REQUIRED");
 return {id:`sandbox-${appId||crypto.randomUUID?.()||Date.now()}`,state:"planned",createdAt:new Date().toISOString(),specification,policy:{...DEFAULT_SANDBOX_POLICY,...policy},stages:["materialize","dependency-check","build","runtime-smoke-test","ui-route-test","security-test","cleanup"]};
}

export function validateSandboxAdapter(adapter){
 const required=["materialize","build","test","cleanup"];
 const missing=required.filter(k=>typeof adapter?.[k]!=="function");
 return {ok:missing.length===0,missing};
}

export async function runSandboxVerification(job,adapter){
 const valid=validateSandboxAdapter(adapter);if(!valid.ok)return {passed:false,status:"runtime-not-connected",failures:valid.missing.map(x=>`missing-adapter:${x}`),job};
 const started=Date.now();let workspace;
 try{
  workspace=await adapter.materialize(job);
  const build=await adapter.build(workspace,job.policy);
  if(build?.passed===false)return {passed:false,status:"build-failed",failures:build.errors||["build-failed"],build,job};
  const tests=await adapter.test(workspace,job.policy);
  return {passed:tests?.passed!==false,status:tests?.passed===false?"tests-failed":"verified",failures:tests?.errors||[],build,tests,durationMs:Date.now()-started,job};
 }finally{if(workspace)await adapter.cleanup(workspace).catch(()=>{});}
}
