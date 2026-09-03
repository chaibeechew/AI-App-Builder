import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateGenerationServiceRequest, GENERATION_SERVICE_CONTRACT } from '../../../lib/generation-service/contract.js';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const gateway=read('lib/generation-service/gateway.js');
const operate=read('services/generation/api/operate.js');
const status=read('services/generation/api/status.js');
const security=read('services/generation/lib/security.js');
const manifest=JSON.parse(read('services/generation/deployment.manifest.json'));

assert.equal(GENERATION_SERVICE_CONTRACT.version,'gsvc1');
assert.equal(GENERATION_SERVICE_CONTRACT.noSilentFallback,true);
assert.equal(GENERATION_SERVICE_CONTRACT.providerOpaque,true);
assert.equal(validateGenerationServiceRequest({operation:'generate',requestId:'req-1',payload:{idea:'real estate CRM'}}).ok,true);
assert.equal(validateGenerationServiceRequest({operation:'generate',requestId:'bad space',payload:{}}).ok,false);
assert.equal(validateGenerationServiceRequest({operation:'generate',requestId:'req-2',payload:{api_key:'secret'}}).code,'RAW_SECRET_FORBIDDEN');

assert.match(gateway,/https:/);
assert.match(gateway,/createHmac\("sha256"/);
assert.match(gateway,/GENERATION_SERVICE_UNREACHABLE/);
const catchIndex=gateway.indexOf('catch(error)');
assert.ok(catchIndex>=0,'Remote gateway must fail explicitly on network uncertainty.');
assert.doesNotMatch(gateway.slice(catchIndex),/return embedded\(/,'Remote uncertainty must never silently fall back to embedded generation.');
assert.match(security,/timingSafeEqual/);
assert.match(security,/MAX_SKEW=5\*60\*1000/);
assert.match(operate,/GENERATION_ENGINE_ADAPTER_NOT_READY/);
assert.match(operate,/"authorization":`Bearer \$\{adapterSecret\}`/);
assert.match(status,/live:false/);
assert.equal(manifest.security.silentEmbeddedFallback,false);
assert.equal(manifest.cost.fixedInfrastructureRequired,false);
assert.equal(manifest.evidence.standaloneLive,false);

for(const source of [gateway,operate,security]){
  assert.doesNotMatch(source,/@supabase|openai|gemini|groq|vercel\/sdk|@vercel/i,'Generation extraction boundary must remain provider-opaque.');
}

console.log('✓ Generation service contract is bounded, provider-opaque and secret-resistant');
console.log('✓ Remote generation uses HTTPS + HMAC and never silently double-runs embedded generation');
console.log('✓ Standalone host has an explicit replaceable engine adapter port and truthful CODE_READY/LIVE separation');
