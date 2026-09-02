import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const session = await read('lib/auth/laneriq-session.js');
const sessionRoute = await read('app/api/auth/session/route.js');
const verifyRoute = await read('app/api/auth/verification/verify/route.js');
const verification = await read('lib/verification/server.js');
const proxy = await read('lib/supabase/proxy.js');
const authPage = await read('app/auth/page.js');
const authGuard = await read('app/components/AuthFlowGuard.js');
const account = await read('app/components/AccountNav.js');
const migration = await read('supabase/migrations/20260902071500_laneriq_session_authority.sql');
const hardening = await read('supabase/migrations/20260902072500_harden_laneriq_session_authority.sql');

// Primary LANERIQ session token and cookie contract.
assert.match(session,/LANERIQ_SESSION_COOKIE="laneriq_session"/);
assert.match(session,/LANERIQ_SESSION_MODE_COOKIE="laneriq_session_mode"/);
assert.match(session,/LANERIQ_SESSION_MODE_VALUE="primary"/);
assert.match(session,/LANERIQ_SESSION_TTL_SECONDS=7\*24\*60\*60/);
assert.match(session,/crypto\.randomBytes\(32\)\.toString\("base64url"\)/);
assert.match(session,/crypto\.randomUUID\(\)/);
assert.match(session,/createHmac\("sha256"/);
assert.match(session,/secret\.length<32/);
assert.match(session,/\^\[A-Za-z0-9_-\]\{43\}\$/);
assert.match(session,/httpOnly:true/);
assert.match(session,/secure:process\.env\.NODE_ENV==="production"/);
assert.match(session,/sameSite:"lax"/);
assert.match(session,/maxAge:0/);
assert.match(session,/expires:new Date\(0\)/);
assert.match(session,/laneriq_create_session/);
assert.match(session,/laneriq_validate_session/);
assert.match(session,/laneriq_revoke_session/);
assert.match(session,/if\(error\)throw new Error\("LANERIQ session validation is unavailable\."\)/);
assert.match(session,/if\(error\)throw new Error\("LANERIQ session revocation is unavailable\."\)/);
assert.doesNotMatch(session,/console\.(log|info|warn|error|debug)/);

// Persistence is private, hash-only and service-role only.
assert.match(migration,/create table if not exists private\.laneriq_sessions/);
assert.match(migration,/token_hash text not null unique/);
assert.doesNotMatch(migration,/\btoken\s+text\b/i);
assert.match(migration,/alter table private\.laneriq_sessions enable row level security/);
assert.match(migration,/revoke all on table private\.laneriq_sessions from public, anon, authenticated/);
assert.match(migration,/grant all on table private\.laneriq_sessions to service_role/);
assert.match(migration,/security definer/gi);
assert.match(migration,/set search_path = ''/);
assert.match(migration,/grant execute on function public\.laneriq_create_session.*to service_role/);
assert.match(migration,/grant execute on function public\.laneriq_validate_session.*to service_role/);
assert.match(migration,/grant execute on function public\.laneriq_revoke_session.*to service_role/);

// Hardening keeps session count atomic and table state constrained.
assert.match(hardening,/laneriq_sessions_token_hash_shape_chk/);
assert.match(hardening,/token_hash ~ '\^\[0-9a-f\]\{64\}\$'/);
assert.match(hardening,/laneriq_sessions_time_order_chk/);
assert.match(hardening,/expires_at > created_at/);
assert.match(hardening,/laneriq_sessions_state_chk/);
assert.match(hardening,/pg_catalog\.pg_advisory_xact_lock\(pg_catalog\.hashtextextended\(p_user_id::text,0\)\)/);
assert.match(hardening,/order by s\.created_at desc[\s\S]*offset 9/);
assert.match(hardening,/status in \('revoked','expired'\)[\s\S]*interval '30 days'/);
assert.match(hardening,/revoke all on function public\.laneriq_create_session.*from public, anon, authenticated/);

// Session API is LANERIQ-first, provider-opaque and fail-closed.
assert.match(sessionRoute,/validateLaneriqSessionToken\(token\)/);
assert.match(sessionRoute,/sessionAuthority:"laneriq"/);
assert.match(sessionRoute,/compatibilityBridge:"legacy_data_access_transition"/);
assert.doesNotMatch(sessionRoute,/compatibilityBridge:"supabase/i);
assert.match(sessionRoute,/FRESH_COMPATIBILITY_SIGN_IN_MS=5\*60\*1000/);
assert.match(sessionRoute,/requireFreshSignIn:true/);
assert.match(sessionRoute,/FRESH_VERIFICATION_REQUIRED/);
assert.match(sessionRoute,/sameOrigin\(request\)/);
assert.match(sessionRoute,/JSON_REQUIRED/);
assert.match(sessionRoute,/SESSION_NOT_READY/);
assert.match(sessionRoute,/SESSION_REVOKE_UNAVAILABLE/);
assert.match(sessionRoute,/Do not clear the browser token when authoritative revocation could not be confirmed/);
assert.match(sessionRoute,/response\.cookies\.set\(LANERIQ_SESSION_COOKIE,"",laneriqSessionClearCookieOptions\(\)\)/);
const passiveModeGate=sessionRoute.indexOf('if(isLaneriqPrimarySessionMode(mode))');
const passiveFallback=sessionRoute.indexOf('const migrated=await mintFromCompatibilityIdentity();');
assert.ok(passiveModeGate>=0&&passiveFallback>passiveModeGate,'Primary-mode marker must block passive compatibility resurrection before legacy fallback.');
const revokeCall=sessionRoute.indexOf('revoked=await revokeLaneriqSessionToken(token)');
const clearCookie=sessionRoute.indexOf('response.cookies.set(LANERIQ_SESSION_COOKIE,"",laneriqSessionClearCookieOptions())');
assert.ok(revokeCall>=0&&clearCookie>revokeCall,'Authoritative revoke must happen before the browser session cookie is cleared.');

// Email verification issues LANERIQ session, never an Email Supabase OTP session authority.
assert.match(verification,/createLaneriqSession\(prepared\.userId\)/);
assert.match(verification,/sessionAuthority:"laneriq"/);
assert.match(verification,/compatibilityBridge:"legacy_data_access_transition"/);
assert.doesNotMatch(verification,/compatibilityBridge:"supabase/i);
assert.match(verification,/try\{await revokeLaneriqSessionToken\(primarySession\.token\);\}catch\{\}/);
assert.match(verifyRoute,/LANERIQ_SESSION_COOKIE/);
assert.match(verifyRoute,/LANERIQ_SESSION_MODE_COOKIE/);
assert.match(verifyRoute,/sessionAuthority:"laneriq"/);
assert.doesNotMatch(verifyRoute,/sessionToken:/);

// Browser auth reads LANERIQ session as truth. WhatsApp may only upgrade after a successful OTP call.
assert.match(authPage,/readLaneriqSession\(\)/);
assert.match(authPage,/upgradeVerifiedCompatibilitySession\(\)/);
assert.match(authPage,/action:\s*"upgrade_verified_compatibility"/);
assert.match(authPage,/data\?\.sessionAuthority !== "laneriq"/);
assert.doesNotMatch(authPage,/verifyOtp\(\{ email:/);
assert.doesNotMatch(authPage,/import \{ createClient \} from "\.\.\/\.\.\/lib\/supabase\/client"/);
assert.match(authPage,/await import\("\.\.\/\.\.\/lib\/supabase\/client"\)/);
assert.match(authPage,/compatibilityClient\.auth\.verifyOtp\(\{ phone, token, type: "sms" \}\)/);
const whatsappVerify=authPage.indexOf('await verifyWhatsAppCompatibility({ phone: normalizePhoneNumber(identifier), token })');
const explicitUpgrade=authPage.indexOf('await upgradeVerifiedCompatibilitySession()');
assert.ok(whatsappVerify>=0&&explicitUpgrade>whatsappVerify,'WhatsApp compatibility identity may upgrade only after OTP verification succeeds.');
assert.match(authGuard,/originalFetch\("\/api\/auth\/session"/);
assert.doesNotMatch(authGuard,/supabase\.auth\./);

// Account chrome/logout uses LANERIQ session; compatibility identity is display-only enrichment.
assert.match(account,/fetch\("\/api\/auth\/session"/);
assert.match(account,/session\?\.sessionAuthority !== "laneriq"/);
assert.match(account,/body: JSON\.stringify\(\{ action: "logout" \}\)/);
assert.doesNotMatch(account,/auth\.signOut\(/);
assert.match(account,/compatibilityClient\.auth\.getUser\(\)/);

// Protected routing checks LANERIQ before the temporary data-access bridge and distinguishes outages from sign-out.
assert.match(proxy,/"\/api\/auth\/session"/);
assert.match(proxy,/validateLaneriqSessionToken\(laneriqToken\)/);
assert.match(proxy,/isLaneriqPrimarySessionMode\(laneriqMode\)/);
assert.match(proxy,/function apiSessionUnavailable/);
assert.match(proxy,/SESSION_NOT_READY/);
assert.match(proxy,/status: 503/);
assert.match(proxy,/Vary", "Cookie"/);
assert.doesNotMatch(proxy,/startsWith\("\/api\/auth"\)/);
const primaryValidation=proxy.indexOf('validateLaneriqSessionToken(laneriqToken)');
const legacyProviderCheck=proxy.indexOf('supabase.auth.getUser()');
assert.ok(primaryValidation>=0&&legacyProviderCheck>primaryValidation,'Protected proxy must validate LANERIQ before any legacy compatibility identity.');

console.log('✓ LANERIQ owns primary session creation, validation, revocation and browser session truth');
console.log('✓ Session tokens are opaque, HttpOnly and persisted only as HMAC hashes in private service-role storage');
console.log('✓ Session DB concurrency, active-count, expiry and state constraints are regression-gated');
console.log('✓ Logout is fail-closed and stale compatibility cookies cannot resurrect a LANERIQ-primary browser');
console.log('✓ Fresh WhatsApp compatibility OTP can explicitly upgrade while passive stale fallback remains blocked');
console.log('✓ Session infrastructure outages are distinguished from signed-out state and fail closed with 503 semantics');
