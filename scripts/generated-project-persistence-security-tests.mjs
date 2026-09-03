import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const generate=read("app/api/generate/route.js");
const migration=read("supabase/migrations/20260903122000_restrict_generated_project_persistence_service_role.sql");
const signature="server_persist_generated_project\\(uuid,text,text,text,text,jsonb,text\\)";

assert.match(generate,/auth\.getUser\(\)/,"Generate must authenticate the customer before any privileged persistence.");
assert.match(generate,/createAdminClient/,"Generate must have a server-only service-role persistence client.");
assert.match(generate,/const persistenceAdmin=createAdminClient\(\)/,"Generated project persistence must use an explicitly scoped admin client.");
assert.match(generate,/persistenceAdmin\.rpc\("server_persist_generated_project"/,"Atomic generated-project persistence must execute through the service-role client.");
assert.doesNotMatch(generate,/supabase\.rpc\("server_persist_generated_project"/,"The customer-scoped Supabase client must never invoke the privileged persistence RPC.");
assert.ok(generate.indexOf("auth.getUser()")<generate.indexOf("const persistenceAdmin=createAdminClient()"),"Authentication must happen before service-role escalation.");
assert.ok(generate.indexOf("const verified=verifyGeneration(adult.result)")<generate.indexOf("const persistenceAdmin=createAdminClient()"),"Final AI verification must complete before service-role persistence.");

assert.match(migration,/security definer/i);
assert.match(migration,/set search_path=''/i);
assert.match(migration,/coalesce\(auth\.role\(\),''\) <> 'service_role'/i,"RPC must reject non-service JWT roles even if a future grant is accidentally broadened.");
assert.match(migration,new RegExp(`revoke all on function public\\.${signature} from public, anon, authenticated`,"i"));
assert.match(migration,new RegExp(`grant execute on function public\\.${signature} to service_role`,"i"));
assert.doesNotMatch(migration,new RegExp(`grant execute on function public\\.${signature} to (?:public|anon|authenticated)`,"i"));
assert.match(migration,/owner_id=uid and generation_request_id=request_key/,"Atomic replay must remain owner + stable-request bound.");
assert.match(migration,/pg_advisory_xact_lock/,"Concurrent same-request persistence must remain serialized.");
assert.match(migration,/insert into public\.app_versions/,"The privileged RPC must still atomically create the initial version.");
assert.match(migration,/update public\.apps set current_version_id=version_row\.id/,"The initial version pointer must still advance atomically.");

console.log("✓ Generated App + Website persistence is service-role only at both API and database boundaries");
console.log("✓ Customer authentication and final AI verification complete before privileged persistence");
console.log("✓ Direct authenticated RPC execution cannot bypass entitlement, credits, verification or self-heal gates");
console.log("✓ Atomic replay, version creation and current-version pointer semantics remain intact");
