// Evidence-based Game Creator readiness. Internal capability and production evidence are deliberately separate.

const INTERNAL_AREAS=Object.freeze([
  "ideaUnderstanding","multidimensionalTaxonomy","mobileRuntime","genreSpecificRuntimes","rpgPuzzleAction","advancedGenres","remainingGenres","mobaTraining","aviationKnowledge","airCombat3d","authoritativeMultiplayer","liveTransportContract","multiplayerAdapterAbstraction","platformSystems","world3dSystems","selfCheckRecovery"
]);
const PRODUCTION_AREAS=Object.freeze([
  "liveTransport","matchmaking","networkLoadTests","regionalFailover","realDeviceIos","realDeviceAndroid","storeSubmissionEvidence"
]);
function bool(v){return v===true;}
function scoreKeys(keys,evidence){const passed=keys.filter(key=>bool(evidence[key]));return{score:Math.round(passed.length/keys.length*100),passed,missing:keys.filter(key=>!bool(evidence[key]))};}

export function evaluateGameCreatorReadiness({internalEvidence={},productionEvidence={}}={}){
  const internal=scoreKeys(INTERNAL_AREAS,internalEvidence),production=scoreKeys(PRODUCTION_AREAS,productionEvidence);
  const overall=Math.round(internal.score*.72+production.score*.28);
  return{
    overall,
    internalCoreScore:internal.score,
    productionEvidenceScore:production.score,
    internal,
    production,
    canClaimInternal100:internal.score===100,
    canClaimProduction100:internal.score===100&&production.score===100,
    blockers:[...internal.missing.map(key=>`internal:${key}`),...production.missing.map(key=>`production:${key}`)],
    truthRule:"A 100 internal Game Creator score proves the implemented creation/runtime/platform-system contract only. Production 100 additionally requires verified live networking, matchmaking, load/failover evidence, iOS/Android device evidence and store-release evidence."
  };
}

export function currentGameCreatorEvidence({liveTransport=false,matchmaking=false,networkLoadTests=false,regionalFailover=false,realDeviceIos=false,realDeviceAndroid=false,storeSubmissionEvidence=false}={}){
  return evaluateGameCreatorReadiness({
    internalEvidence:{ideaUnderstanding:true,multidimensionalTaxonomy:true,mobileRuntime:true,genreSpecificRuntimes:true,rpgPuzzleAction:true,advancedGenres:true,remainingGenres:true,mobaTraining:true,aviationKnowledge:true,airCombat3d:true,authoritativeMultiplayer:true,liveTransportContract:true,multiplayerAdapterAbstraction:true,platformSystems:true,world3dSystems:true,selfCheckRecovery:true},
    productionEvidence:{liveTransport,matchmaking,networkLoadTests,regionalFailover,realDeviceIos,realDeviceAndroid,storeSubmissionEvidence}
  });
}

export const GAME_CREATOR_READINESS_AREAS=Object.freeze({internal:[...INTERNAL_AREAS],production:[...PRODUCTION_AREAS]});
