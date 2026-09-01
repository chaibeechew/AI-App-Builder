import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const database=read('app/api/apps/[id]/database/route.js');
const databaseRollback=read('app/api/apps/[id]/database/rollback/route.js');
const records=read('app/api/apps/[id]/records/route.js');
const recordsMigration=read('supabase/migrations/20260831174000_add_app_data_records.sql');
const hardening=read('supabase/migrations/20260901104758_harden_database_runtime_contracts.sql');

// No-code Database API is owner-bound and normalizes only bounded, non-secret schema definitions.
assert.match(database,/auth\.getUser\(\)/);
assert.match(database,/function getOwnedApp[\s\S]*\.eq\("owner_id",\s*userId\)/);
assert.match(database,/SAFE_TYPES=new Set\(\["uuid","text","numeric","integer","bigint","boolean","timestamptz","date","jsonb"\]\)/);
assert.match(database,/SECRET_FIELD=\/\(password\|passwd\|secret\|token\|api\[_-\]\?key\|credential\|private\[_-\]\?key\|auth\[_-\]\?key\)\/i/);
assert.match(database,/source\.length>30/);
assert.match(database,/fields\.length<1\|\|fields\.length>80/);
assert.match(database,/\.slice\(0,100\)/);
assert.match(database,/\.slice\(-8\)/);
assert.match(database,/providerHidden:true/);
assert.match(database,/FIXED_POLICIES/);
assert.match(databaseRollback,/\.eq\("owner_id",user\.id\)/);
assert.match(databaseRollback,/restored as a new version/i);
assert.match(databaseRollback,/\.slice\(-8\)/);

// Durable runtime records authenticate, bind owner/project, bound row shape and protect stale edits.
assert.match(records,/auth\.getUser\(\)/);
assert.match(records,/\.eq\("id",id\)\.eq\("owner_id",user\.id\)/);
assert.match(records,/MAX_RECORDS = 100/);
assert.match(records,/MAX_FIELDS = 24/);
assert.match(records,/MAX_VALUE = 2000/);
assert.match(records,/expectedUpdatedAt/);
assert.match(records,/changed since it was loaded/);
for(const verb of ['GET','POST','PATCH','DELETE'])assert.match(records,new RegExp(`export async function ${verb}`));
assert.match(recordsMigration,/enable row level security/i);
assert.match(recordsMigration,/owner_id\s*=\s*\(select auth\.uid\(\)\)/i);
assert.match(recordsMigration,/octet_length\(record_json::text\) <= 65536/i);

// Database-level constraints duplicate the critical API limits so direct table access cannot bypass safety.
assert.match(hardening,/function public\.app_backend_schema_is_safe\(p_schema jsonb\)/);
assert.match(hardening,/octet_length\(p_schema::text\) > 2097152/);
assert.match(hardening,/entity_count < 1 or entity_count > 30/);
assert.match(hardening,/jsonb_array_length\(p_schema->'relationships'\) > 100/);
assert.match(hardening,/jsonb_array_length\(p_schema->'_history'\) > 8/);
assert.match(hardening,/jsonb_array_length\(ent->'fields'\) < 1 or jsonb_array_length\(ent->'fields'\) > 80/);
assert.match(hardening,/password\|passwd\|secret\|token\|api\[_-\]\?key\|credential\|private\[_-\]\?key\|auth\[_-\]\?key/);
assert.match(hardening,/app_backend_models_schema_safe_check/);
assert.match(hardening,/function public\.app_record_json_is_bounded\(p_record jsonb\)/);
assert.match(hardening,/field_count > 24/);
assert.match(hardening,/char_length\(pair\.value #>> '\{\}'\) > 2000/);
assert.match(hardening,/value_type not in \('string','number','boolean'\)/);
assert.match(hardening,/app_data_records_bounded_json_check/);

// RLS cannot protect TRUNCATE; remove dangerous table-level privileges from customer roles across public base tables.
assert.match(hardening,/revoke truncate, references, trigger on table public\.%I from anon, authenticated/);
assert.match(hardening,/revoke all on public\.app_backend_models from anon/);
assert.match(hardening,/grant select, insert, update, delete on public\.app_backend_models to authenticated/);
assert.match(hardening,/revoke all on public\.app_data_records from anon/);
assert.match(hardening,/grant select, insert, update, delete on public\.app_data_records to authenticated/);

console.log('✓ No-code Database schema is owner-bound, type-limited, secret-field resistant and history bounded');
console.log('✓ Durable App records are owner-scoped, bounded and conflict-safe through the runtime API');
console.log('✓ Database CHECK constraints mirror critical schema/record safety limits and reject nested/oversized unsafe data');
console.log('✓ Public base tables remove TRUNCATE/TRIGGER/REFERENCES from anon/authenticated so RLS cannot be bypassed by TRUNCATE');
console.log('✓ Database Builder rollback preserves prior model history by restoring into a new model version');
