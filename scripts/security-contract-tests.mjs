import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const exists=(p)=>fs.existsSync(path.join(root,p));

const generate=read('app/api/generate/route.js');
const modify=read('app/api/modify/route.js');
const publish=read('app/api/apps/[id]/publish/route.js');
const quality=read('app/api/apps/[id]/quality/route.js');
const buyoutHardening=read('supabase/migrations/20260831031500_harden_has_active_buyout_rpc.sql');

for(const [name,source] of [['generate',generate],['modify',modify],['publish',publish],['quality',quality]]){
  assert.match(source,/auth\.getUser\(\)/,`${name} must authenticate with auth.getUser().`);
}
assert.match(generate,/owner_id\s*:\s*user\.id/,'Generated projects must be owned by the authenticated user.');
assert.match(modify,/\.eq\(\s*["']owner_id["']\s*,\s*user\.id\s*\)/,'Modify must enforce project ownership server-side.');
assert.match(publish,/\.eq\(\s*["']owner_id["']\s*,\s*user\.id\s*\)/,'Publish must enforce project ownership server-side.');
assert.match(quality,/\.eq\(\s*["']owner_id["']\s*,\s*user\.id\s*\)/,'Quality review must enforce project ownership server-side.');
assert.match(publish,/evaluateReleaseReadiness/,'Publishing must use the shared fail-closed release evaluator.');

assert.match(buyoutHardening,/function public\.has_active_buyout\(p_app_id uuid\)/,'Buyout helper must expose only the app id argument.');
assert.match(buyoutHardening,/auth\.uid\(\)/,'Buyout helper must bind access to the authenticated user.');
assert.match(buyoutHardening,/drop function if exists public\.has_active_buyout\(uuid, uuid\)/,'Legacy arbitrary-user helper must be removed after policy migration.');
assert.doesNotMatch(buyoutHardening,/grant execute on function public\.has_active_buyout\(uuid, uuid\)/,'Legacy two-argument helper must never be granted after hardening.');

const forbiddenClientNames=[
  'SUPABASE_SERVICE_ROLE_KEY','VERCEL_TOKEN','OPENROUTER_API_KEY','GROQ_API_KEY','GEMINI_API_KEY',
  'CLOUDFLARE_AI_API_TOKEN','STRIPE_SECRET_KEY','TWILIO_AUTH_TOKEN','RESEND_API_KEY'
];

function filesUnder(dir){
  if(!exists(dir))return [];
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const rel=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...filesUnder(rel));
    else if(/\.(?:js|jsx|ts|tsx)$/.test(entry.name))out.push(rel);
  }
  return out;
}

const clientFiles=filesUnder('app').filter((p)=>/^\s*["']use client["'];/m.test(read(p)));
const leaked=[];
for(const file of clientFiles){
  const source=read(file);
  for(const name of forbiddenClientNames){
    if(source.includes(name))leaked.push(`${file}: ${name}`);
  }
  const envRefs=[...source.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map(m=>m[1]);
  for(const name of envRefs){
    if(!name.startsWith('NEXT_PUBLIC_'))leaked.push(`${file}: non-public env ${name}`);
  }
}
assert.deepEqual(leaked,[],'Client bundles must never reference server secrets.');

console.log('✓ Critical mutation/readiness routes authenticate server-side');
console.log('✓ Project ownership is enforced on modify, publish and quality routes');
console.log('✓ Generated projects are assigned to the authenticated owner');
console.log('✓ Buyout source-code RLS helper is auth-bound and legacy probe signature is removed');
console.log(`✓ ${clientFiles.length} client component(s) scanned with no server-secret references`);
