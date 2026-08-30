import { runSoftwareEngineerBrain } from "./software-engineer-brain.js";
import { materializeAppSpecification } from "./source-materializer.js";
import { verifyInRealSandbox } from "./sandbox-gate.js";
import { verifyGeneratedSourceSecurity, verifyGeneratedSourcePrivacy } from "./source-security-verifier.js";

// Bridges generated project specifications into source-code engineering + isolated App/Website verification.
export async function runEngineeringPhase(input = {}, handlers = {}) {
  const specification=input.specification||input.result?.specification||null;
  const deterministic=specification?materializeAppSpecification(specification):null;
  const create=handlers.create||(deterministic?async()=>deterministic:null);
  if(typeof create!=="function")return {status:"not-connected",enabled:false,reason:"no-specification-or-code-creator",requiresSandboxBeforeAcceptance:true};
  const merged={
    create,
    review:typeof handlers.review==="function"?handlers.review:async proposal=>({passed:Array.isArray(proposal?.files)&&proposal.files.length>0,errors:Array.isArray(proposal?.files)&&proposal.files.length>0?[]:["NO_MATERIALIZED_FILES"]}),
    sandbox:typeof handlers.sandbox==="function"?handlers.sandbox:async proposal=>verifyInRealSandbox({pages:specification?.pages||[],navigation:specification?.navigation||[],routes:proposal?.routes||deterministic?.routes||["/","/website"],acceptanceTargets:{app:"/",website:"/website"},sourceFiles:proposal.files},{appId:input.appId}),
    security:typeof handlers.security==="function"?handlers.security:async proposal=>verifyGeneratedSourceSecurity(proposal),
    privacy:typeof handlers.privacy==="function"?handlers.privacy:async proposal=>verifyGeneratedSourcePrivacy(proposal),
    repair:typeof handlers.repair==="function"?handlers.repair:undefined,
  };
  const result=await runSoftwareEngineerBrain({...input,existing:deterministic?.files?.map(f=>f.path)||[]},merged);
  return {...result,enabled:true,materialized:Boolean(deterministic),sourceType:deterministic?.sourceType||"ai-created",targets:{app:true,website:true},requiresSandboxBeforeAcceptance:true,verification:{security:"deterministic-source-scan",privacy:"deterministic-source-scan",sandbox:"isolated-app-and-website-runtime-required"}};
}
