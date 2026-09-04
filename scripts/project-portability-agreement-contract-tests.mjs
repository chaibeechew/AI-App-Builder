import assert from "node:assert/strict";
import fs from "node:fs";

const read=(p)=>fs.readFileSync(p,"utf8");
const agreement=read("docs/legal/LANERIQ_PROJECT_PORTABILITY_REVENUE_SHARE_AGREEMENT_v1.md");
const policy=read("config/project-portability-policy.js");
const route=read("app/api/apps/[id]/migration-agreement/route.js");
const panel=read("app/components/ProjectPortabilityPanel.js");
const migration=read("supabase/migrations/20260904003000_creator_support_and_portability.sql");
const legalGateMigration=read("supabase/migrations/20260904003300_block_draft_migration_agreement_signing.sql");

assert.match(agreement,/LANERIQ AI Project Portability & 10% Revenue Share Agreement/);
assert.match(agreement,/DRAFT — NOT YET APPROVED FOR PRODUCTION ENFORCEMENT/);
assert.match(agreement,/10% of Project Software Revenue/);
assert.match(agreement,/No Technical Platform Lock-In/);
assert.match(agreement,/Excluded Revenue/);
assert.match(agreement,/underlying value of physical property|physical property/);
assert.match(agreement,/No Double LANERIQ Share/);
assert.match(agreement,/commercial life of the migrated project/);
assert.match(agreement,/once per calendar quarter/);
assert.match(agreement,/within 30 days/);
assert.match(agreement,/governing law/);
assert.match(agreement,/Electronic Acceptance/);
assert.match(agreement,/productionEnforcement = false/);

assert.match(policy,/agreementVersion:\s*"LANERIQ-PORTABILITY-10PCT-v1-DRAFT"/);
assert.match(policy,/status:\s*"DRAFT_LEGAL_REVIEW"/);
assert.match(policy,/legalCounselApproved:\s*false/);
assert.match(policy,/productionEnforcement:\s*false/);
assert.match(policy,/externalMigrationAgreementSigningEnabled:\s*false/);
assert.match(policy,/revenueSharePercent:\s*10/);
assert.match(policy,/excludesUnderlyingCustomerBusinessTransactions:\s*true/);
assert.match(policy,/notAdditiveWithOtherLaneriqRevenueShare:\s*true/);
assert.match(policy,/customerOwnsProject:\s*true/);
assert.match(policy,/platformLockIn:\s*false/);
assert.match(policy,/migrationFee:\s*false/);

assert.match(route,/PROJECT_PORTABILITY_POLICY/);
assert.match(route,/AGREEMENT_NOT_LEGALLY_APPROVED/);
assert.match(route,/!PROJECT_PORTABILITY_POLICY\.migrationAgreement\.legalCounselApproved/);
assert.match(route,/!PROJECT_PORTABILITY_POLICY\.migrationAgreement\.productionEnforcement/);
assert.match(route,/!PROJECT_PORTABILITY_POLICY\.migrationAgreement\.externalMigrationAgreementSigningEnabled/);
assert.ok(route.indexOf("AGREEMENT_NOT_LEGALLY_APPROVED") < route.indexOf("signProjectMigrationAgreement({"),"Legal gate must execute before any signing call.");

assert.match(panel,/AGREEMENT DRAFT/);
assert.match(panel,/Review Draft Agreement/);
assert.match(panel,/Binding signing not enabled/);
assert.match(panel,/DRAFT — LEGAL REVIEW REQUIRED/);
assert.match(panel,/CUSTOMER OWNED/);
assert.match(panel,/No technical platform lock-in/);

assert.match(migration,/project_migration_agreements/);
assert.match(migration,/revenue_share_percent numeric\(5,2\) not null default 10\.00/);
assert.match(migration,/acknowledged_customer_ownership boolean not null default true/);
assert.match(migration,/acknowledged_no_platform_lock_in boolean not null default true/);

assert.match(legalGateMigration,/revoke all on function public\.sign_project_migration_agreement\(uuid,text,boolean\)/);
assert.match(legalGateMigration,/from public, anon, authenticated, service_role/);
assert.match(legalGateMigration,/legal-review draft/i);
assert.match(legalGateMigration,/Do not grant execute in Production until the agreement version is formally approved/i);
assert.doesNotMatch(legalGateMigration,/grant execute on function public\.sign_project_migration_agreement/);

console.log("✓ 10% Project Portability Agreement exists as a versioned legal-review draft");
console.log("✓ Customer ownership, no technical lock-in, revenue-base exclusions and no double-share policy are explicit");
console.log("✓ Production signing fails closed in both API code and the database RPC boundary until legal approval");
console.log("✓ UI truthfully shows DRAFT instead of presenting a binding agreement prematurely");
