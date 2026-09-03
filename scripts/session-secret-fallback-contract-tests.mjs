import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const session = await readFile(new URL('../lib/auth/laneriq-session.js', import.meta.url), 'utf8');

const orderedSecrets = [
  'process.env.LANERIQ_SESSION_SECRET',
  'process.env.LANERIQ_VERIFICATION_SECRET',
  'process.env.LANERIQ_COMMUNICATIONS_HASH_SECRET',
  'process.env.LANERIQ_COMMUNICATION_PRIVACY_SECRET',
  'process.env.SUPABASE_SECRET_KEY',
  'process.env.SUPABASE_SERVICE_ROLE_KEY',
];

let previous = -1;
for (const secret of orderedSecrets) {
  const index = session.indexOf(secret);
  assert.ok(index > previous, `${secret} must exist in the approved fallback order`);
  previous = index;
}

assert.match(session, /if\(secret\.length<32\)throw new Error\("LANERIQ session secret is not configured\."\)/);
assert.match(session, /update\("laneriq-session-authority-v1"\)/);
assert.doesNotMatch(session, /NEXT_PUBLIC_[A-Z0-9_]*KEY/);
assert.doesNotMatch(session, /SUPABASE_ANON_KEY/);
assert.doesNotMatch(session, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
assert.doesNotMatch(session, /console\.(log|info|warn|error|debug)/);

console.log('✓ LANERIQ session authority uses only approved server-side secret fallbacks');
console.log('✓ Session HMAC keeps domain separation even when the root secret is shared');
console.log('✓ Public/client Supabase keys cannot become LANERIQ session signing material');
