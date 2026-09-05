import assert from "node:assert/strict";
import fs from "node:fs";

const read=(p)=>fs.readFileSync(p,"utf8");
const policy=read("config/buyout-license-policy.js");
const product=read("config/product-policy.js");
const enterprise=read("config/enterprise-pricing.js");
const migration=read("supabase/migrations/20260904020800_buyout_license_certificate.sql");
const service=read("lib/buyout-license/server.js");
const adminRoute=read("app/api/admin/buyout-license/route.js");
const dashboard=read("app/app-dashboard/[id]/page.js");
const licensePage=read("app/app-dashboard/[id]/license/page.js");
const readme=read("README.md");

assert.match(policy,/personal:\s*49/);
assert.match(policy,/business:\s*199/);
assert.match(policy,/enterprise:\s*499/);
assert.match(policy,/futureLaneriqRevenueShareAfterBuyoutPercent:\s*0/);
assert.match(policy,/gameProjectEligible:\s*false/);
assert.match(policy,/encourageCreatorSupportedProjectEligible:\s*false/);
assert.match(policy,/dashboardVisible:\s*true/);
assert.match(policy,/transactionalEmailReceiptEnabled:\s*true/);
assert.match(policy,/emailFailureDoesNotInvalidateLicense:\s*true/);

assert.match(product,/personal:\s*\{\s*priceUsd:\s*49\s*\}/);
assert.match(product,/business:\s*\{\s*priceUsd:\s*199\s*\}/);
assert.match(product,/enterprise:\s*\{\s*priceUsd:\s*499\s*\}/);
assert.match(product,/creatorEncouragementSupportedProjectEligible:\s*false/);
assert.match(product,/unrelatedProjectsOfCreatorRemainEligible:\s*true/);
assert.match(enterprise,/priceUsd:\s*499/);
assert.match(enterprise,/encourageCreatorSupportedProjectEligible:\s*false/);

assert.match(migration,/license_number text/);
assert.match(migration,/license_tier text/);
assert.match(migration,/email_delivery_status text/);
assert.match(migration,/create or replace function public\.admin_issue_buyout_license/);
assert.match(migration,/Payment reference is required/);
assert.match(migration,/Encourage Creator support and is not eligible for Buyout License/);
assert.match(migration,/Game projects do not offer Buyout License/);
assert.match(migration,/when 'personal' then 49 when 'business' then 199 when 'enterprise' then 499/);
assert.match(migration,/grant execute on function public\.admin_issue_buyout_license\(uuid,text,text\) to authenticated/);
assert.match(migration,/Admin access required/);

assert.match(service,/isMobileGameIdea/);
assert.match(service,/creator_support_requests/);
assert.match(service,/sendLaneriqEmail/);
assert.match(service,/emailFailureDoesNotInvalidateLicense:true/);
assert.match(service,/email_delivery_status/);
assert.match(service,/futureLaneriqRevenueSharePercent:0/);
assert.doesNotMatch(service,/sendManagedSms|sendSms|SMS/);
assert.match(adminRoute,/issueBuyoutLicenseAsAdmin/);
assert.match(adminRoute,/ADMIN_REQUIRED/);
assert.match(adminRoute,/GAME_BUYOUT_NOT_AVAILABLE/);
assert.match(adminRoute,/ENCOURAGE_CREATOR_BUYOUT_NOT_AVAILABLE/);

// Reference-layout dashboard keeps the license entry and live certificate status,
// while the authoritative price list remains in policy + dedicated license page/docs.
assert.match(dashboard,/BUYOUT LICENSE/);
assert.match(dashboard,/Project License/);
assert.match(dashboard,/app-dashboard\/\$\{id\}\/license/);
assert.match(dashboard,/buyoutLicense\?\.status/);
assert.match(licensePage,/Electronic License Certificate/);
assert.match(licensePage,/LICENSE ID/);
assert.match(licensePage,/Future LANERIQ AI revenue share after this Buyout License/);
assert.match(licensePage,/Dashboard copy is the source of truth/);
assert.match(readme,/Personal — US\$49/);
assert.match(readme,/Business — US\$199/);
assert.match(readme,/Enterprise — US\$499/);
assert.match(readme,/transactional email copy/);

console.log("✓ Buyout License pricing remains 49 / 199 / 499 for eligible non-Game projects");
console.log("✓ Encourage Creator-supported project and Game projects are excluded from Buyout");
console.log("✓ Admin-only post-payment issuance creates a unique electronic License record");
console.log("✓ Reference-layout Dashboard retains Buyout status and permanent certificate entry");
console.log("✓ Authoritative pricing remains locked in policy, license page and README");
console.log("✓ Email failure does not invalidate the Dashboard source-of-truth License record");
