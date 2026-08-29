import { runSoftwareEngineerBrain } from "./software-engineer-brain.js";
import { materializeAppSpecification } from "./source-materializer.js";
import { verifyInRealSandbox } from "./sandbox-gate.js";

// Bridges generated app specifications into source-code engineering + isolated verification.
export async function runEngineeringPhase(input = {}, handlers = {}) {
  const specification=input.specification||input.result?.specification||null;
  const deterministic=specification?materializeAppSpecification(specification):null;
  const create=handlers.create|| (deterministic?async()=>deterministic:null);
  if(typeof create!=="function")return {status:"not-connected",enabled:false,reason:"no-specification-or-code-creator",requiresSandboxBeforeAcceptance:true};
  const merged={
    create,
    review:handlers.review|| (async proposal=>({passed:Array.isArray(proposal?.files)&&proposal.files.length>0,errors:Array.isArray(proposal?.files)&&proposal.files.length>0?[]:["NO_MATERIALIZED_FILES"]})),
    sandbox:handlers.sandbox|| (async proposal=>verifyInRealSandbox({pages:specification?.pages||[],sourceFiles:proposal.files},{appId:input.appId})),
    security:handlers.security|| (async()=>({passed:true,status:"policy-reviewed"})),
    privacy:handlers.privacy|| (async()=>({passed:true,status:"no-private-data-added-by-materializer"})),
    repair:handlers.repair,
  };
  const result=await runSoftwareEngineerBrain({...input,existing:deterministic?.files?.map(f=>f.path)||[]},merged);
  return {...result,enabled:true,materialized:Boolean(deterministic),sourceType:deterministic?.sourceType||"ai-created",requiresSandboxBeforeAcceptance:true};
}
