import assert from "node:assert/strict";

process.env.SOOLEN_COST_MODE="zero";
process.env.SOOLEN_ZERO_COST_PROVIDERS="openai,gemini,soolen-local";
process.env.OPENAI_API_KEY="configured-but-must-not-run";
process.env.GEMINI_API_KEY="configured-but-must-not-run";
delete process.env.OLLAMA_BASE_URL;

const {generateWithFallback}=await import("../engine/ai-provider.js");
const {normalizeAppSpec}=await import("../lib/generator/runtime-guard.js");
const {selfTestGeneratedApp}=await import("../lib/generator/self-test.js");
const {verifyGeneratedAppExecution}=await import("../lib/generator/execution-verifier.js");
const {resolveGeneratedRuntime}=await import("../lib/game/game-runtime-router-v1.js");
const {compileGameRuntimeV1}=await import("../lib/game/runtime-v1.js");

function buildPrompt(idea){return `Build a real mobile-first app and customer website from the user's idea.\nUSER IDEA:\n"${idea}"\n\nVOICE INPUT:\n""\n\nREFERENCE IMAGE REFERENCES:\n[]`;}

const cases=[
  ["shooter","Create an original mobile FPS shooter game with touch controls, levels, bots, win/lose and progression","remaining-genre-runtime-v1"],
  ["racing","Create a mobile racing game with touch steering, checkpoints, upgrades and replay","advanced-genre-runtime-v1"],
  ["puzzle","Create a mobile puzzle game with levels, hints, score, save and restart","specialist-runtime-v1"],
  ["moba-zh","制作一个原创手机 MOBA 5v5 游戏，三路、英雄、机器人训练、触控操作和胜负流程","moba-runtime-v1"],
];

for(const[label,idea,expectedRuntime]of cases){
  const generated=await generateWithFallback(buildPrompt(idea),{providers:["openai","gemini","soolen-local"]});
  assert.equal(generated.provider,"soolen-local",`${label}: zero-cost Game generation must stay local`);
  assert.equal(generated.attempts,1,`${label}: blocked paid providers must not be attempted`);
  const raw=JSON.parse(generated.result);assert.equal(raw.productType,"mobile_game",`${label}: zero-cost provider must emit a Game specification, not a business App`);assert.equal(raw.game?.enabled,true);assert.ok(Array.isArray(raw.game?.coreLoop)&&raw.game.coreLoop.length>=5);assert.ok(Array.isArray(raw.pages)&&raw.pages.length>=5);assert.equal(raw.navigation?.length,raw.pages.length);assert.ok(raw.visualAssets?.some(item=>item.type==="game_character"));assert.ok(raw.visualAssets?.some(item=>item.type==="game_environment"));
  const normalized=normalizeAppSpec(raw);const self=selfTestGeneratedApp(normalized);assert.equal(self.ok,true,`${label}: generated Game failed self-test: ${(self.errors||[]).join("; ")}`);const execution=verifyGeneratedAppExecution(self.normalizedSpec);assert.equal(execution.ok,true,`${label}: generated Game failed execution verification: ${(execution.errors||[]).join("; ")}`);
  const route=resolveGeneratedRuntime(execution.normalizedSpec);assert.equal(route.isGame,true);assert.equal(route.runtimeId,expectedRuntime,`${label}: generated Game routed to the wrong playable runtime`);
  const runtime=compileGameRuntimeV1(execution.normalizedSpec);assert.equal(runtime.playable,true);assert.equal(runtime.productType,"mobile_game");assert.ok(runtime.platforms.includes("ios")&&runtime.platforms.includes("android")&&runtime.platforms.includes("web-preview"));assert.equal(runtime.controls.touch,true);assert.equal(runtime.lifecycle.pauseOnVisibilityChange,true);assert.equal(runtime.performance.boundedDelta,true);
}

console.log("✓ Dynamic zero-cost Game E2E generates verified mobile_game specifications and routes them into playable runtime families");
console.log("✓ Shooter, Racing, Puzzle and Chinese MOBA cover remaining/advanced/specialist/MOBA routing without paid-provider attempts");
console.log("✓ Generated Game runtime preserves iOS + Android + web preview, touch controls, lifecycle recovery and bounded performance");
console.log("✓ This is deterministic code/runtime evidence; authenticated Production generated-project and real-device evidence remain separately LIVE PENDING");
