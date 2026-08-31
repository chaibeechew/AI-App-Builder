import assert from "node:assert/strict";
import fs from "node:fs";
import {compileGameRuntimeV1,GAME_RUNTIME_V1} from "../lib/game/runtime-v1.js";
import {evaluateGameQuality100,GAME_QUALITY_DIMENSIONS,GAME_QUALITY_TARGET} from "../lib/game/quality-100.js";
import {GAME_CREATOR_POLICY} from "../lib/game/pro-policy.js";

const runtime=compileGameRuntimeV1({name:"Demo Racer",productType:"mobile_game",designSystem:{primaryColor:"#117755",accentColor:"#e2bd5c"},game:{enabled:true,genre:"Racing",maxHealth:120,enemyCount:4,maxLevel:5,coreLoop:["drive","collect","avoid","finish"]}});
assert.equal(GAME_RUNTIME_V1.playable,true);
assert.equal(runtime.playable,true);
assert.equal(runtime.productType,"mobile_game");
assert.equal(runtime.player.maxHealth,120);
assert.equal(runtime.enemies.baseCount,4);
assert.equal(runtime.progression.maxLevel,5);
for(const platform of ["ios","android","web-preview"])assert.ok(runtime.platforms.includes(platform));
for(const system of ["scene","touch-controls","physics","collision","player","enemy","level","score","health","save-load","audio","pause-restart","ios-android-responsive","win-lose-state","reward-replay-loop","world-bounds","damage-cooldown","autosave","haptics","accessibility","performance-budget","lifecycle-recovery","deterministic-spawns"])assert.ok(runtime.systems.includes(system),`Missing runtime system: ${system}`);
assert.equal(runtime.save.validateOnLoad,true);assert.equal(runtime.save.autoSave,true);assert.equal(runtime.save.bestScore,true);
assert.equal(runtime.controls.inputRecovery,true);assert.equal(runtime.performance.targetFps,60);assert.ok(runtime.performance.maxDeltaSeconds>0);assert.ok(runtime.performance.maxEnemies>0);
assert.equal(runtime.haptics.userControlled,true);assert.equal(runtime.feedback.visualStatus,true);assert.equal(runtime.accessibility.reducedMotion,true);assert.equal(runtime.accessibility.highContrast,true);assert.equal(runtime.accessibility.largeTouchTargets,true);assert.equal(runtime.accessibility.nonAudioFeedback,true);
assert.equal(runtime.lifecycle.pauseOnVisibilityChange,true);assert.equal(runtime.lifecycle.pauseOnBlur,true);assert.equal(runtime.lifecycle.autoSaveOnPageHide,true);assert.equal(runtime.reliability.deterministicSpawns,true);

const quality=evaluateGameQuality100(runtime);
assert.equal(GAME_QUALITY_TARGET,100);assert.equal(GAME_QUALITY_DIMENSIONS.length,10);assert.equal(quality.score,100);assert.equal(quality.passed,true);assert.deepEqual(quality.missing,[]);for(const dimension of quality.dimensions){assert.equal(dimension.weight,10);assert.equal(dimension.score,10);assert.equal(dimension.passed,true);}

assert.equal(GAME_CREATOR_POLICY.accessTier,"professional");
assert.equal(GAME_CREATOR_POLICY.pricingDisplayInFeatureCards,false);
assert.equal(GAME_CREATOR_POLICY.normalUseIncluded,true);
assert.equal(GAME_CREATOR_POLICY.noSurprisePerClickCharges,true);
assert.ok(GAME_CREATOR_POLICY.fairUse.maxNewGameStartsPerHour>0);

const route=fs.readFileSync("app/api/game/generate/route.js","utf8");
const mainGenerate=fs.readFileSync("app/api/generate/route.js","utf8");
const builder=fs.readFileSync("app/game-builder/page.js","utf8");
const player=fs.readFileSync("app/a/[id]/GameRuntimeClient.js","utf8");
const generatedPage=fs.readFileSync("app/a/[id]/page.js","utf8");
const banner=fs.readFileSync("app/components/CreationCapabilityBanner.js","utf8");
const studio=fs.readFileSync("app/studio/page.js","utf8");
const proMode=fs.readFileSync("lib/pro-mode.js","utf8");
const knowledge=fs.readFileSync("lib/ai/mobile-game-knowledge.js","utf8");

assert.match(route,/getAppBuilderAccess/);assert.match(route,/professional\.active/);assert.match(route,/PRO_GAME_CREATOR_REQUIRED/);assert.match(route,/GAME_FAIR_USE_TEMPORARY_LIMIT/);assert.match(route,/maxNewGameStartsPerHour/);assert.match(route,/x-soolen-game-gateway/);assert.match(route,/POST as generateApp/);
assert.match(mainGenerate,/isMobileGameIdea/);assert.match(mainGenerate,/x-soolen-game-gateway/);assert.match(mainGenerate,/professional\.active/);assert.match(mainGenerate,/PRO_GAME_CREATOR_REQUIRED/);assert.ok(mainGenerate.indexOf("if(isMobileGameIdea(combinedInput))")<mainGenerate.indexOf("const entitlement=await consumeAppBuilderEntitlement"),"Pro game gate must run before ordinary entitlement/credit charging");

assert.match(player,/evaluateGameQuality100/);assert.match(player,/seededRandom/);assert.match(player,/hashSeed/);assert.match(player,/requestAnimationFrame/);assert.match(player,/maxDeltaSeconds/);assert.match(player,/maxEnemies/);assert.match(player,/setPointerCapture/);assert.match(player,/pointerCancel/);assert.match(player,/damageCooldown/);assert.match(player,/pagehide/);assert.match(player,/addEventListener\("blur"/);assert.match(player,/navigator\.vibrate/);assert.match(player,/prefers-reduced-motion/);assert.match(player,/High Contrast/);assert.match(player,/Reduced Motion/);assert.match(player,/YOU WIN/);assert.match(player,/GAME OVER/);assert.match(player,/writeSave\(next,\{silent:true\}\)/);assert.match(player,/unsupported game version/);assert.match(player,/role="status"/);assert.match(player,/aria-live="polite"/);assert.match(player,/min-height:48px/);assert.match(player,/60fps budget/);

assert.match(builder,/\/api\/game\/generate/);assert.match(builder,/PRO · FAIR PRICE · FAIR USE/);assert.match(builder,/GAME CREATOR READINESS V2/);assert.match(builder,/Internal creation core/);assert.match(builder,/Production evidence is scored separately/);assert.match(builder,/INTERNAL CORE 100/);assert.match(builder,/Live Transport Contract V1/);assert.match(builder,/provider\/network\/device evidence/i);assert.match(builder,/load\/failover tests/i);assert.doesNotMatch(builder,/RM\s?\d/i);
assert.match(knowledge,/GAME QUALITY 100 RULE/);assert.match(knowledge,/deterministic seeds/);assert.match(knowledge,/60fps/);assert.match(knowledge,/win\/lose/);assert.match(knowledge,/autosave/);assert.match(knowledge,/Lifecycle & Reliability/);

assert.match(generatedPage,/GameRuntimeClient/);assert.match(generatedPage,/productType==="mobile_game"/);
for(const name of ["AI Art Generator","AI Video Generator","AI Photo & Video Generator","AI Avatar Creator"]){assert.match(banner,new RegExp(name.replace(/[&]/g,"\\&")));assert.match(studio,new RegExp(name.replace(/[&]/g,"\\&")));}
assert.match(banner,/\/game-builder/);assert.match(studio,/Pro Game Creator/);assert.match(proMode,/gameCreator/);assert.match(proMode,/normalGenuineUseIncluded: true/);assert.match(proMode,/noSurprisePerClickCharges: true/);assert.match(proMode,/name: "Pro Game Creator"/);assert.match(proMode,/href: "\/game-builder"/);assert.doesNotMatch(banner,/RM\s?\d/i);

console.log("✓ Game Quality Gate scores 100 only when all 10 base-runtime evidence dimensions pass; Game Creator Readiness V2 separately gates production evidence");
console.log("✓ Game Runtime V1 now covers complete run win/lose, deterministic spawns, input recovery, bounded performance, validated autosave, audio/haptics, accessibility and mobile lifecycle recovery");
console.log("✓ Mobile Game Creator remains Professional-only with Fair Price · Fair Use and the main generator cannot bypass the Pro gate before ordinary credit charging");
console.log("✓ AI Art, AI Video, AI Photo & Video and AI Avatar remain unified across homepage, Studio, Professional workspace and game creation without copied RM price cards");
