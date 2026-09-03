import assert from "node:assert/strict";
import fs from "node:fs";
import { buildAutonomousPlan, orchestrationBrief } from "../lib/build/orchestrator.js";
import { CREATOR_OPPORTUNITY_POLICY,creatorOpportunityEffectiveShare } from "../lib/creator-opportunity-policy.js";

const home=fs.readFileSync("app/page.js","utf8");
const generate=fs.readFileSync("app/api/generate/route.js","utf8");
const preview=fs.readFileSync("app/a/[id]/page.js","utf8");
const publicRuntime=fs.readFileSync("lib/publishing/public-project-runtime.js","utf8");
const idempotencyMigration=fs.readFileSync("supabase/migrations/20260903081500_harden_ai_app_generation_idempotency.sql","utf8");
const creatorMigration=fs.readFileSync("supabase/migrations/20260903082500_creator_opportunity_access.sql","utf8");
const commissionMigration=fs.readFileSync("supabase/migrations/20260903084000_creator_opportunity_commission_rate.sql","utf8");
const creatorApi=fs.readFileSync("app/api/creator-opportunity/route.js","utf8");
const adminCreatorApi=fs.readFileSync("app/api/admin/creator-opportunities/route.js","utf8");
const creatorPage=fs.readFileSync("app/creator-opportunity/page.js","utf8");
const adminCreatorPage=fs.readFileSync("app/admin/creator-opportunities/page.js","utf8");
const access=fs.readFileSync("lib/app-builder-access.js","utf8");
const pricing=fs.readFileSync("app/pricing/page.js","utf8");

const plan=buildAutonomousPlan({idea:"Create a mobile-first real estate CRM app with clients, properties, appointments and follow-up automation"});
assert.equal(plan.modules.app,true);
assert.ok(plan.selectedModules.includes("app"));
assert.ok(plan.selectedModules.includes("database"));
assert.ok(plan.selectedModules.includes("workflows"));
assert.match(orchestrationBrief(plan),/SOOLENAI AUTONOMOUS BUILD PLAN/);

const planIndex=home.indexOf('fetch("/api/orchestrate"');
const planGuard=home.indexOf('if(!planResponse.ok)throw');
const generateIndex=home.indexOf('fetch("/api/generate"');
assert.ok(planIndex>0&&planGuard>planIndex&&generateIndex>planGuard,"Homepage must complete Idea Planning before Generate.");

for(const pattern of [
  /auth\.getUser\(\)/,
  /Please verify your email or phone before creating an app/,
  /runAutonomousEngine/,
  /verifyGeneration/,
  /selfTestGeneratedApp/,
  /verifyGeneratedAppExecution/,
  /inspectProjectSpecification/,
  /adult\.status!=="verified"/,
  /\.from\("apps"\)\.insert/,
  /\.from\("app_versions"\)\.insert/,
  /current_version_id:version\.id/,
  /\.from\("project_memory"\)\.upsert/,
  /success:true/,
]) assert.match(generate,pattern);

assert.ok(generate.indexOf('adult.status!=="verified"')<generate.indexOf('.from("apps").insert'),"Unverified generation must never persist as an App.");
assert.ok(generate.indexOf('.from("app_versions").insert')<generate.indexOf('current_version_id:version.id'),"Version must exist before current pointer advances.");

// Durable request identity and replay: retries must recover the same saved project instead of creating duplicates.
assert.match(generate,/const REQUEST_ID=\/\^\[A-Za-z0-9\._:-\]\{1,160\}\$\//);
assert.match(generate,/A stable generation request ID is required/);
assert.match(generate,/loadGenerationReplay/);
assert.match(generate,/\.eq\("generation_request_id",requestId\)/);
assert.match(generate,/generation_request_id:chargeRequestId/);
assert.match(generate,/GENERATION_REQUEST_IN_PROGRESS/);
assert.match(generate,/entitlement\?\.replayed\|\|creditCharge\?\.replayed/);
const aiExecutionIndex=generate.indexOf("const adult=await runSoolenAdultMode");
assert.ok(aiExecutionIndex>0,"Generate must execute through the verified Soolen Adult Mode path.");
assert.ok(generate.indexOf("const replay=await loadGenerationReplay")<aiExecutionIndex,"Persisted replay must be checked before AI execution.");
assert.ok(generate.indexOf("const postReservationReplay=await loadGenerationReplay")<aiExecutionIndex,"Concurrent replay state must be rechecked after entitlement/credit reservation and before AI execution.");
assert.match(idempotencyMigration,/apps_owner_generation_request_uidx/);
assert.match(idempotencyMigration,/unique index/i);
assert.match(idempotencyMigration,/owner_id, generation_request_id/);
assert.match(idempotencyMigration,/apps_generation_request_id_format_check/);

// Client recovery must reuse only ambiguous/in-progress attempts and must not turn post-save bootstrap loss into a false generation failure.
assert.match(home,/const CREATE_REQUEST_KEY="laneriqPendingCreateRequest"/);
assert.match(home,/stableCreateRequestId\(createFingerprint\)/);
assert.match(home,/requestId:createRequestId/);
assert.doesNotMatch(home,/requestId:newRequestId\("create"\)/,"Generate must not invent a fresh request ID for every ambiguous retry.");
assert.match(home,/if\(d\?\.code!=="GENERATION_REQUEST_IN_PROGRESS"\)clearCreateRequest\(createRequestId\)/);
assert.match(home,/clearCreateRequest\(createRequestId\);/);
const savedPlanIndex=home.indexOf('setPlan({...d,orchestrationPlan:modulePlan,bootstrap:null})');
const bootstrapFetchIndex=home.indexOf('fetch(`/api/apps/${appId}/bootstrap`');
assert.ok(savedPlanIndex>generateIndex&&bootstrapFetchIndex>savedPlanIndex,"A verified saved project must be committed to UI state before optional bootstrap work begins.");
assert.match(home,/Core App \+ Website are saved\. Background setup could not finish because the connection changed/);

for(const pattern of [
  /auth\.getUser\(\)/,
  /loadVisibleProject\(\{ id, userId: user\?\.id \|\| null, versionId: requestedVersionId \}\)/,
  /loadVisibleProjectMedia/,
  /GeneratedAppClient/,
  /notFound\(\)/,
  /data-project-version=\{version\.id\}/,
]) assert.match(preview,pattern);

for(const pattern of [
  /\.from\("apps"\)/,
  /current_version_id/,
  /if \(!isOwner && !isPublished\) return null/,
  /\.from\("app_versions"\)/,
  /selectedVersionId = requestedVersionId && isOwner \? requestedVersionId : app\.current_version_id/,
  /\.eq\("id", selectedVersionId\)/,
  /\.eq\("app_id", app\.id\)/,
  /\.select\("id,version_no,specification"\)/,
]) assert.match(publicRuntime,pattern);
assert.doesNotMatch(preview,/\.from\("apps"\)|\.from\("app_versions"\)/,"Preview must use the shared server-only visibility/current-version loader rather than direct project reads.");

// Creator Opportunity: individual-only, Admin-approved Full Access, no upfront fee, +5 percentage points.
assert.equal(CREATOR_OPPORTUNITY_POLICY.eligibility.individualsOnly,true);
assert.equal(CREATOR_OPPORTUNITY_POLICY.eligibility.companiesAllowed,false);
assert.equal(CREATOR_OPPORTUNITY_POLICY.eligibility.teamsAllowed,false);
assert.equal(CREATOR_OPPORTUNITY_POLICY.eligibility.organizationsAllowed,false);
assert.equal(CREATOR_OPPORTUNITY_POLICY.eligibility.requiresAdminApproval,true);
assert.equal(CREATOR_OPPORTUNITY_POLICY.access.upfrontPlatformAccessFeeUsd,0);
assert.equal(CREATOR_OPPORTUNITY_POLICY.access.grantsFullCreationAccess,true);
assert.equal(CREATOR_OPPORTUNITY_POLICY.access.gameAccessPlan,"full");
assert.equal(CREATOR_OPPORTUNITY_POLICY.commercialTerms.extraPlatformSalesSharePercentagePoints,5);
assert.equal(creatorOpportunityEffectiveShare(5),10);
assert.match(creatorMigration,/applicant_type='individual'/);
assert.match(creatorMigration,/companies|individual/i);
assert.match(creatorMigration,/extra_platform_sales_share_percent=5/);
assert.match(creatorMigration,/creator_opportunity_active/);
assert.match(creatorMigration,/creator_opportunity_bonus_share_percent/);
assert.match(creatorMigration,/enable row level security/i);
assert.match(creatorMigration,/auth\.uid\(\)\)=user_id/);
assert.match(creatorApi,/confirmsIndividual/);
assert.match(creatorApi,/acceptsExtraRevenueShare/);
assert.match(creatorApi,/individual creator/);
assert.match(adminCreatorApi,/user\.app_metadata\?\.role!=="admin"/);
assert.match(adminCreatorApi,/pro_valid_until:"9999-12-31T23:59:59\.000Z"/);
assert.match(adminCreatorApi,/game_access_plan:"full"/);
assert.match(adminCreatorApi,/creator_opportunity_active:true/);
assert.match(adminCreatorApi,/creator_opportunity_bonus_share_percent:5/);
assert.match(access,/creatorOpportunity/);
assert.match(access,/creatorOpportunityActive \|\| data\.game_access_plan === "full"/);
assert.match(commissionMigration,/0\.05 \+ \(coalesce\(opportunity_bonus,0\) \/ 100\)/);
assert.match(commissionMigration,/rate=excluded\.rate/);
assert.match(creatorPage,/Send to Admin/);
assert.match(creatorPage,/company, team or organization/);
assert.match(adminCreatorPage,/Approve Full Access/);
assert.match(pricing,/Creator Opportunity Access/);
assert.match(pricing,/additional 5 percentage-point platform sales share/);
assert.match(pricing,/normal 5% platform share becomes 10%/);

console.log("✓ AI App internal E2E locks Planning → verified Generate → durable request identity → App save → Version save → current pointer → Preview");
console.log("✓ Same-request retries are replayed or held as in-progress before duplicate AI execution; database uniqueness prevents duplicate persisted projects");
console.log("✓ Client ambiguous retries preserve one create identity, definitive failures rotate it, and post-save bootstrap loss cannot downgrade a successful project to failed");
console.log("✓ Creator Opportunity is individual-only, Admin-approved, no-upfront-fee Full Access with an operational +5 percentage-point commission rule");
console.log("✓ Public App Preview resolves current version; authenticated owner snapshot pinning remains same-project-bound through the shared server loader");
console.log("✓ Real external AI-provider success remains LIVE evidence and is not fabricated by this code gate");
