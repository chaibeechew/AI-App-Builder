import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EMAIL_OTP_POLICY, authErrorMessage, normalizeEmailAddress, normalizeEmailOtp } from '../lib/auth/otp-policy.js';

const authPage = await readFile(new URL('../app/auth/page.js', import.meta.url), 'utf8');
const requestRoute = await readFile(new URL('../app/api/auth/verification/request/route.js', import.meta.url), 'utf8');
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
assert.match(authPage, /supabase\.auth\.getUser\(\)/);
assert.match(authPage, /fetch\("\/api\/auth\/verification\/request"/);
assert.match(authPage, /credentials:\s*"same-origin"/);
assert.match(authPage, /cache:\s*"no-store"/);
assert.doesNotMatch(authPage, /auth\.signInWithOtp/);
assert.match(authPage, /verifyOtp\(\{ email:\s*normalizeEmailAddress\(identifier\), token, type:\s*"email" \}\)/);
assert.match(authPage, /EMAIL_OTP_POLICY\.maxVerifyAttemptsPerCode/);
assert.match(authPage, /window\.__LANERIQ_AUTH_FLOW_BUSY__\s*=\s*true/);
assert.match(authPage, /trustedUserData[\s\S]*supabase\.auth\.getUser\(\)/);
assert.match(authPage, /await fetch\("\/api\/referrals\/verify"/);
assert.match(authPage, /autoComplete="one-time-code"/);
assert.match(authPage, /router\.replace\(next\)/);
const referralIndex = authPage.indexOf('await fetch("/api/referrals/verify"');
const postVerifyRedirectIndex = authPage.lastIndexOf('router.replace(next)');
assert.ok(referralIndex >= 0 && postVerifyRedirectIndex > referralIndex, 'Referral attempt must finish before OTP post-verify redirect');
assert.doesNotMatch(authPage, /return raw \|\|/);

assert.match(requestRoute, /claimLaneriqCommunication/);
assert.match(requestRoute, /purpose:"verification"/);
assert.match(requestRoute, /signInWithOtp\(\{email:identifier,options\}\)/);
assert.match(requestRoute, /shouldCreateUser:true/);
assert.match(requestRoute, /normalizeReferralCode\(body\?\.referral\)/);
assert.match(requestRoute, /sameOrigin\(request\)/);
assert.match(requestRoute, /VERIFICATION_RATE_LIMIT/);
assert.match(requestRoute, /Cache-Control","private, no-store, max-age=0/);

assert.match(authGuard, /window\.__LANERIQ_AUTH_FLOW_BUSY__ === true/);
assert.match(authGuard, /supabase\.auth\.getUser\(\)/);
assert.match(authGuard, /authListener\?\.subscription\?\.unsubscribe/);

console.log('✓ Email OTP uses bounded canonical email/code policy');
console.log('✓ Email verification requests pass through LANERIQ persistent fair-use/idempotency guard');
console.log('✓ Verification is attempt-limited and unknown provider errors are not leaked');
console.log('✓ Successful OTP is trusted with getUser before navigation');
console.log('✓ Auth guard cannot race the OTP referral completion redirect');
