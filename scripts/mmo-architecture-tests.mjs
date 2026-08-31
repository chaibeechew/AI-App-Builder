import assert from "node:assert/strict";
import {buildMmoArchitecturePlan,evaluateMmoReadiness,MMO_ARCHITECTURE_V1} from "../lib/game/mmo-architecture-v1.js";
import {inferMobileGamePlan} from "../lib/ai/mobile-game-knowledge.js";

assert.equal(MMO_ARCHITECTURE_V1.liveTransport,false);assert.equal(MMO_ARCHITECTURE_V1.productionClaimAllowed,false);
for(const domain of ["authoritative-world-state","shards-instances","persistence","presence","guild-social","chat-moderation","economy-inventory","reconnect-recovery","anti-cheat-abuse","observability","live-ops","capacity-disaster-recovery"])assert.ok(MMO_ARCHITECTURE_V1.domains.includes(domain),`Missing MMO domain: ${domain}`);
const plan=buildMmoArchitecturePlan({expectedConcurrentPlayers:50000,worldStyle:"sharded"});assert.equal(plan.readiness,"architecture-ready");assert.equal(plan.liveTransport,false);assert.equal(plan.authority.serverTruth,true);assert.equal(plan.economy.serverOwned,true);assert.equal(plan.persistence.idempotentWrites,true);assert.equal(plan.social.moderationRequired,true);assert.equal(plan.recovery.sessionResume,true);assert.equal(plan.operations.backupRestoreTests,true);
const noLive=evaluateMmoReadiness(plan,{});assert.ok(noLive.score<100);assert.equal(noLive.passed,false);for(const missing of ["liveTransport","loadTest","failover","realDevices"])assert.ok(noLive.missing.includes(missing));
const proven=evaluateMmoReadiness(plan,{liveTransport:true,loadTest:true,failover:true,realDevices:true});assert.equal(proven.score,100);assert.equal(proven.passed,true);
const game=inferMobileGamePlan("做一个大型多人在线历史 SLG MMO 游戏");assert.equal(game.taxonomy.interactionScale,"mmo");assert.equal(game.mmoArchitecture?.readiness,"architecture-ready");assert.equal(game.mmoArchitecture?.liveTransport,false);assert.ok(game.systems.some(item=>/MMO ARCHITECTURE: persistence/i.test(item)));assert.ok(game.brief.includes("Never claim an MMO is live"));
console.log("✓ MMO Architecture covers authority, shards/instances, persistence, social/moderation, economy, recovery, security, observability and live ops while refusing live-production claims without runtime evidence");
