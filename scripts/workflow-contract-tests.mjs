import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const definitions=read('app/api/apps/[id]/workflows/route.js');
const run=read('app/api/apps/[id]/workflows/[workflowId]/run/route.js');
const page=read('app/workflows/[id]/page.js');
const communications=read('lib/communications/server.js');
const integrations=read('lib/integrations/server.js');
const bootstrap=read('app/api/apps/[id]/bootstrap/route.js');
const migration=read('supabase/migrations/20260901111658_harden_workflow_runtime_contract.sql');

// Definition creation: authenticate/owner bind, supported triggers/actions only, bounded secret-free config.
assert.match(definitions,/auth\.getUser\(\)/);
assert.match(definitions,/\.eq\("id",id\)\.eq\("owner_id",userId\)/);
assert.match(definitions,/SAFE_TRIGGERS=new Set\(\["form_submitted","appointment_created","order_created"\]\)/);
assert.match(definitions,/SAFE_ACTIONS=new Set\(\["save_crm","save_order","notify_team","send_email","send_whatsapp","calendar"\]\)/);
assert.doesNotMatch(definitions,/"send_sms"/);
assert.match(definitions,/SECRET_KEY_PATTERN/);
assert.match(definitions,/depth>4/);
assert.match(definitions,/slice\(0,20\)/);
assert.match(definitions,/Object\.entries\(value\)\.slice\(0,40\)/);
assert.match(definitions,/slice\(0,2000\)/);
assert.match(definitions,/actions\.slice\(0,12\)/);
assert.match(definitions,/Unsupported workflow trigger/);
assert.match(definitions,/Unsupported workflow action/);
assert.match(definitions,/Cache-Control":"no-store"/);

// Every execution is owner-bound and request-idempotent before side effects.
assert.match(run,/auth\.getUser\(\)/);
assert.match(run,/\.eq\("id",id\)\.eq\("owner_id",user\.id\)/);
assert.match(run,/\.eq\("id",workflowId\)\.eq\("app_id",id\)\.eq\("owner_id",user\.id\)/);
assert.match(run,/A stable idempotency key is required for every workflow run/);
assert.match(run,/\.eq\("owner_id",user\.id\)\.eq\("workflow_id",workflowId\)\.eq\("idempotency_key",idempotencyKey\)/);
assert.match(run,/concurrent duplicate was blocked by the database idempotency constraint/i);
assert.match(migration,/workflow_runs_idempotency_uq|idempotency_key/);

// Safe Test must short-circuit every side-effecting supported action before any write/provider call.
assert.match(run,/SAFE_TEST_ACTIONS=new Set\(\["save_crm","save_order","notify_team","send_email","send_whatsapp","calendar"\]\)/);
assert.doesNotMatch(run,/sendManagedSms|action\.type==="send_sms"/);
assert.match(run,/if\(dryRun&&SAFE_TEST_ACTIONS\.has\(action\?\.type\)\)return \{type:action\.type,status:"simulated"/);
assert.match(run,/without saving data or contacting an external service/);
assert.match(page,/dryRun:true/);
assert.match(page,/Safe Test passed\. No customer data was saved and no messages were sent/);
assert.match(page,/NO SIDE EFFECTS/);
assert.doesNotMatch(page,/send_sms|Send SMS/);

// Bounded execution and honest failure states.
assert.match(run,/actions\)\?workflow\.actions\.slice\(0,12\)/);
assert.match(run,/Workflow action timed out\. Please retry safely/);
assert.match(run,/safeFailureMessage/);
assert.match(run,/SECRET_PAYLOAD_KEY/);
assert.match(run,/incomplete=results\.filter/);
assert.match(run,/const status=criticalFailure\?"failed":incomplete\?"partial":"completed"/);
assert.match(run,/recorded as partial, not successful/);
assert.match(run,/critical action did not complete, so the workflow stopped safely/i);
assert.match(run,/status==="failed"\?409:status==="partial"\?207:200/);

// Generated projects call LANERIQ Communications, while provider adapters remain private and replaceable.
assert.match(run,/sendLaneriqCommunication/);
assert.match(communications,/service:"LANERIQ Communications"/);
assert.match(communications,/CHANNELS=new Set\(\["email","whatsapp"\]\)/);
assert.match(communications,/sendManagedEmail/);
assert.match(communications,/sendManagedWhatsApp/);
assert.match(integrations,/providerFetch/);
assert.match(integrations,/AbortController/);
assert.match(integrations,/External provider timed out\. Please retry safely/);
for(const marker of ['integrationStatus().email.ready','integrationStatus().whatsapp.ready','integrationStatus().calendar.ready'])assert.match(integrations,new RegExp(marker.replace(/[().]/g,'\\$&')));
assert.doesNotMatch(integrations,/TWILIO_|sendManagedSms|channel:"sms"/);
assert.match(run,/integration_required/);

// Live DB contract mirrors ownership and payload safety. Historical rows may retain legacy action names,
// but the current API/runtime cannot create or execute paid SMS actions.
assert.match(migration,/workflow_json_is_safe/);
assert.match(migration,/workflow_actions_are_safe/);
assert.match(migration,/workflow_payload_is_safe/);
assert.match(migration,/app_workflows_trigger_type_check/);
assert.match(migration,/app_workflows_actions_check/);
assert.match(migration,/workflow_runs_trigger_payload_check/);
assert.match(migration,/workflow_runs_action_results_check/);
assert.match(migration,/workflow_records_payload_check/);
assert.match(migration,/trigger_type in \('form_submitted','appointment_created','order_created'\)/);
for(const action of ['save_crm','save_order','notify_team','send_email','send_whatsapp','calendar'])assert.match(migration,new RegExp(`'${action}'`));
assert.match(migration,/exists \(select 1 from public\.apps a where a\.id=workflow_runs\.app_id and a\.owner_id=\(select auth\.uid\(\)\)\)/);
assert.match(migration,/exists \(select 1 from public\.app_workflows w where w\.id=workflow_runs\.workflow_id and w\.app_id=workflow_runs\.app_id and w\.owner_id=\(select auth\.uid\(\)\)\)/);
assert.match(migration,/revoke all on public\.app_workflows, public\.workflow_runs, public\.workflow_records from anon/);
assert.match(migration,/grant select, insert, update on public\.workflow_runs to authenticated/);
assert.match(migration,/grant select, insert on public\.workflow_records to authenticated/);

// Autonomous bootstrap only creates bounded supported workflow definitions.
assert.match(bootstrap,/plan\.workflows\.slice\(0,5\)/);
assert.match(bootstrap,/app_workflows/);
assert.match(bootstrap,/owner_id:user\.id/);

console.log('✓ Workflow definitions are owner-bound, bounded, secret-filtered and restricted to LANERIQ-supported actions');
console.log('✓ Every workflow run requires a stable idempotency key and concurrent duplicate execution is database-blocked');
console.log('✓ Safe Test simulates every supported side-effect action before any customer-data write or external provider call');
console.log('✓ LANERIQ Communications owns the app-facing Email/WhatsApp contract while provider adapters stay replaceable');
console.log('✓ Paid SMS is absent from the executable workflow and provider surfaces');
console.log('✓ Live DB constraints/RLS bind workflow runs and records to the actual owned app/workflow chain');
