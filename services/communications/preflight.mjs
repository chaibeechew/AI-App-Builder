import fs from 'node:fs';

const manifest=JSON.parse(fs.readFileSync(new URL('./deployment-manifest.json',import.meta.url),'utf8'));
const env=process.env;
const required=manifest.requiredServerEnv;
const checks=[];
const add=(id,passed,detail)=>checks.push({id,passed:Boolean(passed),detail});

const supabaseUrl=String(env.SUPABASE_URL||'').trim();
const serviceKey=String(env.SUPABASE_SECRET_KEY||'').trim();
const secret=String(env.LANERIQ_COMMUNICATIONS_SERVICE_SECRET||'').trim();
const clientId=String(env.LANERIQ_COMMUNICATIONS_SERVICE_CLIENT_ID||'').trim();

let supabaseHttps=false;
try{const u=new URL(supabaseUrl);supabaseHttps=u.protocol==='https:'&&Boolean(u.hostname);}catch{}
add('supabase_https',supabaseHttps,'SUPABASE_URL must be a valid HTTPS URL.');
add('service_key_present',serviceKey.length>=20,'SUPABASE_SECRET_KEY must be server-side and non-empty.');
add('service_secret_strength',secret.length>=32,'LANERIQ_COMMUNICATIONS_SERVICE_SECRET must contain at least 32 characters.');
add('client_id_format',/^[A-Za-z0-9._:-]{1,180}$/.test(clientId),'LANERIQ_COMMUNICATIONS_SERVICE_CLIENT_ID must use the service client-id grammar.');
add('zero_cost_initial_channel',manifest.cutoverPolicy.initialChannel==='in_app'&&manifest.cutoverPolicy.externalSpendCap===0,'First physical cutover must remain zero-cost in-app only.');
add('no_uncertain_fallback',manifest.cutoverPolicy.remoteFailureFallbackToEmbedded===false,'Remote uncertainty must never double-send through embedded fallback.');

const missing=required.filter(key=>!String(env[key]||'').trim());
const ready=missing.length===0&&checks.every(x=>x.passed);
const report={
  service:manifest.service,
  rootDirectory:manifest.rootDirectory,
  ready,
  evidenceLevel:ready?'DEPLOY_CONFIG_READY':'CONFIG_INCOMPLETE',
  missing,
  checks,
  secretValuesExposed:false
};
console.log(JSON.stringify(report,null,2));
if(!ready)process.exitCode=1;
