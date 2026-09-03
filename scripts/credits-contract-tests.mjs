import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const finance=read('lib/app-builder-finance.js');
const admin=read('lib/supabase/admin.js');
const serverRpc=read('supabase/migrations/20260831170000_server_only_entitlements_and_credits.sql');
const previewRuntime=read('supabase/migrations/20260831120000_preview_access_credit_runtime.sql');
const revokeLegacy=read('supabase/migrations/20260831171000_revoke_legacy_authenticated_financial_rpcs.sql');
const generate=read('app/api/generate/route.js');
const modify=read('app/api/modify/route.js');

// Only the server admin client may call privileged financial RPCs.
assert.match(finance,/createAdminClient/);
assert.match(admin,/SUPABASE_SECRET_KEY\|\|process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
for(const fn of [
  'server_consume_app_builder_entitlement',
  'server_bind_app_builder_project_access',
  'server_restore_failed_app_builder_create',
  'server_consume_ai_credits',
  'server_refund_ai_credits',
]){
  assert.match(finance,new RegExp(fn));
  assert.match(serverRpc,new RegExp(`revoke all on function public\\.${fn}`));
  assert.match(serverRpc,new RegExp(`grant execute on function public\\.${fn}[^;]+ to service_role`));
}

// Customer-facing financial tables are read-only and owner-scoped through RLS.
assert.match(previewRuntime,/alter table public\.app_builder_usage enable row level security/i);
assert.match(previewRuntime,/alter table public\.app_builder_account_access enable row level security/i);
assert.match(previewRuntime,/alter table public\.app_builder_project_access enable row level security/i);
assert.match(previewRuntime,/revoke insert, update, delete, truncate on public\.credit_accounts from anon, authenticated/i);
assert.match(previewRuntime,/revoke insert, update, delete, truncate on public\.credit_transactions from anon, authenticated/i);
assert.match(previewRuntime,/grant select on public\.credit_accounts, public\.credit_transactions to authenticated/i);
assert.match(previewRuntime,/credit_transactions_request_type_unique_idx/);
assert.match(previewRuntime,/on public\.credit_transactions\(user_id, request_id, type\)/);

// Credit consumption is bounded, row-locked, idempotent and fail-closed.
assert.match(serverRpc,/function public\.server_consume_ai_credits/);
assert.match(serverRpc,/p_amount is null or p_amount<=0 or p_amount>100000/);
assert.match(serverRpc,/if request_key='' then raise exception 'Request id is required'/);
assert.match(serverRpc,/select balance into current_balance from public\.credit_accounts where user_id=uid for update/);
assert.match(serverRpc,/request_id=request_key and type='ai_usage'/);
assert.match(serverRpc,/replayed',true/);
assert.match(serverRpc,/if current_balance<p_amount then raise exception 'Insufficient credits'/);
assert.match(serverRpc,/balance=balance-p_amount/);
assert.match(serverRpc,/values\(uid,-p_amount,'ai_usage'/);

// Refunds can only reverse the matching charge once and cannot mint arbitrary credits.
assert.match(serverRpc,/function public\.server_refund_ai_credits/);
assert.match(serverRpc,/request_id=request_key and type='ai_usage'/);
assert.match(serverRpc,/reason','charge_not_found'/);
assert.match(serverRpc,/if abs\(charge_amount\)<>p_amount then raise exception 'Refund amount does not match original charge'/);
assert.match(serverRpc,/request_id=request_key and type='ai_refund'/);
assert.match(serverRpc,/if existing_refund is not null then return jsonb_build_object\('refunded',false,'balance',current_balance,'replayed',true\)/);
assert.match(serverRpc,/balance=balance\+p_amount/);
assert.match(serverRpc,/values\(uid,p_amount,'ai_refund'/);

// Creation entitlement reservation is concurrency-safe, exact-request bound and recoverable on failed creation.
assert.match(serverRpc,/select \* into usage_row from public\.app_builder_usage where user_id=uid for update/);
assert.match(serverRpc,/Another creation request is already in progress/);
assert.match(serverRpc,/create_request_id=request_key/);
assert.match(serverRpc,/source_request_id=request_key/);
assert.match(serverRpc,/No matching creation entitlement reservation/);
assert.match(serverRpc,/already_bound/);
assert.match(serverRpc,/standard_project_credits=standard_project_credits\+1/);
assert.match(serverRpc,/free_first_project_claimed=false/);

// Modify access is exact-project owner-bound; project credits cannot be used on someone else's project.
assert.match(serverRpc,/a\.id=p_app_id and a\.owner_id=uid/);
assert.match(serverRpc,/pa\.app_id=p_app_id and pa\.user_id=uid/);
assert.match(serverRpc,/access_tier='promotion'/);
assert.match(serverRpc,/access_tier='standard'/);
assert.match(serverRpc,/access_tier='professional'/);

// Legacy authenticated mutation RPCs are revoked after Preview migration.
for(const signature of [
  'consume_app_builder_entitlement\\(text,uuid,text\\)',
  'bind_app_builder_project_access\\(uuid,text\\)',
  'restore_failed_app_builder_create\\(text\\)',
  'consume_ai_credits\\(numeric,text,text,jsonb\\)',
  'refund_ai_credits\\(text,numeric,text,jsonb\\)',
]) assert.match(revokeLegacy,new RegExp(`revoke all on function public\\.${signature} from public,anon,authenticated`));

// Create and Modify must use the same server finance layer. Identity may now come from LANERIQ Cloud, but every charge/bind/refund uses the resolved userId.
for(const [name,source] of [['generate',generate],['modify',modify]]){
  assert.match(source,/app-builder-finance/);
  assert.match(source,/consumeAppBuilderEntitlement\(userId/);
  assert.match(source,/consumeAiCredits\(userId/);
  assert.doesNotMatch(source,/\.rpc\(\s*["']consume_ai_credits["']/);
  assert.doesNotMatch(source,/\.rpc\(\s*["']refund_ai_credits["']/);
  assert.doesNotMatch(source,/\.rpc\(\s*["']consume_app_builder_entitlement["']/);
}
assert.match(generate,/userId=principal\.principal\.principalId/,'Generate finance identity must come from the verified LANERIQ Cloud principal.');
assert.match(modify,/userId=principal\.principal\.principalId/,'Modify finance identity must come from the verified LANERIQ Cloud principal.');
assert.match(generate,/bindAppBuilderProjectAccess\(userId/);
assert.match(generate,/restoreFailedAppBuilderCreate\(userId/);
assert.match(modify,/refundAiCredits\(userId/);

console.log('✓ Credit balances are customer-read-only and mutation RPCs are service-role only');
console.log('✓ AI credit charges are bounded, row-locked, idempotent and fail closed on insufficient balance');
console.log('✓ Refunds require the original matching charge and are replay safe');
console.log('✓ Create entitlement reservations are concurrency-safe, exact-request bound and recoverable');
console.log('✓ Modify entitlement is exact-project owner-bound across promotion, standard and professional tiers');
console.log('✓ Generate/Modify resolve identity through LANERIQ Cloud but preserve the same server finance, recovery and refund paths');
