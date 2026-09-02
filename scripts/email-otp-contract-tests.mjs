import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EMAIL_OTP_POLICY, authErrorMessage, normalizeEmailAddress, normalizeEmailOtp } from '../lib/auth/otp-policy.js';

const authPage = await readFile(new URL('../app/auth/page.js', import.meta.url), 'utf8');
const requestRoute = await readFile(new URL('../app/api/auth/verification/request/route.js', import.meta.url), 'utf8');
const verifyRoute = await readFile(new URL('../app/api/auth/verification/verify/route.js', import.meta.url), 'utf8');
const engine = await readFile(new URL('../lib/verification/server.js', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20260902061000_laneriq_owned_email_verification.sql', import.meta.url), 'utf8');
const proxy = await readFile(new URL('../lib/supabase/proxy.js', import.meta.url), 'utf8');
const authGuard = await readFile(new URL('../app/components/AuthFlowGuard.js', import.meta.url), 'utf8');

assert.equal(EMAIL_OTP_POLICY.codeLength, 8);
assert.equal(EMAIL_OTP_POLICY.resendSeconds, 60);
assert.equal(EMAIL_OTP_POLICY.maxVerifyAttemptsPerCode, 5);
assert.equal(EMAIL_OTP_POLICY.maxEmailLength, 254);
assert.equal(normalizeEmailAddress('  USER@Example.COM '), 'user@example.com');
assert.equal(normalizeEmailOtp('12 34-56x78'), '12345678');
assert.throws(() => normalizeEmailAddress('not-an-email'));
assert.throws(() => normalizeEmailAddress(`${'a'.repeat(250)}@x.com`));
assert.throws(() => normalizeEmailOtp('1234567'));
assert.doesNotMatch(authErrorMessage({ message:'postgres internal auth stack secret detail' }, 'email'), /postgres|secret|stack/i);

assert.match(authPage, /normalizeReferralCode\(searchParams\.get\("ref"\)\)/);
assert.match(authPage, /safeInternalNext\(searchParams\.get\("next"\)\)/);
assert.match(authPage, /fetch\("\/api\/auth\/verification\/request"/);
assert.match(authPage, /fetch\("\/api\/auth\/verification\/verify"/);
assert.match(authPage, /challengeId/);
assert.match(authPage, /credentials:\s*"same-origin"/);
assert.match(authPage, /cache:\s*"no-store"/);
assert.doesNotMatch(authPage, /verifyOtp\(\{ email:/);
assert.doesNotMatch(authPage, /auth\.signInWithOtp/);
assert.match(authPage, /EMAIL_OTP_POLICY\.maxVerifyAttemptsPerCode/);
assert.match(authPage, /window\.__LANERIQ_AUTH_FLOW_BUSY__\s*=\s*true/);
assert.match(authPage, /trustedUserData[\s\S]*supabase\.auth\.getUser\(\)/);
assert.match(authPage, /await fetch\("\/api\/referrals\/verify"/);
assert.match(authPage, /autoComplete="one-time-code"/);
assert.match(authPage, /router\.replace\(next\)/);
assert.match(authPage, /<b>LANERIQ<\/b>/);

assert.match(requestRoute, /requestLaneriqEmailVerification/);
assert.match(requestRoute, /otpAuthority:"laneriq"/);
assert.doesNotMatch(requestRoute, /signInWithOtp\(\{email:/);
assert.match(requestRoute, /normalizeReferralCode\(body\?\.referral\)/);
assert.match(requestRoute, /sameOrigin\(request\)/);
assert.match(requestRoute, /VERIFICATION_RATE_LIMIT/);
assert.match(requestRoute, /Cache-Control","private, no-store, max-age=0/);

assert.match(engine, /crypto\.randomInt/);
assert.match(engine, /createHmac\("sha256"/);
assert.match(engine, /LANERIQ_VERIFICATION_SECRET\|\|process\.env\.LANERIQ_COMMUNICATION_PRIVACY_SECRET/);
assert.match(engine, /EMAIL_TTL_SECONDS=600/);
assert.match(engine, /codeHash\(id,email,code\)/);
assert.match(engine, /recipientHash\(email\)/);
assert.match(engine, /laneriq_create_verification_challenge/);
assert.match(engine, /laneriq_consume_verification_challenge/);
assert.match(engine, /deliverCommunication/);
assert.match(engine, /otpAuthority:"laneriq"/);
assert.match(engine, /compatibilityBridge:"supabase_session_only"/);
assert.ok(engine.indexOf('decision!=="verified"') < engine.indexOf('mintCompatibilitySession(email'), 'Compatibility session must only be minted after LANERIQ verifies the code.');
assert.doesNotMatch(engine, /console\.(log|info|warn|error|debug)/);

assert.match(verifyRoute, /verifyLaneriqEmailVerification/);
assert.match(verifyRoute, /normalizeEmailOtp/);
assert.match(verifyRoute, /sameOrigin\(request\)/);
assert.match(verifyRoute, /VERIFICATION_LOCKED/);
assert.match(verifyRoute, /VERIFICATION_ALREADY_USED/);
assert.match(proxy, /"\/api\/auth\/verification\/verify"/);
assert.doesNotMatch(proxy, /startsWith\("\/api\/auth"\)/);

assert.match(migration, /create schema if not exists private/);
assert.match(migration, /revoke all on schema private from public, anon, authenticated/);
assert.match(migration, /create table if not exists private\.laneriq_verification_challenges/);
assert.match(migration, /recipient_hash text not null/);
assert.match(migration, /code_hash text not null/);
assert.doesNotMatch(migration, /\b(email|phone|otp|verification_code|code)\s+text\b/i);
assert.match(migration, /enable row level security/);
assert.match(migration, /revoke all on table private\.laneriq_verification_challenges from public, anon, authenticated/);
assert.match(migration, /grant all on table private\.laneriq_verification_challenges to service_role/);
assert.match(migration, /pg_advisory_xact_lock/);
assert.match(migration, /for update/);
assert.match(migration, /status = 'superseded'/);
assert.match(migration, /attempts \+ 1 >= max_attempts/);
assert.match(migration, /consumed_at = now\(\)/);
assert.match(migration, /revoke all on function public\.laneriq_consume_verification_challenge/);
assert.match(migration, /grant execute on function public\.laneriq_consume_verification_challenge/);

assert.match(authGuard, /window\.__LANERIQ_AUTH_FLOW_BUSY__ === true/);
assert.match(authGuard, /supabase\.auth\.getUser\(\)/);
assert.match(authGuard, /authListener\?\.subscription\?\.unsubscribe/);

console.log('✓ Email OTP generation and validation are owned by LANERIQ Verification, not Supabase Auth');
console.log('✓ Email challenges are HMAC-only, 10-minute, one-use, superseding and 5-attempt locked');
console.log('✓ Browser requests and verifies Email Code only through exact same-origin LANERIQ endpoints');
console.log('✓ Existing Supabase session is now a post-verification compatibility bridge only');
console.log('✓ Verification storage is private-schema, RLS protected and service-role only');
