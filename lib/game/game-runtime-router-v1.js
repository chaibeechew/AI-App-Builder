// Shared generated-project runtime resolver used by Preview routing and real-game E2E tests.

const SPECIALIST_EVENTS=Object.freeze({rpg:"rpg_runtime_view",puzzle:"puzzle_runtime_view",action:"action_runtime_view"});
const ADVANCED_EVENTS=Object.freeze({strategy:"strategy_runtime_view",racing:"racing_runtime_view",simulation:"simulation_runtime_view",card:"card_runtime_view",sports:"sports_runtime_view",rhythm:"rhythm_runtime_view",survival:"survival_runtime_view"});
const REMAINING_EVENTS=Object.freeze({shooter:"shooter_runtime_view",platformer:"platformer_runtime_view",tower_defense:"tower_defense_runtime_view",idle:"idle_runtime_view",party:"party_runtime_view",educational:"educational_runtime_view"});

function inferAdvancedType(archetype,genre){
  const combined=`${archetype} ${genre}`;const rules=[
    ["strategy",/strategy|slg|tactics|策略|战略|戰略/],["racing",/racing|race|driving|赛车|賽車/],["simulation",/simulation|tycoon|\bsim\b|经营|經營/],
    ["card",/card|deck|卡牌/],["sports",/sports|football|basketball|soccer|体育|體育/],["rhythm",/rhythm|music game|节奏|節奏/],["survival",/survival|roguelike|roguelite|生存/]
  ];return rules.find(([,pattern])=>pattern.test(combined))?.[0]||"";
}
function inferRemainingType(archetype,genre){
  const combined=`${archetype} ${genre}`;const rules=[
    ["shooter",/shooter|shooting|fps|tps|stg|射击|射擊/],["platformer",/platform|runner|跑酷|平台跳跃|平台跳躍/],["tower_defense",/tower defense|td game|塔防/],
    ["idle",/idle|incremental|clicker|放置/],["party",/party|social|minigame|派对|派對/],["educational",/educational|learning|quiz|教育|学习|學習/]
  ];return rules.find(([,pattern])=>pattern.test(combined))?.[0]||"";
}

export function resolveGeneratedRuntime(specification={}){
  const isGame=specification?.productType==="mobile_game"||specification?.game?.enabled===true;
  if(!isGame)return{isGame:false,runtimeId:"generated-app",type:"app",eventName:"app_view",archetypeOverride:""};
  const archetype=String(specification?.game?.archetype||"").toLowerCase();
  const genre=String(specification?.game?.genre||"").toLowerCase();
  if(archetype==="moba"||genre.includes("moba"))return{isGame:true,runtimeId:"moba-runtime-v1",type:"moba",eventName:"moba_runtime_view",archetypeOverride:"moba"};
  if(archetype==="air_combat"||genre.includes("air combat")||genre.includes("flight"))return{isGame:true,runtimeId:"air-combat-runtime-v1",type:"air_combat",eventName:"air_combat_runtime_view",archetypeOverride:"air_combat"};
  const specialist=archetype==="rpg"||genre.includes("rpg")||genre.includes("role-playing")?"rpg":archetype==="puzzle"||genre.includes("puzzle")||genre.includes("brain")||genre.includes("益智")||genre.includes("智力")?"puzzle":archetype==="action"||genre.includes("action")?"action":"";
  if(specialist)return{isGame:true,runtimeId:"specialist-runtime-v1",type:specialist,eventName:SPECIALIST_EVENTS[specialist],archetypeOverride:specialist};
  const advanced=inferAdvancedType(archetype,genre);if(advanced)return{isGame:true,runtimeId:"advanced-genre-runtime-v1",type:advanced,eventName:ADVANCED_EVENTS[advanced],archetypeOverride:advanced};
  const remaining=inferRemainingType(archetype,genre);if(remaining)return{isGame:true,runtimeId:"remaining-genre-runtime-v1",type:remaining,eventName:REMAINING_EVENTS[remaining],archetypeOverride:remaining};
  return{isGame:true,runtimeId:"game-runtime-v1",type:"generic",eventName:"game_runtime_view",archetypeOverride:archetype||"custom"};
}

export const GENERATED_RUNTIME_EVENTS=Object.freeze({specialist:SPECIALIST_EVENTS,advanced:ADVANCED_EVENTS,remaining:REMAINING_EVENTS});
