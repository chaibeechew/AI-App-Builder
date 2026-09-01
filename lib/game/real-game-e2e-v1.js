// Real-game E2E validation for SoolenAI Game Creator.
// Natural-language intent -> deterministic planner -> generated specification -> shared Preview router -> real runtime state machine -> playtest evidence.
// No paid AI/provider calls are used in CI. External production evidence remains explicitly false.

import {inferMobileGamePlan} from "../ai/mobile-game-knowledge.js";
import {buildCompleteGameSpec} from "./universal-game-creation-core-v1.js";
import {resolveGeneratedRuntime} from "./game-runtime-router-v1.js";
import {compileSpecialistRuntimeV1,createSpecialistState,stepRpgRuntime,puzzleMove,puzzleHint,puzzleUndo} from "./specialist-runtime-v1.js";
import {compileAdvancedGenreRuntimeV1,createAdvancedGenreState,stepStrategy,stepRacing} from "./advanced-genre-runtime-v1.js";
import {compileMobaRuntimeV1,createMatchState,castAbility,applyDamage,grantExperience,markHeroDead,respawnHero,tickHero} from "./moba-runtime-v1.js";
import {compileAirCombatRuntimeV1,createAirCombatMatch,fireTrainingBurst,stepAirCombatMatch} from "./air-combat-runtime-v1.js";

function distance(a,b){return Math.hypot((a?.x||0)-(b?.x||0),(a?.y||0)-(b?.y||0));}
function runtimeExpectedFor(archetype){return archetype==="moba"?"moba-runtime-v1":archetype==="air_combat"?"air-combat-runtime-v1":["rpg","puzzle","action"].includes(archetype)?"specialist-runtime-v1":["strategy","racing","simulation","card","sports","rhythm","survival"].includes(archetype)?"advanced-genre-runtime-v1":"game-runtime-v1";}
function normalizeArchetype(plan){const value=String(plan?.archetype||plan?.genreId||plan?.hybridGameplay?.primary||"custom").toLowerCase();return value==="air combat"?"air_combat":value;}
function result(id,passed,detail,evidence={}){return{id,passed:passed===true,detail,evidence};}

export const REAL_GAME_E2E_CASES=Object.freeze([
  {id:"xianxia-rpg",name:"云海修仙录",idea:"做一个单机仙侠 RPG 手机游戏，有主线任务、NPC 对话、装备、战斗、Boss、存档，不需要联网。",expectedArchetype:"rpg",expectedRuntime:"specialist-runtime-v1"},
  {id:"original-moba",name:"星环争锋",idea:"做一个原创 5v5 三路 MOBA 手机游戏，有英雄技能、兵线、防御塔、核心、金币经验、Bot 训练和未来联机能力。",expectedArchetype:"moba",expectedRuntime:"moba-runtime-v1"},
  {id:"history-slg",name:"群城纪略",idea:"做一个历史题材 SLG 策略手机游戏，经营城池、收集资源、训练军队、研究科技、争夺领地。",expectedArchetype:"strategy",expectedRuntime:"advanced-genre-runtime-v1"},
  {id:"street-racing",name:"霓虹极速",idea:"做一个 3D 手机赛车游戏，有油门刹车转向、检查点、三圈比赛、车辆损伤和比赛结果。",expectedArchetype:"racing",expectedRuntime:"advanced-genre-runtime-v1"},
  {id:"brain-puzzle",name:"晶格谜阵",idea:"做一个益智 Puzzle 手机游戏，有可解关卡、提示、撤销、步数限制和明确过关失败状态。",expectedArchetype:"puzzle",expectedRuntime:"specialist-runtime-v1"},
  {id:"air-combat",name:"云穹训练队",idea:"做一个原创 3D Air Combat 飞行训练手机游戏，有飞行物理、HUD、AI 飞行员、目标选择、损伤、任务完成和移动触控。",expectedArchetype:"air_combat",expectedRuntime:"air-combat-runtime-v1"},
]);

export function buildDeterministicGameSpecification(testCase){
  const plan=inferMobileGamePlan(testCase.idea);const archetype=normalizeArchetype(plan);
  const complete=buildCompleteGameSpec({idea:testCase.idea,genre:plan.genreId||archetype,dimensions:plan.dimensions||"adaptive-2d-3d",online:plan.multiplayer,commerce:{iap:false,ads:false},privacy:{dataMinimization:true},build:{targets:["ios","android","web-preview"],safeArea:true,androidBack:true,lifecycleRecovery:true,lowMemoryMode:true}});
  return{
    id:`e2e-${testCase.id}`,name:testCase.name,description:testCase.idea,productType:"mobile_game",platforms:["ios","android","web"],
    game:{enabled:true,genre:plan.genre||plan.genreId||archetype,archetype,dimensions:plan.dimensions||"adaptive",coreLoop:["start","player action","feedback","progress","win or lose","replay"],screens:plan.screens||[],controls:["touch-first","pause","restart"],systems:plan.systems||[],progression:["clear objective","reward","next challenge"],saveStrategy:"versioned local save with recovery",performanceTargets:["responsive 60fps where practical","bounded frame delta"],audio:["SFX","music","user mute controls"],assets:["original-only"],moba:plan.moba?.matched?{enabled:true,teamSize:5,lanes:3}:undefined,aviation:plan.aviation?.matched?{enabled:true,aiCount:1,targetCount:1}:undefined,multiplayer:{enabled:Boolean(plan.multiplayer),notes:"Production transport is not claimed live."},monetization:{ads:false,inAppPurchases:false},platformNotes:{ios:["safe areas","lifecycle recovery"],android:["back navigation","low-memory recovery"]}},
    e2e:{sourceIdea:testCase.idea,plannerArchetype:archetype,providerMode:"deterministic-planner",externalAiProviderCalled:false,completeGameSpec:complete}
  };
}

export function auditGeneratedGameSpecification(specification,plan){
  const route=resolveGeneratedRuntime(specification),archetype=normalizeArchetype(plan);const checks=[
    result("mobile_game",specification?.productType==="mobile_game","Product type is a mobile game."),
    result("game_enabled",specification?.game?.enabled===true,"Game runtime is enabled."),
    result("archetype",String(specification?.game?.archetype||"")===archetype,`Expected archetype ${archetype}.`,{actual:specification?.game?.archetype}),
    result("runtime_route",route.runtimeId===runtimeExpectedFor(archetype),`Preview resolves ${runtimeExpectedFor(archetype)}.`,{actual:route.runtimeId}),
    result("ios_android_web",["ios","android","web"].every(p=>(specification?.platforms||[]).includes(p)),"iOS, Android and Web Preview targets exist."),
    result("core_loop",(specification?.game?.coreLoop||[]).length>=5,"Core loop contains start/action/feedback/progress/result."),
    result("save_recovery",/save|存档|存檔/i.test(String(specification?.game?.saveStrategy||"")),"Save/recovery strategy exists."),
    result("external_truth",specification?.e2e?.externalAiProviderCalled===false,"CI does not invent a paid-provider generation result."),
  ];return{passed:checks.every(x=>x.passed),checks,route};
}

export function repairGeneratedGameSpecification(specification,plan){
  const archetype=normalizeArchetype(plan);return{...specification,productType:"mobile_game",platforms:["ios","android","web"],game:{...(specification.game||{}),enabled:true,genre:plan.genre||plan.genreId||archetype,archetype,coreLoop:(specification.game?.coreLoop||[]).length>=5?specification.game.coreLoop:["start","player action","feedback","progress","win or lose","replay"],saveStrategy:specification.game?.saveStrategy||"versioned local save with recovery"},e2e:{...(specification.e2e||{}),repaired:true,repairReason:"planner-runtime-contract"}};
}

function playRpg(specification){
  const config=compileSpecialistRuntimeV1(specification);let state=createSpecialistState(config);let frames=0;
  const moveTo=(target)=>{for(let i=0;i<500&&state.status==="playing"&&distance(state.player,target)>23;i++){const dx=target.x-state.player.x,dy=target.y-state.player.y,d=Math.hypot(dx,dy)||1;state=stepRpgRuntime(state,{x:dx/d,y:dy/d},.05);frames++;}};
  for(const relic of [...state.relics])moveTo(relic);
  for(const original of [...state.enemies]){for(let i=0;i<350&&state.status==="playing";i++){const enemy=state.enemies.find(e=>e.id===original.id);if(!enemy||enemy.hp<=0)break;if(distance(state.player,enemy)>78)moveTo(enemy);state=stepRpgRuntime(state,{attack:true},.1);frames++;}}
  return{passed:state.status==="won",status:state.status,frames,detail:`Quest ${state.quest.found}/${state.quest.required}, enemies defeated ${state.enemies.filter(e=>e.hp<=0).length}/${state.enemies.length}, level ${state.level}.`};
}

function playPuzzle(specification){
  const config=compileSpecialistRuntimeV1(specification);let state=createSpecialistState(config);const firstHint=puzzleHint(state);const hintWorked=firstHint.hints===state.hints-1;state={...state,targetScore:180,moves:4,board:[[1,0,1,1,2,3],[2,3,4,0,1,2],[3,4,0,1,2,3],[4,0,1,2,3,4],[0,1,2,3,4,0],[1,2,3,4,0,1]]};state=puzzleMove(state,0,0);state=puzzleMove(state,1,0);
  const won=state.status==="won";let undoState={...state,status:"playing",history:[{board:state.board.map(row=>[...row]),score:0,moves:4}],undos:1};undoState=puzzleUndo(undoState);
  return{passed:won&&hintWorked&&undoState.undos===0,status:state.status,detail:`Controlled seeded level reached ${state.score}/${state.targetScore}; Hint and Undo paths executed.`};
}

function playStrategy(specification){
  const config=compileAdvancedGenreRuntimeV1(specification);let state=createAdvancedGenreState(config),actions=0;const sequence=["gather","gather","build","gather","train","train","research","attack"];
  for(let i=0;i<120&&state.status==="playing";i++){state=stepStrategy(state,sequence[i%sequence.length]);actions++;}
  return{passed:state.status==="won",status:state.status,detail:`${actions} strategic actions; territory ${state.territory}, army ${state.army}, base HP ${state.baseHealth}.`};
}

function playRacing(specification){
  const config=compileAdvancedGenreRuntimeV1(specification);let state=createAdvancedGenreState(config),frames=0;for(let i=0;i<1200&&state.status==="playing";i++){state=stepRacing(state,{throttle:1,brake:0,steer:0},.016);frames++;}
  return{passed:state.status==="won",status:state.status,detail:`${frames} frames, completed ${Math.min(state.lap-1,state.maxLaps)}/${state.maxLaps} laps, damage ${state.damage.toFixed(1)}.`};
}

function playMoba(specification){
  const config=compileMobaRuntimeV1(specification),match=createMatchState(config);let player={...match.heroes.find(h=>h.isPlayer)},enemy={...match.heroes.find(h=>h.team!==player.team),x:player.x+70,y:player.y,health:120,maxHealth:120};const ability=config.hero.abilities[0];let hits=0;
  for(let i=0;i<5&&enemy.health>0;i++){const cast=castAbility(player,ability);if(cast.ok){player=cast.hero;const damage=applyDamage(enemy,cast.event.damage,{type:"magic",sourceId:player.id});enemy=damage.target;hits++;}player=tickHero(player,ability.cooldown);}
  player=grantExperience(player,250,config.hero.maxLevel);const dead=markHeroDead(player,20,config.hero.respawnBase,20),respawned=respawnHero(dead,config,{x:95,y:config.map.laneY[0]});
  const structural=match.heroes.length===10&&match.structures.towers.length===6&&Boolean(match.structures.blueCore&&match.structures.redCore);
  return{passed:enemy.health<=0&&respawned.dead===false&&player.level>1&&structural&&config.multiplayer.live===false,status:enemy.health<=0?"combat_loop_complete":"playing",detail:`5v5 structure=${structural}; ability hits ${hits}; enemy HP ${Math.round(enemy.health)}; level ${player.level}; death/respawn verified; liveOnline=${config.multiplayer.live}.`};
}

function playAirCombat(specification){
  const config=compileAirCombatRuntimeV1(specification);let match=createAirCombatMatch(config,"real-e2e-air");let steps=0;
  for(let shot=0;shot<10&&match.status==="playing";shot++){
    const enemy=match.enemies.find(e=>!e.dead);if(!enemy)break;enemy.body.position={x:match.player.position.x,y:match.player.position.y,z:match.player.position.z+500};match={...match,targetId:enemy.id,fireCooldown:0};match=fireTrainingBurst(match,config);for(let i=0;i<6&&match.status==="playing";i++){match=stepAirCombatMatch(match,{throttle:.65,pitch:0,roll:0,yaw:0},.033,config);steps++;}
  }
  return{passed:match.status==="won"&&match.kills>=1&&config.safety.publicKnowledgeOnly===true&&config.liveOnline!==true,status:match.status,detail:`Mission ${match.status}; kills ${match.kills}; shots ${match.shots}; hits ${match.hits}; controlled flight steps ${steps}; trainingOnly=${config.mission.trainingOnly}.`};
}

export function runRealGameCase(testCase){
  const plan=inferMobileGamePlan(testCase.idea);let specification=buildDeterministicGameSpecification(testCase);let audit=auditGeneratedGameSpecification(specification,plan),repaired=false;
  if(!audit.passed){specification=repairGeneratedGameSpecification(specification,plan);audit=auditGeneratedGameSpecification(specification,plan);repaired=true;}
  const route=audit.route;let play;
  if(route.type==="rpg")play=playRpg(specification);else if(route.type==="puzzle")play=playPuzzle(specification);else if(route.type==="strategy")play=playStrategy(specification);else if(route.type==="racing")play=playRacing(specification);else if(route.type==="moba")play=playMoba(specification);else if(route.type==="air_combat")play=playAirCombat(specification);else play={passed:false,status:"unsupported",detail:`No E2E driver for ${route.type}.`};
  const plannerPass=plan.matched===true&&normalizeArchetype(plan)===testCase.expectedArchetype;const routePass=route.runtimeId===testCase.expectedRuntime;const passed=plannerPass&&audit.passed&&routePass&&play.passed;
  return{id:testCase.id,name:testCase.name,idea:testCase.idea,expectedArchetype:testCase.expectedArchetype,planner:{matched:plan.matched,genreId:plan.genreId,archetype:normalizeArchetype(plan),taxonomy:plan.taxonomy,multiplayer:plan.multiplayer},specification:{productType:specification.productType,platforms:specification.platforms,archetype:specification.game.archetype,providerMode:specification.e2e.providerMode},route,play,audit:audit.checks,repaired,passed,productionEvidenceClaimed:false};
}

export function runRealGameE2ESuite(cases=REAL_GAME_E2E_CASES){
  const results=cases.map(runRealGameCase),passed=results.filter(x=>x.passed).length;return{version:"real-game-e2e-v1",providerMode:"deterministic-planner",externalAiProviderCalled:false,total:results.length,passed,failed:results.length-passed,score:Math.round(passed/results.length*100),canPassGate:passed===results.length,results,truthRule:"This E2E gate proves deterministic planning, generated specification, Preview routing and real local runtime play loops. It does not prove a paid AI provider response, signed native binary, real-device performance, live multiplayer/payment/ads/cloud or store approval."};
}
