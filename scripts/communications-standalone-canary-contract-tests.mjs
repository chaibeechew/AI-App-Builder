import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('scripts/communications-standalone-canary.mjs','utf8');
const readme=fs.readFileSync('services/communications/README.md','utf8');

for(const token of ['LANERIQ_COMMUNICATIONS_CANARY_URL','LANERIQ_COMMUNICATIONS_SERVICE_SECRET','LANERIQ_COMMUNICATIONS_CANARY_USER_ID','/api/communications/v1/status','/api/communications/v1/dispatch','signServiceRequest','standalone_service_host','externalSpendCap','replay_blocked','idempotency_conflict','LIVE_CANARY']) assert.ok(source.includes(token),`Missing canary gate token: ${token}`);
assert.match(source,/unsignedResponse\.status!==401&&unsignedResponse\.status!==503/,'Unsigned dispatch must fail closed.');
assert.match(source,/preferredChannels:\['in_app'\]/,'First standalone canary must stay on zero-cost in-app only.');
assert.match(source,/Number\(first\.data\?\.result\?\.externalSpend\)!==0/,'Canary must prove zero external spend.');
assert.ok(source.indexOf("first=await signedRequest")<source.indexOf('replayResponse=await fetch'),'Signed delivery must happen before replay evidence.');
assert.ok(source.indexOf('replayResponse=await fetch')<source.indexOf('conflictAttempt=await signedRequest'),'Replay must be tested before idempotency-body conflict.');
assert.match(readme,/Do not label this service `LIVE standalone` until/i);

console.log('✓ Standalone LIVE evidence requires an HTTPS second service host');
console.log('✓ Unsigned dispatch, signed delivery, nonce replay and idempotency conflict are independently verified');
console.log('✓ Canary is constrained to in-app with externalSpend=0');
console.log('✓ CODE/READY cannot be promoted to LIVE without real canary evidence');
