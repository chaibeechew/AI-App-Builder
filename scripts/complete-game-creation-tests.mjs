import assert from "node:assert/strict";
import fs from "node:fs";
import {
  UNIVERSAL_GAME_CREATION_CORE,UNIVERSAL_GAME_CREATION_DOMAINS,inferUniversalGameCreationPlan,
  validateInputProfile,validateAccessibilityProfile,validateAudioProfile,validateCommerceReadiness,
  validatePrivacyCompliance,validateCrossPlatformBuild,createNativeDeviceTestHarness,validateTelemetryLiveOps,
  buildPublishingReadiness,buildCompleteGameSpec,auditUniversalCapabilityCoverage
} from "../lib/game/universal-game-creation-core-v1.js";
import {
  REPOSITORY_AWARE_GAME_AGENT_V5,inferRepositoryAwareCapabilities,normalizeRepositoryEvidence,
  analyzeDependencyImpact,predictChangeRisk,buildRegressionPlan,compareCommitPerformance,
  buildCandidateDiffPreview,buildPullRequestGatePlan,auditRepositoryAwareChange
} from "../lib/game/repository-aware-game-development-agent-v5.js";
import {inferMobileGamePlan} from "../lib/ai/mobile-game-knowledge.js";
import {currentGameCreatorEvidence,GAME_CREATOR_READINESS_AREAS} from "../lib/game/game-creator-readiness-v2.js";

const ok=(name,fn)=>{fn();console.log(`✓ ${name}`);};

ok("Universal Game Creation Core covers the complete shared cross-genre production baseline",()=>{
  assert.equal(UNIVERSAL_GAME_CREATION_DOMAINS.length,18);
  assert.ok(UNIVERSAL_GAME_CREATION_CORE.internalCapabilityCount>=150);
  const ids=UNIVERSAL_GAME_CREATION_DOMAINS.map(d=>d.id);
  for(const id of ["design","controls","accessibility","presentation","audio","gameplay","world","ai","rendering","data","online","commerce","liveops","platform","publishing","safety","qa","autonomy"])assert.ok(ids.includes(id));
  assert.equal(UNIVERSAL_GAME_CREATION_CORE.productionAutoPatch,false);
  assert.equal(UNIVERSAL_GAME_CREATION_CORE.realDeviceVerified,false);
  assert.equal(UNIVERSAL_GAME_CREATION_CORE.storeSubmissionVerified,false);
});

ok("Controls, accessibility and audio fail closed on weak mobile UX contracts",()=>{
  assert.equal(validateInputProfile({actions:["move"],touchTargetPx:48,pointerCancel:true}).valid,true);
  assert.equal(validateInputProfile({actions:["move"],touchTargetPx:32,pointerCancel:false}).valid,false);
  assert.equal(validateAccessibilityProfile({highContrast:true,reducedMotion:true,subtitles:true,nonColorFeedback:true,nonAudioFeedback:true}).valid,true);
  assert.equal(validateAccessibilityProfile({highContrast:true}).valid,false);
  assert.equal(validateAudioProfile({buses:["sfx","music"],forcedAutoplay:false}).valid,true);
  assert.equal(validateAudioProfile({buses:["sfx","music"],forcedAutoplay:true}).valid,false);
});

ok("Commerce, privacy, telemetry and publishing remain provider/evidence gated",()=>{
  const commerce=validateCommerceReadiness({iap:true,ads:true,receiptVerificationContract:true,restorePurchases:true,parentalPurchaseSafeguard:true,consentGate:true});
  assert.equal(commerce.readyForProviderIntegration,true);assert.equal(commerce.providerConnected,false);assert.equal(commerce.transactionsVerified,false);assert.equal(commerce.adNetworkConnected,false);
  assert.equal(validateCommerceReadiness({iap:true}).readyForProviderIntegration,false);
  const privacy=validatePrivacyCompliance({permissions:["camera"],permissionPurposes:{camera:"optional scan gameplay"},parentalControlsReadiness:true,ugc:true,moderation:true,chat:true,reportBlock:true});
  assert.equal(privacy.valid,true);assert.equal(privacy.legalReviewVerified,false);
  assert.equal(validatePrivacyCompliance({permissions:["camera"],permissionPurposes:{}}).valid,false);
  assert.equal(validateTelemetryLiveOps({events:["game_start","level_complete"],featureFlagContract:true,rollbackPlan:true}).valid,true);
  assert.equal(validateTelemetryLiveOps({events:["raw_token"]}).valid,false);
  const publishing=buildPublishingReadiness({evidence:{bundle_id:true,app_icon:true,screenshots:true,privacy_declaration:true,age_rating:true,store_metadata:true,version:true,release_notes:true,signing_readiness:false,rollback_build:true}});
  assert.equal(publishing.canClaimStoreReady,false);assert.equal(publishing.canClaimPublished,false);assert.equal(publishing.submissionVerified,false);
});

ok("Cross-platform and native-device plans distinguish internal readiness from measured device proof",()=>{
  const build=validateCrossPlatformBuild({targets:["ios","android","web-preview"],safeArea:true,androidBack:true,lifecycleRecovery:true,lowMemoryMode:true});
  assert.equal(build.valid,true);assert.equal(build.nativeBinaryVerified,false);assert.equal(build.storeSubmissionVerified,false);
  const harness=createNativeDeviceTestHarness();assert.equal(harness.iosMeasured,false);assert.equal(harness.androidMeasured,false);assert.equal(harness.syntheticPlanOnly,true);assert.ok(harness.scenarios.includes("thermal-session"));
  const spec=buildCompleteGameSpec({idea:"3D multiplayer RPG with IAP and UGC",genre:"rpg",dimensions:"3d-capable",online:true,commerce:{iap:true,ads:false,receiptVerificationContract:true,restorePurchases:true,parentalPurchaseSafeguard:true,consentGate:true},privacy:{permissions:[],parentalControlsReadiness:true,moderation:true,reportBlock:true},build:{targets:["ios","android","web-preview"]}});
  assert.equal(spec.productionEvidence.liveNetworking,false);assert.equal(spec.productionEvidence.realIos,false);assert.equal(spec.productionEvidence.storeApproval,false);
});

ok("Complete universal audit can prove internal matrix completeness without claiming production completeness",()=>{
  const evidence=Object.fromEntries(UNIVERSAL_GAME_CREATION_DOMAINS.map(d=>[d.id,true]));const audit=auditUniversalCapabilityCoverage(evidence);
  assert.equal(audit.score,100);assert.equal(audit.canClaimInternalComplete,true);assert.equal(audit.canClaimProductionComplete,false);
  const plan=inferUniversalGameCreationPlan("online game with accessibility, music, IAP, ads, privacy and store publishing");
  assert.ok(plan.requested.includes("accessibility"));assert.ok(plan.requested.includes("commerce"));assert.match(plan.truthRule,/does not prove signed native binaries/i);
});

ok("Repository-aware V5 computes impact, risk, regressions and review-only patch evidence",()=>{
  assert.equal(REPOSITORY_AWARE_GAME_AGENT_V5.repositoryWriteAuthority,false);assert.equal(REPOSITORY_AWARE_GAME_AGENT_V5.mergeAuthority,false);assert.equal(REPOSITORY_AWARE_GAME_AGENT_V5.productionDeployAuthority,false);
  assert.equal(inferRepositoryAwareCapabilities("analyze repository commit diff and dependency impact").matched,true);
  const evidence=normalizeRepositoryEvidence({changes:[{path:"lib/game/save.js",additions:80,deletions:20,domains:["save"]}],tests:[{id:"save-test",status:"passed",covers:["lib/game/save.js"]}],performance:[{commit:"a",metric:"frame_ms",value:14},{commit:"b",metric:"frame_ms",value:16}]});
  assert.equal(evidence.changes.length,1);
  const impact=analyzeDependencyImpact({changes:evidence.changes,graph:{"lib/game/save.js":["app/a/[id]/GameRuntimeClient.js","lib/game/game-creator-readiness-v2.js"]}});assert.ok(impact.blastRadius>=3);assert.ok(impact.critical.length>=1);
  const risk=predictChangeRisk({impact,changes:evidence.changes,tests:evidence.tests,migrations:true,performanceDeltaPercent:15});assert.ok(risk.score>35);assert.equal(risk.releaseReviewRequired,true);
  const regression=buildRegressionPlan({impact,tests:evidence.tests});assert.ok(regression.selectedTests.includes("save-migration-regression"));assert.equal(regression.productionPromotionAutomatic,false);
  const perf=compareCommitPerformance(evidence.performance);assert.equal(perf.comparisons.length,1);assert.equal(perf.comparisons[0].realDeviceEvidence,false);
  const patch=buildCandidateDiffPreview({files:["lib/game/save.js"],intent:"fix migration",rootCause:"schema boundary",regressionTests:regression.selectedTests});assert.equal(patch.applied,false);assert.equal(patch.merged,false);assert.equal(patch.requiresHumanApproval,true);
  const gates=buildPullRequestGatePlan({risk,regressionPlan:regression,domains:["save"]});assert.equal(gates.repositoryWriteAuthority,false);assert.equal(gates.blockProductionPromotion,true);
  const audit=auditRepositoryAwareChange({changes:evidence.changes,tests:evidence.tests,performance:evidence.performance,graph:{"lib/game/save.js":["app/a/[id]/GameRuntimeClient.js"]},migrations:true,domains:["save"]});assert.ok(audit.prGate.gates.includes("nextjs-build"));
});

ok("SoolenAI Mobile Game Planner automatically inherits Universal Core and Repository-aware V5 when relevant",()=>{
  const normal=inferMobileGamePlan("Create a 3D action RPG game for iPhone and Android");
  assert.equal(normal.matched,true);assert.ok(normal.universalGameCreation.internalCapabilityCount>=150);assert.equal(normal.completeGameSpec.crossPlatform.valid,true);assert.match(normal.brief,/UNIVERSAL GAME CREATION CORE/);
  const repo=inferMobileGamePlan("Create a game and analyze repository commit diff dependency impact before regression PR");
  assert.equal(repo.repositoryAware.matched,true);assert.match(repo.brief,/REPOSITORY-AWARE DEVELOPMENT V5/);
});

ok("Readiness and Complete Game Studio make the new complete-capability bar mandatory",()=>{
  const readiness=currentGameCreatorEvidence();assert.equal(readiness.internalCoreScore,100);assert.equal(readiness.canClaimInternal100,true);assert.equal(readiness.canClaimProduction100,false);
  for(const key of ["universalGameCreationCore","completeGameStudioWorkbench","repositoryAwareDevelopmentV5","completeCapabilityAudit"])assert.ok(GAME_CREATOR_READINESS_AREAS.internal.includes(key));
  for(const key of ["signedNativeBuildEvidence","liveCommerceProvider","liveAdsProvider","productionTelemetry","publicUgcInfrastructure"])assert.ok(GAME_CREATOR_READINESS_AREAS.production.includes(key));
  const studio=fs.readFileSync("app/game-creation-studio/page.js","utf8"),layout=fs.readFileSync("app/game-builder/layout.js","utf8");
  assert.match(studio,/COMPLETE GAME STUDIO/);assert.match(studio,/Repository-aware V5/);assert.match(studio,/Production truth boundary/);assert.match(studio,/game-autonomy-v4-lab/);assert.match(layout,/Complete Game Studio/);
});
