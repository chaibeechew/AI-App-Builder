import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const policy=read('lib/communications/service-policy.js');
const core=read('lib/communications/server.js');
const limits=read('lib/communications/limits.js');
const adapter=read('lib/communications/delivery-adapter.js');
const store=read('lib/communications/store.js');
const migration=read('supabase/migrations/20260902052500_harden_laneriq_communications.sql');
const workflow=read('app/api/apps/[id]/workflows/[workflowId]/run/route.js');
const orchestrator=read('lib/build/orchestrator.js');
const auth=read('app/auth/page.js');

// Launch-year promise: first 12 months are platform-fee free and never silently charge/fallback to paid SMS.
assert.match(policy,/launchYearMonths:12/);
assert.match(policy,/customerPlatformFee:0/);
assert.match(policy,/autoChargeCustomer:false/);
assert.match(policy,/passThroughProviderFees:false/);
assert.match(policy,/paidSmsEnabled:false/);
assert.match(policy,/paidSmsFallback:false/);
assert.match(policy,/providerCostAbsorbedByLaneriqDuringLaunchYear:true/);
assert.match(policy,/overBudgetBehavior:"pause_or_use_available_free_route"/);
assert.match(policy,/billingFailureBehavior:"never_auto_charge_customer"/);

// LANERIQ core is provider-opaque and provider/storage adapters are replaceable.
assert.match(policy,/providerOpaqueToGeneratedApps:true/);
assert.match(policy,/storeAdapterReplaceable:true/);
assert.match(policy,/deliveryAdapterReplaceable:true/);
assert.match(core,/deliverCommunication/);
assert.match(core,/claimCommunicationDispatch/);
assert.doesNotMatch(core,/sendManagedEmail|sendManagedWhatsApp|graph\.facebook|resend\.com|twilio/i);
assert.doesNotMatch(adapter,/sendManagedSms|TWILIO|api\.twilio/i);
assert.match(adapter,/SUPPORTED=new Set\(\["email","whatsapp"\]\)/);

// Persistent fair-use and duplicate suppression are enforced before any provider call.
assert.match(limits,/verification/);
assert.match(limits,/cooldownSeconds:60/);
assert.match(limits,/whatsapp:Object\.freeze\(\{cooldownSeconds:60,hourly:5,daily:12\}\)/);
assert.match(core,/safeIdempotencyKey/);
assert.match(core,/privacyHash/);
assert.match(core,/claim\.decision==="replay"/);
assert.match(core,/claim\.decision!=="claimed"/);
assert.ok(core.indexOf('claimCommunicationDispatch')<core.indexOf('deliverCommunication'),'Persistent guard must run before provider delivery.');
assert.match(migration,/communication_dispatches_scope_idempotency_uq/);
assert.match(migration,/pg_advisory_xact_lock/);
assert.match(migration,/hourly_limit/);
assert.match(migration,/daily_limit/);
assert.match(migration,/cooldown/);

// Privacy: dispatch storage contains hashes/status only, never message body or raw recipient fields.
assert.match(policy,/recipientStoredAsHashOnly:true/);
assert.match(policy,/messageBodyStored:false/);
assert.match(migration,/scope_hash text not null/);
assert.match(migration,/recipient_hash text not null/);
assert.doesNotMatch(migration,/\b(phone|email|message_body|body|otp|verification_code)\s+text\b/i);
assert.match(core,/createHmac\("sha256"/);
assert.doesNotMatch(core,/console\.(log|error).*recipient|console\.(log|error).*body/i);

// Guard persistence is server-only. Generated/authenticated users cannot mutate quota or delivery history.
assert.match(migration,/enable row level security/);
assert.match(migration,/revoke all on public\.communication_dispatches from public,anon,authenticated/);
assert.match(migration,/to service_role/);
assert.match(migration,/auth\.role\(\).*service_role/);
assert.match(store,/createAdminClient/);
assert.match(store,/server_claim_communication_dispatch/);
assert.match(store,/server_finish_communication_dispatch/);

// Every workflow action gets a stable per-run dispatch key; rate-limit results remain partial, never falsely successful.
assert.match(workflow,/purpose:"automation"/);
assert.match(workflow,/scope:`workflow:\$\{user\.id\}:\$\{id\}`/);
assert.match(workflow,/idempotencyKey:`laneriq:\$\{runId\}:\$\{actionIndex\}:/);
assert.match(workflow,/status==="rate_limited"/);
assert.match(workflow,/No customer was charged/);

// Natural-language creator experience remains one-sentence auto-setup; paid SMS is not exposed in auth.
assert.match(orchestrator,/service:"LANERIQ Verification"/);
assert.match(orchestrator,/autoSetup:true/);
assert.match(orchestrator,/providerOpaque:true/);
assert.match(orchestrator,/paidSmsFallback:false/);
assert.match(orchestrator,/pricing:\{launchYearMonths:12,customerPlatformFee:0,currency:"MYR",autoChargeCustomer:false,fairUse:true\}/);
assert.match(auth,/Email Code/);
assert.match(auth,/WhatsApp Code/);
assert.match(auth,/No paid SMS fallback is used/);
assert.doesNotMatch(auth,/NEXT_PUBLIC_SMS_AUTH_ENABLED/);

console.log('✓ LANERIQ Launch Year Free is 12 months, RM0 platform fee, fair-use protected and never auto-charges customers');
console.log('✓ LANERIQ Communications core is provider-opaque with replaceable delivery/storage adapters');
console.log('✓ Persistent atomic cooldown/hour/day limits and idempotency run before delivery');
console.log('✓ Communication history stores hashes/status only and is service-role protected');
console.log('✓ Workflow dispatches use stable per-run keys and never report rate-limited sends as successful');
console.log('✓ One-sentence Verification auto-setup remains Email + WhatsApp only with no paid SMS fallback');
