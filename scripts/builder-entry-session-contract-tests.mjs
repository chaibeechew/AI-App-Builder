import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

const builder=await read('lib/cloud-adapters/builder-project-data.js');
const create=await read('app/create/page.js');
const home=await read('app/page.js');
const safety=await read('lib/auth/session-safety.js');

// A LANERIQ session proves identity, not account verification. Builder access must
// continue to derive verification from authoritative provider confirmation fields.
assert.match(builder,/confirmed_at/);
assert.match(builder,/email_confirmed_at/);
assert.match(builder,/phone_confirmed_at/);
assert.doesNotMatch(builder,/resolveLaneriqSessionAuthority/);
assert.doesNotMatch(builder,/authoritativeVerified/);

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

console.log('Builder entry verification safety contract passed.');
