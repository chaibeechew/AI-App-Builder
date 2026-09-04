import fs from "node:fs";
import { spawnSync } from "node:child_process";

const files={
  migration:"supabase/migrations/20260904150000_legal_runtime_architecture.sql",
  rpc:"supabase/migrations/20260904150100_legal_runtime_service_rpc.sql",
  documentApi:"app/api/legal/document/route.js",
  acceptanceApi:"app/api/legal/acceptance/route.js",
  truthGateApi:"app/api/legal/marketplace/truth-gate/route.js",
  architecture:"docs/legal/LANERIQ_LEGAL_RUNTIME_ARCHITECTURE_v1.md"
};

for(const [label,path] of Object.entries(files)){
  if(!fs.existsSync(path))throw new Error(`Missing ${label}: ${path}`);
}

const migration=fs.readFileSync(files.migration,"utf8");
const rpc=fs.readFileSync(files.rpc,"utf8");
const documentApi=fs.readFileSync(files.documentApi,"utf8");
const acceptanceApi=fs.readFileSync(files.acceptanceApi,"utf8");
const truthGateApi=fs.readFileSync(files.truthGateApi,"utf8");
const architecture=fs.readFileSync(files.architecture,"utf8");

const checks=[];
function check(name,ok){checks.push({name,ok:Boolean(ok)});}
function has(text,fragment){return text.includes(fragment);}

for(const table of [
  "legal_document_versions",
  "legal_acceptance_events",
  "privacy_incidents",
  "privacy_incident_audit",
  "app_sale_transactions"
]){
  check(`Creates ${table}`,new RegExp(`create table if not exists public\\.${table}\\b`,`i`).test(migration));
  check(`Enables RLS on ${table}`,has(migration,`alter table public.${table} enable row level security;`));
  check(`Revokes browser table access on ${table}`,has(migration,`revoke all on public.${table} from anon, authenticated;`));
}

check("Does not seed ACTIVE legal versions",!new RegExp("insert\\s+into\\s+public\\.legal_document_versions","i").test(migration));
check("Only ACTIVE legal versions can create binding evidence",has(migration,"Only ACTIVE legal document versions may create binding acceptance evidence"));
check("Legal hash is SHA-256 constrained",has(migration,"document_hash ~ '^[0-9a-f]{64}$'"));
check("One ACTIVE version per legal document",has(migration,"legal_document_versions_one_active_per_key")&&has(migration,"where status = 'active'"));
check("Approved legal identity/hash is immutable",has(migration,"Approved legal document identity and hash are immutable"));
check("Acceptance evidence is append-oriented immutable",has(migration,"Legal acceptance evidence is append-only and immutable"));
check("Strong/bilateral evidence requires high assurance",has(migration,"Strong or bilateral acceptance requires verified high-assurance evidence"));
check("Evidence uses an allowlist",has(migration,"jsonb_object_keys(new.evidence)")&&has(migration,"'user_agent_hash'")&&has(migration,"'high_assurance_verified'"));

check("Privacy clock has explicit anchor",has(migration,"clock_anchor_at timestamptz"));
check("Privacy clock has explicit basis",has(migration,"clock_basis text"));
check("Privacy clock defaults to current Malaysian 72-hour operating window",has(migration,"notification_window_hours smallint not null default 72"));
check("Privacy deadline derives from explicit anchor",has(migration,"new.clock_anchor_at + make_interval(hours => new.notification_window_hours)"));
check("Privacy incident state is audited",has(migration,"privacy_incident_state_audit"));

for(const requirement of [
  "seller_verification",
  "asset_schedule",
  "payment",
  "ip_review",
  "malware_review",
  "third_party_disclosure",
  "handover_acceptance",
  "credential_rotation",
  "tax_stamp_review",
  "transaction_hold",
  "data_transfer_decision",
  "seller_bilateral_acceptance",
  "buyer_bilateral_acceptance"
]){
  check(`Marketplace gate includes ${requirement}`,has(migration,`'${requirement}'`));
}

check("Data addendum requires bilateral data acceptance",has(migration,"seller_data_addendum_acceptance")&&has(migration,"buyer_data_addendum_acceptance"));
check("Ready-for-transfer is blocked on missing requirements",has(migration,"Transaction truth gate is not satisfied"));
check("Ownership completion requires actual buyer ownership",has(migration,"current_owner <> new.buyer_user_id")&&has(migration,"Platform app ownership has not actually transferred to the buyer"));
check("Ownership completion requires immutable transfer reference",has(migration,"Ownership transfer completion requires an immutable transfer reference"));
check("Completed ownership evidence cannot silently regress",has(migration,"Completed transaction ownership evidence is immutable"));

check("Service truth RPC is SECURITY DEFINER",has(rpc,"security definer"));
check("Service truth RPC is revoked from browsers",has(rpc,"revoke all on function public.server_evaluate_app_sale_truth_gate(uuid) from public, anon, authenticated;"));
check("Service truth RPC is service-role only",has(rpc,"grant execute on function public.server_evaluate_app_sale_truth_gate(uuid) to service_role;"));
check("No authenticated EXECUTE grant on service truth RPC",!new RegExp("grant\\s+execute[\\s\\S]*authenticated","i").test(rpc));

check("Document API filters ACTIVE only",has(documentApi,'.eq("status","active")'));
check("Document API does not expose approval identity",!has(documentApi,"approved_by")&&!has(documentApi,"approval_reference"));
check("Acceptance API authenticates with getUser",has(acceptanceApi,"supabase.auth.getUser()"));
check("Acceptance API compares exact version and hash",has(acceptanceApi,"doc.version!==version||doc.document_hash!==documentHash"));
check("Acceptance API requires AAL2 for high-assurance documents",has(acceptanceApi,"getAuthenticatorAssuranceLevel()")&&has(acceptanceApi,'aal?.currentLevel!=="aal2"'));
check("Acceptance API uses server-only admin insertion",has(acceptanceApi,'.from("legal_acceptance_events")')&&has(acceptanceApi,"createAdminClient"));
check("Acceptance API does not accept raw evidence object",!has(acceptanceApi,"body?.evidence"));
check("Acceptance API does not persist IP address",!has(acceptanceApi,"x-forwarded-for")&&!has(acceptanceApi,"request.ip"));
check("Truth gate API authenticates user",has(truthGateApi,"supabase.auth.getUser()"));
check("Truth gate API restricts to Seller/Buyer",has(truthGateApi,"tx.seller_user_id!==user.id&&tx.buyer_user_id!==user.id"));
check("Truth gate API uses service-only database evaluator",has(truthGateApi,'admin.rpc("server_evaluate_app_sale_truth_gate"'));

check("Architecture declares zero ACTIVE seed",has(architecture,"zero ACTIVE legal versions"));
check("Architecture preserves CODE versus LIVE truth boundary",has(architecture,"CODE / ARCHITECTURE READY")&&has(architecture,"not `100 LIVE`"));
check("Architecture requires PR 237 and 244 before Batch 115",has(architecture,"PR #237")&&has(architecture,"PR #244"));

for(const path of [files.documentApi,files.acceptanceApi,files.truthGateApi]){
  const syntax=spawnSync(process.execPath,["--check",path],{encoding:"utf8"});
  check(`JavaScript syntax: ${path}`,syntax.status===0);
  if(syntax.status!==0)process.stderr.write(syntax.stderr||syntax.stdout||"");
}

const failed=checks.filter(item=>!item.ok);
for(const item of checks)console.log(`${item.ok?"PASS":"FAIL"} ${item.name}`);
console.log(`\nLegal Runtime Architecture: ${checks.length-failed.length}/${checks.length} contract checks passed.`);
if(failed.length){
  console.error(`Failed checks: ${failed.map(item=>item.name).join(", ")}`);
  process.exit(1);
}
