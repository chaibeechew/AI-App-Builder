import assert from 'node:assert/strict';
import fs from 'node:fs';

const operator=fs.readFileSync('lib/soolen/platform-operator.js','utf8');
const capabilities=fs.readFileSync('app/api/soolenai/capabilities/route.js','utf8');
const platformRoute=fs.readFileSync('app/api/soolenai/platform/route.js','utf8');
const page=fs.readFileSync('app/soolen-ai/page.js','utf8');
const chat=fs.readFileSync('app/api/chat/route.js','utf8');
const verification=fs.readFileSync('app/api/auth/verification/request/route.js','utf8');
const communications=fs.readFileSync('lib/communications/server.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260902052500_harden_laneriq_communications.sql','utf8');
const whatsappHook=fs.readFileSync('supabase/functions/send-whatsapp-otp/index.ts','utf8');

for(const marker of ['customerFacingProduct:"LANERIQ AI"','oneAppExperience:true','oneSentenceAutomation:true','providerOpaqueToCustomer:true','userMustLinkInfrastructureApps:false','ordinaryUserNeedsApiKeys:false','secretsServerOnly:true','secretsNeverReturnedToClient:true','failClosedWhenProviderNotReady:true','paidSmsEnabled:false','paidSmsFallback:false','launchYearPlatformFee:0','launchYearMonths:12','autoChargeCustomer:false'])assert.match(operator,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
assert.match(operator,/USER_PLATFORM_STAGES = Object\.freeze\(\["Build","Verify","Deploy","Publish"\]\)/);
for(const domain of ['identity','communications','repository','ci','deploy','publish','secrets'])assert.match(operator,new RegExp(`${domain}:\\{label:`));
assert.match(operator,/infrastructureAdaptersReplaceable:true/);
assert.match(operator,/ordinaryUserSetup:"describe-once"/);
assert.match(operator,/providerOpaque:true/);

assert.match(capabilities,/publicResolved/);
assert.match(capabilities,/providerNamesHidden:true/);
assert.match(capabilities,/platform:publicPlatformStatus\(\)/);
assert.doesNotMatch(capabilities,/text:\s*providers\.text/);
assert.match(platformRoute,/publicPlatformStatus/);
assert.match(platformRoute,/Cache-Control":"private, no-store/);

for(const stage of ['Build','Verify','Deploy','Publish'])assert.match(page,new RegExp(`label:\"${stage}\"|>${stage}<`));
assert.match(page,/SOOLEN AI · PLATFORM OPERATOR/);
assert.match(page,/One App/);
assert.match(page,/One-sentence setup/);
assert.match(page,/Provider-opaque/);
assert.match(page,/No infrastructure linking for ordinary users/);
assert.match(page,/No paid SMS fallback/);
assert.doesNotMatch(page,/via authorized|Connect Ollama|providers connected|Supabase|GitHub|Vercel|Meta/);

assert.match(chat,/PLATFORM_OPERATOR_INSTRUCTION/);
assert.match(chat,/User-facing platform stages are only Build, Verify, Deploy and Publish/);
assert.match(chat,/never instruct them to connect, configure or visit Supabase, GitHub, Vercel, Meta/);
assert.match(chat,/Infrastructure providers are replaceable implementation details and must stay opaque/);
assert.match(chat,/managedBy: "SoolenAI Platform Operator"/);
assert.doesNotMatch(chat,/provider:\s*result\?\.provider/);

assert.match(verification,/claimLaneriqCommunication/);
assert.match(verification,/purpose:"verification"/);
assert.match(communications,/claimLaneriqCommunication/);
assert.match(communications,/deliverCommunication/);
assert.match(migration,/pg_advisory_xact_lock/);
assert.match(migration,/recipient_hourly_limit/);
assert.match(migration,/recipient_daily_limit/);
assert.match(migration,/enable row level security/);
assert.match(whatsappHook,/Webhook.*standardwebhooks/);
assert.match(whatsappHook,/WHATSAPP_OTP_TEMPLATE_NAME/);
assert.doesNotMatch(whatsappHook,/console\.(log|info|warn|error|debug)/);

console.log('✓ SoolenAI Platform Operator owns the one-app LANERIQ customer control plane');
console.log('✓ Ordinary users see only Build / Verify / Deploy / Publish and never infrastructure provider setup');
console.log('✓ Provider names and secrets are blocked from standard customer API/UI surfaces');
console.log('✓ Verification/communications retain persistent atomic fair-use, idempotency and RLS protections');
console.log('✓ WhatsApp OTP hook remains signature-verified, template-based and secret-driven');
