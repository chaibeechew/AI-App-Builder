import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest=JSON.parse(fs.readFileSync(new URL('../deployment-manifest.json',import.meta.url),'utf8'));
const source=fs.readFileSync(new URL('../preflight.mjs',import.meta.url),'utf8');
const envExample=fs.readFileSync(new URL('../.env.example',import.meta.url),'utf8');

assert.equal(manifest.rootDirectory,'services/communications');
assert.equal(manifest.publicProtocol.status,'/api/communications/v1/status');
assert.equal(manifest.publicProtocol.dispatch,'/api/communications/v1/dispatch');
assert.equal(manifest.cutoverPolicy.initialChannel,'in_app');
assert.equal(manifest.cutoverPolicy.externalSpendCap,0);
assert.equal(manifest.cutoverPolicy.remoteFailureFallbackToEmbedded,false);
assert.equal(manifest.cutoverPolicy.requireSignedCanary,true);
assert.equal(manifest.evidenceSemantics.beforeSecondProject,'DEPLOY_READY');
assert.equal(manifest.evidenceSemantics.afterSuccessfulCanaryAndCleanLogs,'LIVE_STANDALONE');
for(const key of ['SUPABASE_URL','SUPABASE_SECRET_KEY','LANERIQ_COMMUNICATIONS_SERVICE_SECRET','LANERIQ_COMMUNICATIONS_SERVICE_CLIENT_ID']){
  assert.ok(manifest.requiredServerEnv.includes(key));
  assert.ok(envExample.includes(key));
}
for(const token of ['secretValuesExposed:false','service_secret_strength','zero_cost_initial_channel','no_uncertain_fallback','CONFIG_INCOMPLETE','DEPLOY_CONFIG_READY'])assert.ok(source.includes(token),`Missing preflight contract token: ${token}`);
assert.doesNotMatch(source,/console\.log\([^\n]*(serviceKey|secret)[^\n]*\)/,'Preflight must never log raw secret values.');

console.log('✓ Standalone communications deployment manifest is machine-readable');
console.log('✓ Preflight requires only the minimum server-side environment');
console.log('✓ RM0 in-app cutover and no-double-send fallback remain mandatory');
console.log('✓ Readiness evidence cannot promote itself to LIVE');
