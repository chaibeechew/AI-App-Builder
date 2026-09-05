import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

const builder=await read('lib/cloud-adapters/builder-project-data.js');
const create=await read('app/create/page.js');
const home=await read('app/page.js');
const safety=await read('lib/auth/session-safety.js');
const sessionRoute=await read('app/api/auth/session/route.js');
const verification=await read('lib/verification/server.js');
const realSurface=await read('app/components/LIUIRealProductSurface.js');

// Builder access still derives verification from authoritative confirmation fields.
// LANERIQ Email Verification must explicitly synchronize those fields before the
// primary LANERIQ session and compatibility bridge become usable by the Builder.
assert.match(builder,/confirmed_at/);
assert.match(builder,/email_confirmed_at/);
assert.match(builder,/phone_confirmed_at/);
assert.doesNotMatch(builder,/resolveLaneriqSessionAuthority/);
assert.doesNotMatch(builder,/authoritativeVerified/);

assert.match(verification,/updateUserById\(userId,\{email_confirm:true\}\)/);
assert.match(verification,/Compatibility email confirmation is incomplete/);
const verifiedDecision=verification.indexOf('if(decision!=="verified")');
const confirmCompatibility=verification.indexOf('await confirmCompatibilityEmail(prepared.userId)');
const createPrimarySession=verification.indexOf('primarySession=await createLaneriqSession(prepared.userId)');
const mintCompatibility=verification.indexOf('await mintCompatibilitySession(prepared.tokenHash,prepared.userId)');
assert.ok(verifiedDecision>=0&&confirmCompatibility>verifiedDecision,'Compatibility confirmation sync must occur only after LANERIQ verifies the code.');
assert.ok(createPrimarySession>confirmCompatibility,'Primary session must not be minted before confirmed_* synchronization succeeds.');
assert.ok(mintCompatibility>createPrimarySession,'Compatibility browser session remains downstream of LANERIQ primary session creation.');

// Passive compatibility migration cannot convert an unverified legacy cookie into
// a LANERIQ-primary session. This keeps the session/browser state aligned with the
// Builder verification gate instead of producing a false “verify your account” loop.
assert.match(sessionRoute,/function compatibilityVerified\(user\)/);
const compatibilityGate=sessionRoute.indexOf('if(!compatibilityVerified(user))return null;');
const migrateSession=sessionRoute.indexOf('const migrated=await createLaneriqSession(user.id);');
assert.ok(compatibilityGate>=0&&migrateSession>compatibilityGate,'LANERIQ migration must require a verified compatibility identity before session minting.');

// The 18-page LIUI uses exactly one visible canonical primary navigation surface.
// Legacy page-local bottom navigation is suppressed from layout and accessibility
// when the route-aware canonical nav is present.
assert.match(realSurface,/data-liui-nav="canonical"/);
assert.match(realSurface,/document\.querySelectorAll\("nav\.bottomNav"\)/);
assert.match(realSurface,/nav\.hidden=true/);
assert.match(realSurface,/aria-hidden/);
assert.match(realSurface,/setAttribute\("inert",""\)/);
assert.match(realSurface,/MutationObserver/);

// Ambiguous Create retries keep stable request identities instead of creating duplicates.
assert.match(create,/laneriqCreatePagePendingRequest/);
assert.match(home,/laneriqPendingCreateRequest/);

// Logout/session reset must clear pending Create request identities.
for (const key of [
  'aiAppBuilderPendingName',
  'laneriqPendingCreateRequest',
  'laneriqCreatePagePendingRequest'
]) {
  assert.match(safety,new RegExp(key));
}

console.log('Builder entry verification/session synchronization and canonical LIUI nav contract passed.');