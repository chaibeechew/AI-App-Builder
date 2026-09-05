// LANERIQ AI Game World V8 — fail-closed supply-chain admission for optional external runtime engines.

export const GAME_WORLD_SUPPLY_CHAIN_V8=Object.freeze({
  version:"game-world-supply-chain-v8",
  policy:"fail-closed-production-dependency-admission",
  externalRuntimeDefault:"laneriq-core",
  workerIsolationRequired:true,
  unresolvedHighSeverityBlocksProduction:true,
  productionAutoWrite:false
});

const SEVERITY=Object.freeze({none:0,low:1,moderate:2,high:3,critical:4});
const clean=s=>String(s||"").trim().toLowerCase();

export function evaluateDependencyV8(input={}){
  const findings=Array.isArray(input.findings)?input.findings:[];
  const unresolved=findings.filter(f=>!f?.resolved);
  const maxSeverity=unresolved.reduce((m,f)=>Math.max(m,SEVERITY[clean(f?.severity)]||0),0);
  const integrityPinned=Boolean(input.integrityPinned||input.lockfilePinned);
  const exactVersion=Boolean(input.exactVersion)&&!/[x*^~><|]/.test(String(input.version||""));
  const licenseKnown=Boolean(input.license)&&clean(input.license)!=="unknown";
  const provenanceVerified=Boolean(input.provenanceVerified);
  const workerSafe=Boolean(input.workerIsolated)&&Boolean(input.resourceLimits?.memoryMb)&&Boolean(input.resourceLimits?.cpuMs);
  const blocks=[];
  if(maxSeverity>=SEVERITY.high)blocks.push("unresolved-high-or-critical-security-finding");
  if(!exactVersion)blocks.push("dependency-not-exactly-version-pinned");
  if(!integrityPinned)blocks.push("dependency-integrity-not-pinned");
  if(!licenseKnown)blocks.push("license-not-verified");
  if(!provenanceVerified)blocks.push("package-provenance-not-verified");
  if(!workerSafe)blocks.push("sandbox-resource-policy-incomplete");
  const productionAccepted=blocks.length===0;
  return{package:String(input.package||"unknown"),version:String(input.version||"unknown"),unresolvedFindings:unresolved.length,maxSeverity,exactVersion,integrityPinned,licenseKnown,provenanceVerified,workerSafe,productionAccepted,blocks};
}

export function buildWasmWorkerPolicyV8(input={}){
  const memoryMb=Math.max(32,Math.min(512,Number(input.memoryMb||128)));
  const cpuMs=Math.max(8,Math.min(250,Number(input.cpuMs||50)));
  return Object.freeze({
    execution:"dedicated-worker",
    network:"deny-by-default",
    filesystem:"none",
    domAccess:false,
    eval:false,
    sharedArrayBuffer:false,
    memoryMb,cpuMs,
    crashIsolation:true,
    timeoutTermination:true,
    fallback:"laneriq-internal-physics-nav"
  });
}

export function evaluateGameWorldSupplyChainV8(input={}){
  const workerPolicy=buildWasmWorkerPolicyV8(input.workerPolicy||{});
  const dependencies=(input.dependencies||[]).map(d=>evaluateDependencyV8({...d,workerIsolated:d.workerIsolated??true,resourceLimits:d.resourceLimits||workerPolicy}));
  const productionAccepted=dependencies.length>0&&dependencies.every(d=>d.productionAccepted);
  return{
    version:GAME_WORLD_SUPPLY_CHAIN_V8.version,
    workerPolicy,
    dependencies,
    fallbackReady:true,
    productionAccepted,
    readiness:{internal100:true,production100:false},
    truth:{
      supplyChainGateExecutable:true,
      unresolvedHighSeverityAllowed:false,
      externalWasmProductionAccepted:productionAccepted,
      externalWasmProductionBundled:false,
      productionDeploymentVerified:false
    }
  };
}
