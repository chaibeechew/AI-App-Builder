function score(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(100,Math.round(n))):0;}
export const GAME_CREATOR_DIMENSIONS=Object.freeze(["ideaUnderstanding","gameKnowledge","runtime2d","genreRuntime","mobile","moba","aviationKnowledge","airCombat3d","multiplayer","media","publishing"]);

export function evaluateGameCreatorReadiness(evidence={}){
  const dimensions={
    ideaUnderstanding:score(evidence.ideaUnderstanding??100),
    gameKnowledge:score(evidence.gameKnowledge??100),
    runtime2d:score(evidence.runtime2d??100),
    genreRuntime:score(evidence.genreRuntime??72),
    mobile:score(evidence.mobile??96),
    moba:score(evidence.moba??88),
    aviationKnowledge:score(evidence.aviationKnowledge??100),
    airCombat3d:score(evidence.airCombat3d??86),
    multiplayer:score(evidence.multiplayer??55),
    media:score(evidence.media??88),
    publishing:score(evidence.publishing??90),
  };
  const total=Math.round(Object.values(dimensions).reduce((sum,value)=>sum+value,0)/GAME_CREATOR_DIMENSIONS.length);
  const blockers=[];
  if(dimensions.genreRuntime<100)blockers.push("Dedicated runtime evidence is still missing for one or more major genres.");
  if(dimensions.mobile<100)blockers.push("Real-device iPhone/Android evidence is still required.");
  if(dimensions.moba<100)blockers.push("Advanced MOBA systems and real online match evidence are still incomplete.");
  if(dimensions.airCombat3d<100)blockers.push("Air Combat needs richer terrain/weather/landing/device evidence before production 100.");
  if(dimensions.multiplayer<100)blockers.push("Live transport, matchmaking, relay/region strategy and network/device evidence are required.");
  if(dimensions.media<100)blockers.push("Provider-backed game media generation must be verified end-to-end for production 100.");
  if(dimensions.publishing<100)blockers.push("Store submission/device certification remain external evidence.");
  return{score:total,dimensions,passed100:total===100&&Object.values(dimensions).every(value=>value===100),blockers};
}

export function currentGameCreatorEvidence(){return evaluateGameCreatorReadiness({ideaUnderstanding:100,gameKnowledge:100,runtime2d:100,genreRuntime:78,mobile:96,moba:90,aviationKnowledge:100,airCombat3d:88,multiplayer:58,media:88,publishing:90});}
