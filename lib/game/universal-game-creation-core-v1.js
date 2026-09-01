// SoolenAI Universal Game Creation Core V1.
// Cross-genre production contracts shared by every generated game.
// External providers, native-device measurements, payments, ads and store release remain evidence-gated.

function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
function text(v){return String(v??"").trim();}
function cleanId(v){return text(v).replace(/[^a-zA-Z0-9_.:-]/g,"_").slice(0,160);}
function unique(list){return [...new Set(list)];}

export const UNIVERSAL_GAME_CREATION_DOMAINS=Object.freeze([
  {id:"design",label:"Game Design & Product Spec",capabilities:["core-loop","game-pillars","player-goals","onboarding","difficulty","session-design","retention-without-dark-patterns","failure-recovery"]},
  {id:"controls",label:"Input & Controls",capabilities:["touch","gesture","virtual-stick","keyboard-preview","gamepad-readiness","remapping","dead-zone","pointer-cancel","orientation","haptics"]},
  {id:"accessibility",label:"Accessibility",capabilities:["large-touch-targets","high-contrast","reduced-motion","subtitles","captions","color-independent-feedback","audio-independent-feedback","text-scale","control-assists","difficulty-assists"]},
  {id:"presentation",label:"Camera, HUD & UX",capabilities:["safe-area","camera-rig","camera-shake-budget","hud-priority","minimap-readiness","tutorial-overlay","pause-resume","error-recovery","loading-state","empty-state"]},
  {id:"audio",label:"Audio & Music",capabilities:["sfx-bus","music-bus","voice-bus","ducking","spatial-audio-readiness","latency-calibration","interruption-recovery","mute-controls","copyright-safe-assets","subtitle-sync"]},
  {id:"gameplay",label:"Gameplay Runtime",capabilities:["state-machine","physics","collision","combat","progression","save","checkpoint","rng-seed","win-lose","replayability","lifecycle-recovery"]},
  {id:"world",label:"World & Content",capabilities:["2d-world","3d-world","streaming","procedural-generation","nav","quests","dialogue","npc","weather","day-night","dungeon","settlement","destruction","vehicles"]},
  {id:"ai",label:"Game AI",capabilities:["enemy-ai","boss-ai","behavior-tree","group-ai","npc-director","pathfinding","difficulty-ai","balancing-ai","automated-playtest","bounded-autonomy"]},
  {id:"rendering",label:"Rendering & Asset Pipeline",capabilities:["asset-import","animation","ik","ragdoll","vfx","materials","lighting","terrain","lod-hlod","occlusion","gpu-instancing","texture-budget","shader-budget"]},
  {id:"data",label:"Game Data & Persistence",capabilities:["schema-versioning","local-save","cloud-save-contract","migration","rollback","inventory","economy","loot","crafting","player-profile","conflict-resolution"]},
  {id:"online",label:"Online & Social",capabilities:["authoritative-contract","matchmaking-contract","reconnect","resync","party","guild","chat-moderation","leaderboard","achievement","spectator","presence","anti-cheat-boundary"]},
  {id:"commerce",label:"Commerce & Monetization Readiness",capabilities:["iap-catalog","receipt-verification-contract","restore-purchases","virtual-currency-ledger","battle-pass-plan","rewarded-ad-placement","interstitial-safety","consent-gate","parental-purchase-safeguard","no-pay-to-win-default"]},
  {id:"liveops",label:"Live Ops & Analytics",capabilities:["event-schema","privacy-minimized-telemetry","funnel","retention","economy-health","season-plan","live-event-plan","feature-flag-contract","rollback-plan","crash-fingerprint","observability"]},
  {id:"platform",label:"Cross-platform & Native Readiness",capabilities:["ios","android","web-preview","safe-area","android-back","permissions","background-foreground","low-memory","thermal-budget","battery-budget","native-device-test-harness"]},
  {id:"publishing",label:"Build, Packaging & Store Readiness",capabilities:["bundle-identifiers","icons","screenshots","privacy-declarations","age-rating","signing-readiness","store-metadata","release-notes","versioning","rollback-build","submission-checklist"]},
  {id:"safety",label:"Privacy, Safety & Compliance",capabilities:["data-minimization","permission-purpose","age-aware-design","parental-controls-readiness","chat-safety","ugc-moderation","report-block","privacy-policy-readiness","consent-record","delete-export-account-data-contract"]},
  {id:"qa",label:"QA, Reliability & Performance",capabilities:["unit-contracts","runtime-contracts","fuzz","soft-lock","loop-detection","mutation-testing","coverage-gap","memory-analysis","desync","replay-divergence","performance-regression","crash-analysis","device-matrix"]},
  {id:"autonomy",label:"Autonomous Development",capabilities:["test-route-generation","minimal-repro","root-cause-isolation","regression-synthesis","candidate-patch","commit-bisect-readiness","dependency-impact","change-risk","review-gated-fix","release-blocker"]}
]);

export const UNIVERSAL_GAME_CREATION_CORE=Object.freeze({
  version:"universal-game-creation-core-v1",
  domains:UNIVERSAL_GAME_CREATION_DOMAINS,
  internalCapabilityCount:UNIVERSAL_GAME_CREATION_DOMAINS.reduce((n,d)=>n+d.capabilities.length,0),
  providerNeutral:true,
  productionAutoPatch:false,
  paidProviderRequired:false,
  nativeBinaryVerified:false,
  realDeviceVerified:false,
  liveCommerceVerified:false,
  liveAdsVerified:false,
  storeSubmissionVerified:false
});

export function inferUniversalGameCreationPlan(idea=""){
  const s=text(idea).toLowerCase();
  const requested=[];
  const match=(id,re)=>{if(re.test(s))requested.push(id);};
  match("controls",/control|input|touch|gesture|gamepad|手柄|触控|觸控|操作/);
  match("accessibility",/accessib|reduced motion|contrast|subtitle|color.?blind|无障碍|無障礙|字幕|色盲/);
  match("audio",/audio|music|sound|voice|spatial|音乐|音樂|声音|聲音|语音|語音/);
  match("commerce",/iap|purchase|battle pass|ads?|rewarded|充值|内购|內購|广告|廣告|通行证|通行證/);
  match("online",/online|multiplayer|pvp|co.?op|guild|leaderboard|多人|联网|聯網|公会|公會|排行榜/);
  match("liveops",/season|live event|analytics|telemetry|赛季|賽季|活动|活動|分析/);
  match("publishing",/app store|google play|store|publish|release|上架|发布|發布/);
  match("safety",/privacy|parental|child|teen|moderation|ugc|隐私|隱私|家长|家長|未成年|审核|審核/);
  match("autonomy",/autonomous|qa agent|root cause|bisect|candidate patch|自动测试|自動測試|根因|二分|候选补丁|候選補丁/);
  return{
    matched:true,
    requested:unique(requested),
    domains:UNIVERSAL_GAME_CREATION_DOMAINS,
    internalCapabilityCount:UNIVERSAL_GAME_CREATION_CORE.internalCapabilityCount,
    systems:[
      "Every generated game inherits a complete cross-genre production baseline covering controls, accessibility, presentation, audio, data, platform lifecycle, QA and recovery.",
      "Commerce, ads, multiplayer, cloud, store and native-device features use provider-neutral contracts and must remain disconnected/unverified until external evidence exists.",
      "All gameplay randomness used by tests or procedural systems must support reproducible seeds or equivalent deterministic evidence.",
      "Mobile budgets must explicitly bound frame delta, entity counts, memory, textures, particles, audio voices, network queues and background recovery behavior.",
      "Every release candidate must preserve a rollback path, regression evidence and unresolved blocker list rather than converting requested features directly into a 100 score."
    ],
    truthRule:"Universal Game Creation Core proves internal planning/runtime/tooling contracts. It does not prove signed native binaries, live payments/ads/cloud/multiplayer, measured devices or store approval."
  };
}

export function validateInputProfile(profile={}){
  const touchTargets=clamp(profile.touchTargetPx??44,24,96),deadZone=clamp(profile.deadZone??.12,0,.8),supportsPointerCancel=profile.pointerCancel!==false;
  const actions=unique((profile.actions||[]).map(a=>cleanId(typeof a==="string"?a:a.id)).filter(Boolean));
  const errors=[];if(touchTargets<44)errors.push("touch_target_below_44px");if(!supportsPointerCancel)errors.push("pointer_cancel_missing");if(!actions.length)errors.push("actions_missing");
  return{valid:errors.length===0,touchTargetPx:touchTargets,deadZone,actions,supportsPointerCancel:!!supportsPointerCancel,remapping:profile.remapping!==false,errors};
}

export function validateAccessibilityProfile(profile={}){
  const required=["highContrast","reducedMotion","subtitles","nonColorFeedback","nonAudioFeedback"];
  const missing=required.filter(key=>profile[key]!==true);
  return{valid:missing.length===0,missing,textScale:clamp(profile.textScale??1,.8,2),controlAssist:profile.controlAssist!==false,difficultyAssist:profile.difficultyAssist!==false};
}

export function validateAudioProfile(profile={}){
  const buses=unique((profile.buses||["sfx","music","voice"]).map(cleanId));
  const errors=[];if(!buses.includes("sfx"))errors.push("sfx_bus_missing");if(!buses.includes("music"))errors.push("music_bus_missing");if(profile.forcedAutoplay===true)errors.push("forced_autoplay_disallowed");
  return{valid:errors.length===0,buses,maxVoices:Math.floor(clamp(profile.maxVoices??32,4,128)),interruptionRecovery:profile.interruptionRecovery!==false,userMuteControls:profile.userMuteControls!==false,errors};
}

export function validateCommerceReadiness(config={}){
  const wantsIap=config.iap===true,wantsAds=config.ads===true;
  const safeguards={receiptVerificationContract:config.receiptVerificationContract===true,restorePurchases:config.restorePurchases===true,parentalPurchaseSafeguard:config.parentalPurchaseSafeguard===true,consentGate:config.consentGate===true};
  const missing=[];if(wantsIap&&!safeguards.receiptVerificationContract)missing.push("receipt_verification_contract");if(wantsIap&&!safeguards.restorePurchases)missing.push("restore_purchases");if((wantsIap||wantsAds)&&!safeguards.parentalPurchaseSafeguard)missing.push("parental_purchase_safeguard");if(wantsAds&&!safeguards.consentGate)missing.push("ad_consent_gate");
  return{readyForProviderIntegration:missing.length===0,wantsIap,wantsAds,safeguards,missing,providerConnected:false,transactionsVerified:false,adNetworkConnected:false};
}

export function validatePrivacyCompliance(config={}){
  const permissions=unique((config.permissions||[]).map(cleanId));const purposes=config.permissionPurposes||{};const missingPurposes=permissions.filter(p=>!text(purposes[p]));
  const childAudience=config.childAudience===true,missing=[];if(missingPurposes.length)missing.push("permission_purpose_missing");if(childAudience&&config.parentalControlsReadiness!==true)missing.push("parental_controls_readiness");if(config.ugc===true&&config.moderation!==true)missing.push("ugc_moderation");if(config.chat===true&&config.reportBlock!==true)missing.push("chat_report_block");
  return{valid:missing.length===0,permissions,missingPurposes,missing,dataMinimization:config.dataMinimization!==false,accountDeleteExportContract:config.accountDeleteExportContract===true,legalReviewVerified:false};
}

export function validateCrossPlatformBuild(profile={}){
  const targets=unique((profile.targets||["ios","android","web-preview"]).map(cleanId));const required=["ios","android","web-preview"],missing=required.filter(t=>!targets.includes(t));
  return{valid:missing.length===0,targets,missing,safeArea:profile.safeArea!==false,androidBack:profile.androidBack!==false,lifecycleRecovery:profile.lifecycleRecovery!==false,lowMemoryMode:profile.lowMemoryMode!==false,nativeBinaryVerified:false,storeSubmissionVerified:false};
}

export function createNativeDeviceTestHarness(config={}){
  const scenarios=unique((config.scenarios||["cold-start","background-resume","orientation","audio-interruption","permission-denial","low-memory","thermal-session","offline-reconnect"]).map(cleanId));
  return{scenarios,metrics:["fps","frame_ms_p95","memory_mb","battery_delta","thermal_state","crash_count"],iosMeasured:false,androidMeasured:false,syntheticPlanOnly:true,passCriteria:{crashCount:0,stuckInput:false,stateRecovery:true}};
}

export function validateTelemetryLiveOps(config={}){
  const events=unique((config.events||[]).map(e=>cleanId(typeof e==="string"?e:e.id)).filter(Boolean));const forbidden=events.filter(e=>/password|secret|raw_token|full_message/i.test(e));
  return{valid:forbidden.length===0,events,forbidden,anonymousByDefault:config.anonymousByDefault!==false,featureFlagContract:config.featureFlagContract===true,rollbackPlan:config.rollbackPlan===true,productionTelemetryConnected:false};
}

export function buildPublishingReadiness(config={}){
  const checklist=["bundle_id","app_icon","screenshots","privacy_declaration","age_rating","store_metadata","version","release_notes","signing_readiness","rollback_build"];
  const evidence=config.evidence||{};const passed=checklist.filter(k=>evidence[k]===true),missing=checklist.filter(k=>evidence[k]!==true);
  return{score:Math.round(passed.length/checklist.length*100),passed,missing,submissionVerified:false,approvalVerified:false,canClaimStoreReady:missing.length===0&&config.signingEvidence===true,canClaimPublished:false};
}

export function buildCompleteGameSpec({idea="",genre="custom",dimensions="adaptive-2d-3d",online=false,commerce={},privacy={},build={}}={}){
  const universal=inferUniversalGameCreationPlan(idea),commerceReadiness=validateCommerceReadiness(commerce),privacyCompliance=validatePrivacyCompliance(privacy),crossPlatform=validateCrossPlatformBuild(build),deviceHarness=createNativeDeviceTestHarness();
  return{version:"complete-game-spec-v1",idea:text(idea),genre:cleanId(genre),dimensions:cleanId(dimensions),online:!!online,domains:universal.domains.map(d=>({id:d.id,label:d.label,capabilities:[...d.capabilities]})),commerceReadiness,privacyCompliance,crossPlatform,deviceHarness,productionEvidence:{liveNetworking:false,liveCommerce:false,liveAds:false,realIos:false,realAndroid:false,storeApproval:false},truthRule:universal.truthRule};
}

export function auditUniversalCapabilityCoverage(evidence={}){
  const domainRows=UNIVERSAL_GAME_CREATION_DOMAINS.map(domain=>({id:domain.id,label:domain.label,implemented:evidence[domain.id]===true,capabilityCount:domain.capabilities.length}));
  const passed=domainRows.filter(x=>x.implemented),missing=domainRows.filter(x=>!x.implemented);return{score:Math.round(passed.length/domainRows.length*100),passed:passed.map(x=>x.id),missing:missing.map(x=>x.id),domains:domainRows,canClaimInternalComplete:missing.length===0,canClaimProductionComplete:false};
}
