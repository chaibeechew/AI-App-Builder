import assert from "node:assert/strict";
import {GAME_TAXONOMY,inferGameTaxonomy} from "../lib/ai/game-taxonomy-knowledge.js";
import {inferMobileGamePlan} from "../lib/ai/mobile-game-knowledge.js";

for(const id of ["rpg","strategy","action","shooter","moba","racing","simulation","puzzle","card","rhythm","sports"]){
  assert.ok(GAME_TAXONOMY.gameplay.some(item=>item.id===id),`Missing gameplay taxonomy ${id}`);
}
for(const id of ["xianxia","wuxia","history","fantasy","science_fiction"]){
  assert.ok(GAME_TAXONOMY.themes.some(item=>item.id===id),`Missing theme taxonomy ${id}`);
}
for(const id of ["solo","multiplayer","mmo"]){
  assert.ok(GAME_TAXONOMY.interactionScales.some(item=>item.id===id),`Missing interaction scale ${id}`);
}

const offlineHybrid=inferGameTaxonomy("做一个单机仙侠 RPG，加模拟经营系统，不需要联网");
assert.equal(offlineHybrid.dimensions.network,"offline_single_player");
assert.equal(offlineHybrid.dimensions.interactionScale,"solo");
assert.ok(offlineHybrid.matchedGameplay.some(item=>item.id==="rpg"));
assert.ok(offlineHybrid.matchedGameplay.some(item=>item.id==="simulation"));
assert.ok(offlineHybrid.dimensions.theme.some(item=>item.id==="xianxia"));
assert.equal(offlineHybrid.dimensions.hybrid,true);
assert.equal(offlineHybrid.primaryGameplay,"rpg");

const onlineStrategy=inferGameTaxonomy("大型多人在线历史 SLG 策略 + 卡牌游戏");
assert.equal(onlineStrategy.dimensions.network,"online");
assert.equal(onlineStrategy.dimensions.interactionScale,"mmo");
assert.ok(onlineStrategy.matchedGameplay.some(item=>item.id==="strategy"));
assert.ok(onlineStrategy.matchedGameplay.some(item=>item.id==="card"));
assert.ok(onlineStrategy.dimensions.theme.some(item=>item.id==="history"));
assert.equal(onlineStrategy.dimensions.hybrid,true);
assert.ok(onlineStrategy.systems.some(item=>/authoritative shards\/instances/i.test(item)));

const shooter=inferGameTaxonomy("Online sci-fi TPS shooting game with co-op teams");
assert.equal(shooter.dimensions.network,"online");
assert.ok(shooter.matchedGameplay.some(item=>item.id==="shooter"));
assert.ok(shooter.dimensions.theme.some(item=>item.id==="science_fiction"));
assert.equal(shooter.dimensions.interactionScale,"small_multiplayer");

const plan=inferMobileGamePlan("做一个大型多人在线历史 SLG 策略 + 卡牌手机游戏");
assert.equal(plan.matched,true);
assert.equal(plan.multiplayer,true);
assert.equal(plan.taxonomy.network,"online");
assert.equal(plan.taxonomy.interactionScale,"mmo");
assert.equal(plan.hybridGameplay.hybrid,true);
assert.equal(plan.hybridGameplay.primary,"strategy");
assert.ok(plan.systems.some(item=>item.startsWith("TAXONOMY:")));
assert.match(plan.brief,/SOOLENAI MULTIDIMENSIONAL GAME TAXONOMY/);
assert.match(plan.brief,/Games may legitimately combine multiple genres/);
assert.match(plan.brief,/never claim an external service is connected until verified/i);

console.log("✓ SoolenAI classifies mobile games across network requirements, gameplay, theme/world, interaction scale and hybrid composition");
console.log("✓ RPG, SLG, ACT, shooter, MOBA, racing, simulation, puzzle, card, rhythm and sports taxonomies remain available");
console.log("✓ Hybrid games keep one dominant core loop while secondary genres become supporting systems");
console.log("✓ MMO/online classification adds server-readiness requirements without falsely claiming live multiplayer infrastructure");
